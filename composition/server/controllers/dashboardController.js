'use strict';

const { Op } = require('sequelize');
const {
    AcademicPeriod,
    CourseOfferingAssignment,
    ProgramCourseOffering,
    Course,
    Program,
    Department,
    AssignmentWorkflowLog,
} = require('../models');

// Chronological ranker for periods
const semRank = (s) => {
    const v = String(s || '').trim().toLowerCase();
    if (v === 'summer' || v === '3') return 3;
    if (v === '2' || v === '2nd' || v === 'second') return 2;
    if (v === '1' || v === '1st' || v === 'first') return 1;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const rankPeriod = (p) => {
    if (!p) return 0;
    const m = String(p.school_year || '').match(/(\d{4})/);
    const startY = m ? Number(m[1]) : 0;
    return startY * 1000 + semRank(p.semester);
};

// Auto-close expired active terms
async function autoCloseExpired() {
    const today = new Date().toISOString().slice(0, 10);
    try {
        await AcademicPeriod.update(
            { status: 'Closed', closed_at: new Date(), is_active: false },
            { where: { status: 'Active', end_date: { [Op.lt]: today, [Op.ne]: null } } }
        );
    } catch (err) {
        console.warn('[dashboard] auto-close pass failed:', err.message);
    }
}

// Compute overall status for a course offering assignment matching CoursesTable.jsx
function computeOverallStatus(row) {
    const logs = row.logs || row.workflowLogs || [];
    const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;

    // 1. Is it Approved? Check if Dean accepted
    const deanApproval = logs.find(
        (log) =>
            (log.action_type === 'ACCEPTED' || log.action_type === 'APPROVED') &&
            log.actor_role === 'DEAN'
    );
    if (deanApproval) {
        return 'Approved';
    }

    // 2. If not approved, is it currently Returned?
    if (latestLog && latestLog.action_type === 'RETURNED') {
        return 'Returned';
    }

    // 3. If neither Approved nor Returned, is it currently Pending?
    const hasBeenSubmitted =
        row.date_submitted !== null ||
        logs.some((log) => log.action_type === 'SUBMITTED' || log.action_type === 'ACCEPTED');

    if (hasBeenSubmitted) {
        return 'Pending';
    }

    return 'Draft';
}

/**
 * GET /api/dashboard/summary
 * Returns the latest academic period and the logged-in instructor's
 * assigned learning plans for that latest period, strictly following
 * assignmentController.js logic and matching academic term.
 */
async function getDashboardSummary(req, res, next) {
    try {
        await autoCloseExpired();

        // 1. Get all periods to determine the current / latest active term
        const allPeriods = await AcademicPeriod.findAll({
            order: [['sort_order', 'DESC'], ['createdAt', 'DESC']],
        });

        let currentTerm = null;
        if (allPeriods.length > 0) {
            const actives = allPeriods.filter((p) => p.status === 'Active');
            if (actives.length > 0) {
                currentTerm = actives.reduce(
                    (best, p) => (rankPeriod(p) > rankPeriod(best) ? p : best),
                    actives[0]
                );
            } else {
                currentTerm = allPeriods.reduce(
                    (best, p) => (rankPeriod(p) > rankPeriod(best) ? p : best),
                    allPeriods[0]
                );
            }
        }

        // 2. Determine stakeholder (instructor)
        const effectiveStakeholder =
            req.query.stakeholder || (req.user?.id ? String(req.user.id) : '1');

        const whereAssignment = {};
        if (effectiveStakeholder) {
            whereAssignment.stakeholder_id = String(effectiveStakeholder);
        }

        // 3. Academic Term Filtering Logic matching assignmentController.js
        const year =
            req.query.year ||
            (currentTerm?.school_year
                ? parseInt(String(currentTerm.school_year).slice(0, 4), 10)
                : new Date().getFullYear());
        const rawSem = req.query.semester || currentTerm?.semester || '1';
        const semester =
            String(rawSem).includes('2') || rawSem === '2nd Sem' ? '2nd Sem' : '1st Sem';

        const startYear = parseInt(year, 10);
        let startDate, endDate;

        if (semester === '1st Sem') {
            // First Semester: June 01 to Nov 25 of the given year (matches assignmentController.js)
            startDate = new Date(`${startYear}-06-01T00:00:00.000Z`);
            endDate = new Date(`${startYear}-11-25T23:59:59.999Z`);
        } else if (semester === '2nd Sem') {
            // Second Semester: Dec 09 of given year to April 27 of NEXT calendar year
            startDate = new Date(`${startYear}-12-09T00:00:00.000Z`);
            endDate = new Date(`${startYear + 1}-04-27T23:59:59.999Z`);
        }

        if (startDate && endDate) {
            whereAssignment.date_assigned = {
                [Op.between]: [startDate, endDate],
            };
        }

        // Filter Course.term matching the current academic period
        const whereCourse = {};
        if (currentTerm?.school_year) {
            whereCourse.term = {
                [Op.like]: `%${currentTerm.school_year}%`,
            };
        }

        // 4. Query assignments identically to assignmentController.js listAssignments
        const assignments = await CourseOfferingAssignment.findAndCountAll({
            where: whereAssignment,
            include: [
                {
                    model: ProgramCourseOffering,
                    required: true,
                    include: [
                        {
                            model: Course,
                            attributes: ['course_id', 'course_no', 'course_title', 'term'],
                            where: Object.keys(whereCourse).length > 0 ? whereCourse : undefined,
                            required: true,
                        },
                        { model: Program, attributes: ['program_id', 'name'] },
                        { model: Department, attributes: ['dept_id', 'name'] },
                    ],
                    attributes: [
                        'pc_offering_id',
                        'revision_number',
                        'course_description',
                        'course_id',
                        'program_id',
                        'dept_id',
                    ],
                },
                {
                    model: AssignmentWorkflowLog,
                    as: 'workflowLogs',
                    attributes: ['stakeholder_id', 'actor_role', 'action_type', 'createdAt'],
                },
            ],
            distinct: true,
            order: [['date_assigned', 'DESC']],
        });

        // 5. Deduplicate by pc_offering_id so duplicates never inflate counts
        const seenOfferings = new Set();
        const uniqueAssignments = [];
        for (const a of assignments.rows) {
            const pcoId = a.pc_offering_id || a.ProgramCourseOffering?.pc_offering_id;
            if (pcoId && !seenOfferings.has(pcoId)) {
                seenOfferings.add(pcoId);
                uniqueAssignments.push(a);
            }
        }

        // 6. Format assignments and compute overall status
        const counts = { total: uniqueAssignments.length, draft: 0, pending: 0, returned: 0, approved: 0 };

        const formatted = uniqueAssignments.map((a) => {
            const data = a.toJSON();
            data.logs = data.workflowLogs || [];

            const logs = data.logs;
            const deanApprovalLog = logs.find(
                (log) =>
                    (log.action_type === 'ACCEPTED' || log.action_type === 'APPROVED') &&
                    log.actor_role === 'DEAN'
            );
            data.date_approved = deanApprovalLog ? deanApprovalLog.createdAt : null;

            const overall = computeOverallStatus(data);
            data.overallStatus = overall;

            const lower = overall.toLowerCase();
            if (counts[lower] !== undefined) {
                counts[lower] += 1;
            }

            return data;
        });

        res.json({
            currentTerm,
            counts,
            assignments: formatted,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/dashboard/periods
 * Returns all academic periods sorted chronologically.
 */
async function getAcademicPeriodsList(req, res, next) {
    try {
        await autoCloseExpired();
        const periods = await AcademicPeriod.findAll({
            order: [['sort_order', 'DESC'], ['createdAt', 'DESC']],
        });
        res.json(periods);
    } catch (err) {
        next(err);
    }
}

async function listAcademicPeriods(req, res, next) {
    return getAcademicPeriodsList(req, res, next);
}

async function getCurrentAcademicPeriod(req, res, next) {
    try {
        await autoCloseExpired();
        const active = await AcademicPeriod.findOne({ where: { status: 'Active' } });
        res.json(active);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getDashboardSummary,
    getAcademicPeriodsList,
    listAcademicPeriods,
    getCurrentAcademicPeriod,
};
