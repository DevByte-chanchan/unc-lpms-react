'use strict';

const { Op } = require('sequelize');
const db = require('../models');

const {
    ProgramCourseOffering,
    CourseOfferingAssignment,
    AssignmentWorkflowLog,
    CourseOutcome,
    IntendedLearningOutcome,
    Week,
    Course
} = db;

/**
 * Computes the overall workflow status of an assignment from its logs and submission date.
 */
function computeAssignmentStatus(assignment) {
    if (!assignment) return 'Draft';
    const logs = assignment.workflowLogs || assignment.logs || [];

    const deanApproval = logs.find(
        (log) =>
            (log.action_type === 'ACCEPTED' || log.action_type === 'APPROVED') &&
            log.actor_role === 'DEAN'
    );
    if (deanApproval) return 'Approved';

    const instructorSubmissions = logs.filter((l) => l.action_type === 'SUBMITTED');
    const hasBeenSubmitted =
        assignment.date_submitted !== null ||
        instructorSubmissions.length > 0 ||
        logs.some((log) => log.action_type === 'ACCEPTED');

    if (!hasBeenSubmitted) return 'Draft';

    const sortedSubmissions = [...instructorSubmissions].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const latestSubmissionTime =
        sortedSubmissions.length > 0
            ? new Date(sortedSubmissions[0].createdAt).getTime()
            : assignment.date_submitted
              ? new Date(assignment.date_submitted).getTime()
              : 0;

    const hasActiveReturn = logs.some(
        (l) =>
            l.action_type === 'RETURNED' &&
            new Date(l.createdAt).getTime() >= latestSubmissionTime
    );
    if (hasActiveReturn) return 'Returned';

    return 'Pending';
}

/**
 * Formats an academic term label from an assignment's date_assigned.
 */
function formatTermFromDate(dateAssigned) {
    if (!dateAssigned) return 'Previous Term';
    const d = new Date(dateAssigned);
    if (isNaN(d.getTime())) return 'Previous Term';
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    // Standard academic calendar: Jan-May -> 2nd Sem of (year-1)-(year) or 2nd Sem (year)-(year+1); Jun-Dec -> 1st Sem
    const sem = month >= 6 && month <= 10 ? '1st Sem' : '2nd Sem';
    return `${sem} SY ${year}-${year + 1}`;
}

/**
 * Finds a ProgramCourseOffering by pc_offering_id and optional revision_number,
 * falling back to pc_offering_id if revision_number was recently incremented.
 */
async function findOfferingByPcIdAndRev(pcId, revNum, options = {}) {
    const { where: extraWhere = {}, ...restOptions } = options;
    let offering = null;
    if (revNum !== undefined && revNum !== null && String(revNum) !== '') {
        offering = await ProgramCourseOffering.findOne({
            where: {
                pc_offering_id: pcId,
                revision_number: revNum,
                ...extraWhere
            },
            ...restOptions
        });
    }
    if (!offering) {
        offering = await ProgramCourseOffering.findOne({
            where: {
                pc_offering_id: pcId,
                ...extraWhere
            },
            ...restOptions
        });
    }
    return offering;
}

/**
 * Marks a ProgramCourseOffering as having modifications relative to its base approved version.
 * Does NOT increment revision_number while unapproved.
 */
async function markOfferingModified(pcOfferingId, transaction = null) {
    if (!pcOfferingId) return;
    await ProgramCourseOffering.update(
        { has_modifications: true },
        {
            where: { pc_offering_id: pcOfferingId },
            ...(transaction ? { transaction } : {})
        }
    );
}

/**
 * Evaluates whether a ProgramCourseOffering has been approved by the final approver (DEAN)
 * AND has modifications relative to a previous approved version.
 * If and only if BOTH conditions hold (and it hasn't incremented yet), increments revision_number by 1.
 */
async function evaluateAndIncrementRevisionOnApproval(pcOfferingId, transaction = null) {
    const txOpts = transaction ? { transaction } : {};
    const offering = await ProgramCourseOffering.findByPk(pcOfferingId, {
        include: [
            {
                model: CourseOfferingAssignment,
                as: 'assignments',
                include: [{ model: AssignmentWorkflowLog, as: 'workflowLogs' }]
            }
        ],
        ...txOpts
    });

    if (!offering || offering.is_revision_incremented) {
        return {
            incremented: false,
            revision_number: offering ? offering.revision_number : null,
            offering
        };
    }

    const assignments = offering.assignments || [];
    const latestAssignment = [...assignments].sort(
        (a, b) => Number(b.co_assign_id) - Number(a.co_assign_id)
    )[0];

    const status = computeAssignmentStatus(latestAssignment);
    if (status !== 'Approved') {
        // Must NOT increment revision_number if not approved by the Dean
        return {
            incremented: false,
            revision_number: offering.revision_number,
            offering
        };
    }

    // Check if there is any prior approved offering for this course
    const otherOfferings = await ProgramCourseOffering.findAll({
        where: {
            course_id: offering.course_id,
            program_id: offering.program_id,
            pc_offering_id: { [Op.ne]: offering.pc_offering_id }
        },
        include: [
            {
                model: CourseOfferingAssignment,
                as: 'assignments',
                include: [{ model: AssignmentWorkflowLog, as: 'workflowLogs' }]
            }
        ],
        ...txOpts
    });

    const approvedPriorOfferings = otherOfferings.filter((other) => {
        const otherAssigns = other.assignments || [];
        const latestOther = [...otherAssigns].sort(
            (a, b) => Number(b.co_assign_id) - Number(a.co_assign_id)
        )[0];
        return computeAssignmentStatus(latestOther) === 'Approved';
    });

    if (approvedPriorOfferings.length === 0 && !offering.base_pc_offering_id) {
        // First approved version of the course; no increment needed
        return {
            incremented: false,
            revision_number: offering.revision_number,
            offering
        };
    }

    if (!offering.has_modifications) {
        return {
            incremented: false,
            revision_number: offering.revision_number,
            offering
        };
    }

    const maxPriorRev = approvedPriorOfferings.reduce(
        (max, o) => Math.max(max, Number(o.revision_number) || 0),
        Number(offering.revision_number) || 0
    );
    const nextRevisionNumber = maxPriorRev + 1;

    await offering.update(
        {
            revision_number: nextRevisionNumber,
            is_revision_incremented: true
        },
        txOpts
    );

    return {
        incremented: true,
        revision_number: nextRevisionNumber,
        offering
    };
}

/**
 * Resolves full week, CO, offering, and course lineage context for a given week_id,
 * plus any prior approved/completed offerings for the same course_id.
 */
async function resolveWeekLineageContext(weekId) {
    const numericWeekId = parseInt(weekId, 10);
    if (isNaN(numericWeekId)) return null;

    const weekRecord = await Week.findByPk(numericWeekId, {
        include: [
            {
                model: CourseOutcome,
                as: 'courseOutcome',
                include: [
                    {
                        model: ProgramCourseOffering,
                        include: [{ model: Course }]
                    },
                    {
                        model: IntendedLearningOutcome,
                        as: 'ilos'
                    }
                ]
            }
        ]
    });

    if (!weekRecord || !weekRecord.courseOutcome || !weekRecord.courseOutcome.ProgramCourseOffering) {
        return null;
    }

    const co = weekRecord.courseOutcome;
    const pco = co.ProgramCourseOffering;
    const course = pco.Course || null;

    // Fetch all COs and Weeks for the current offering to determine 1-based global week_number (1..16) and co_number (1..4)
    const allOfferingCos = await CourseOutcome.findAll({
        where: { pc_offering_id: pco.pc_offering_id },
        include: [
            { model: Week, as: 'weeks' },
            { model: IntendedLearningOutcome, as: 'ilos' }
        ],
        order: [
            ['co_id', 'ASC'],
            [{ model: Week, as: 'weeks' }, 'week_id', 'ASC'],
            [{ model: IntendedLearningOutcome, as: 'ilos' }, 'ilo_id', 'ASC']
        ]
    });

    let coNumber = 1;
    let globalWeekCounter = 0;
    let targetGlobalWeekNumber = 1;
    const allCurrentOfferingWeekIds = [];
    const orderedCurrentWeeks = [];

    allOfferingCos.forEach((coItem, cIdx) => {
        if (Number(coItem.co_id) === Number(co.co_id)) {
            coNumber = cIdx + 1;
        }
        const sortedWeeks = [...(coItem.weeks || [])].sort((a, b) => Number(a.week_id) - Number(b.week_id));
        sortedWeeks.forEach((w) => {
            globalWeekCounter += 1;
            allCurrentOfferingWeekIds.push(Number(w.week_id));
            orderedCurrentWeeks.push({
                week_id: Number(w.week_id),
                co_id: Number(coItem.co_id),
                co_number: cIdx + 1,
                week_number: globalWeekCounter,
                hours: Number(w.hours) || 3
            });
            if (Number(w.week_id) === numericWeekId) {
                targetGlobalWeekNumber = globalWeekCounter;
            }
        });
    });

    // Fetch all OTHER ProgramCourseOfferings for the same course_id
    const otherOfferings = await ProgramCourseOffering.findAll({
        where: {
            course_id: pco.course_id,
            pc_offering_id: { [Op.ne]: pco.pc_offering_id }
        },
        include: [
            {
                model: CourseOfferingAssignment,
                as: 'assignments',
                include: [{ model: AssignmentWorkflowLog, as: 'workflowLogs' }]
            },
            {
                model: CourseOutcome,
                include: [
                    { model: Week, as: 'weeks' },
                    { model: IntendedLearningOutcome, as: 'ilos' }
                ]
            }
        ],
        order: [
            ['revision_number', 'DESC'],
            ['pc_offering_id', 'DESC']
        ]
    });

    const priorOfferings = otherOfferings.map((other) => {
        const assigns = other.assignments || [];
        const latestAssign = [...assigns].sort((a, b) => Number(b.co_assign_id) - Number(a.co_assign_id))[0];
        const status = computeAssignmentStatus(latestAssign);
        const termLabel = formatTermFromDate(latestAssign?.date_assigned);

        const sortedCos = [...(other.CourseOutcomes || [])].sort((a, b) => Number(a.co_id) - Number(b.co_id));
        let wkCounter = 0;
        const weeksWithNumbers = [];
        sortedCos.forEach((otherCo, cIdx) => {
            const sortedWks = [...(otherCo.weeks || [])].sort((a, b) => Number(a.week_id) - Number(b.week_id));
            sortedWks.forEach((w) => {
                wkCounter += 1;
                weeksWithNumbers.push({
                    week_id: Number(w.week_id),
                    co_id: Number(otherCo.co_id),
                    co_number: cIdx + 1,
                    week_number: wkCounter,
                    hours: Number(w.hours) || 3
                });
            });
        });

        return {
            pc_offering_id: Number(other.pc_offering_id),
            revision_number: Number(other.revision_number) || 1,
            status,
            termLabel,
            date_assigned: latestAssign?.date_assigned || null,
            weeks: weeksWithNumbers,
            courseOutcomes: sortedCos
        };
    });

    // Prefer Approved prior offerings first, then any historical offering with content
    const sortedPriorOfferings = [...priorOfferings].sort((a, b) => {
        const aApproved = a.status === 'Approved' ? 1 : 0;
        const bApproved = b.status === 'Approved' ? 1 : 0;
        if (bApproved !== aApproved) return bApproved - aApproved;
        if (b.revision_number !== a.revision_number) return b.revision_number - a.revision_number;
        return b.pc_offering_id - a.pc_offering_id;
    });

    const baseOffering = pco.base_pc_offering_id
        ? sortedPriorOfferings.find(o => Number(o.pc_offering_id) === Number(pco.base_pc_offering_id)) || sortedPriorOfferings[0] || null
        : sortedPriorOfferings[0] || null;

    return {
        weekId: numericWeekId,
        weekNumber: targetGlobalWeekNumber,
        weeklyHours: Number(weekRecord.hours) || 3,
        isOrientation: targetGlobalWeekNumber === 1,
        coId: Number(co.co_id),
        coNumber,
        coDescription: co.co_description || '',
        pcOfferingId: Number(pco.pc_offering_id),
        revisionNumber: Number(pco.revision_number) || 1,
        basePcOfferingId: pco.base_pc_offering_id ? Number(pco.base_pc_offering_id) : null,
        courseId: Number(pco.course_id),
        courseCode: course?.course_no || '',
        courseTitle: course?.course_title || '',
        courseDescription: pco.course_description || '',
        contactHours: course?.contact_hrs || '',
        credit: course?.credit || '',
        allOfferingCos,
        allCurrentOfferingWeekIds,
        orderedCurrentWeeks,
        priorOfferings: sortedPriorOfferings,
        previousOfferings: sortedPriorOfferings,
        baseOffering
    };
}

module.exports = {
    computeAssignmentStatus,
    formatTermFromDate,
    findOfferingByPcIdAndRev,
    markOfferingModified,
    evaluateAndIncrementRevisionOnApproval,
    resolveWeekLineageContext
};
