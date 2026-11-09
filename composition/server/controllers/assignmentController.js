const { sequelize, CourseOfferingAssignment, ProgramCourseOffering, Course, Program, Department, AssignmentWorkflowLog, CourseConsultant } = require('../models');
const { effectiveLogs } = require('../utils/effectiveLogs');
const { assignRevisionOnApproval } = require('../services/offeringService');
const { onWorkflowAction: notifyWorkflowAction } = require('../utils/notificationEvents');
const { freezeReviewRecord } = require('../utils/reviewRecordInputs');
const { Op, Transaction } = require('sequelize');
const { REQUIRED_REVIEWERS, validateWorkflowTransition } = require('../utils/workflowRules');
const {
    canAccessCourseRows,
    loadAssignmentCourseRows
} = require('../middleware/courseAuthorization');

const WORKFLOW_ROLE_BY_ACCOUNT = {
    instructor: 'INSTRUCTOR',
    'director-of-libraries': 'LIBRARY_DIRECTOR',
    'program-head': 'PROGRAM_HEAD',
    dean: 'DEAN'
};

// The Industry Consultant is not in the chain (read and comment only), so they have no
// workflow role here and cannot record an action. See utils/workflowRules.js.
const PARALLEL_REVIEW_ROLES = new Set(REQUIRED_REVIEWERS);

// SQLite does not provide row-level SELECT FOR UPDATE locks. Serialize each
// assignment inside this process as well as using BEGIN IMMEDIATE below, so
// simultaneous decisions cannot both validate against the same history.
const workflowLocks = new Map();
const withWorkflowLock = async (assignmentKey, task) => {
    const key = String(assignmentKey);
    const previous = workflowLocks.get(key) || Promise.resolve();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const tail = previous.catch(() => {}).then(() => gate);
    workflowLocks.set(key, tail);
    await previous.catch(() => {});
    try {
        return await task();
    } finally {
        release();
        if (workflowLocks.get(key) === tail) workflowLocks.delete(key);
    }
};

const listAssignments = async (req, res, next) => {
    try {
        const { page = 1, limit = 25, programId, courseId, stakeholder, year, semester } = req.query;
        const offset = (page - 1) * limit;

        const whereAssignment = {};
        const userId = req.user?.id;
        if (req.user?.role === 'instructor') {
            whereAssignment.stakeholder_id = String(userId);
        } else if (stakeholder) {
            whereAssignment.stakeholder_id = stakeholder;
        }

        // --- Academic term ---
        // A plan belongs to the school year and semester written on its offering, not to the day it was assigned (a
        // plan for next year is often assigned this year). Only an offering with no school year falls back to the
        // assignment date.
        let termOfferingIds = null;
        if (year && semester) {
            const startYear = parseInt(year, 10);
            const SEMESTER_OF = { '1st Sem': '1st', '2nd Sem': '2nd', Summer: 'Summer' };
            const termSemester = SEMESTER_OF[semester];
            if (Number.isSafeInteger(startYear) && termSemester) {
                const RANGES = {
                    '1st': [`${startYear}-06-01T00:00:00.000Z`, `${startYear}-11-25T23:59:59.999Z`],
                    '2nd': [`${startYear}-12-09T00:00:00.000Z`, `${startYear + 1}-04-27T23:59:59.999Z`],
                    Summer: [`${startYear + 1}-04-28T00:00:00.000Z`, `${startYear + 1}-05-31T23:59:59.999Z`]
                };
                const [from, to] = RANGES[termSemester];
                const rows = await sequelize.query(
                    `SELECT DISTINCT pco.pc_offering_id AS id
                     FROM ProgramCourseOfferings pco
                         LEFT JOIN CourseOfferingAssignments coa ON coa.pc_offering_id = pco.pc_offering_id
                     WHERE (pco.school_year = ? AND pco.semester = ?)
                        OR (pco.school_year IS NULL AND coa.date_assigned BETWEEN ? AND ?);`,
                    { replacements: [`${startYear}-${startYear + 1}`, termSemester, new Date(from), new Date(to)], type: sequelize.QueryTypes.SELECT });
                termOfferingIds = rows.map(row => row.id);
            }
        }


        const whereOffering = {};
        if (termOfferingIds) whereOffering.pc_offering_id = { [Op.in]: termOfferingIds.length ? termOfferingIds : [0] };
        if (programId) whereOffering.program_id = programId;
        if (courseId) whereOffering.course_id = courseId;
        if (req.user?.role === 'industry-consultant') {
            const assigned = (await CourseConsultant.findAll({
                where: { consultant_user_id: userId, is_active: true }, attributes: ['course_id'], raw: true
            })).map(row => row.course_id);
            whereOffering.course_id = courseId
                ? (assigned.includes(Number(courseId)) ? Number(courseId) : 0)
                : { [Op.in]: assigned.length ? assigned : [0] };
        }

        // The VPAA lists approved plans only: approved, or the carry-over of an approved plan.
        if (req.user?.role === 'vpaa') {
            whereOffering[Op.or] = [{ approved_at: { [Op.ne]: null } }, { carried_from_offering_id: { [Op.ne]: null } }];
        }

        const assignments = await CourseOfferingAssignment.findAndCountAll({
            where: whereAssignment,
            include: [
                {
                    model: ProgramCourseOffering,
                    where: whereOffering,
                    include: [
                        { model: Course, attributes: ['course_id', 'course_no', 'course_title'] },
                        {
                            model: Program,
                            attributes: ['program_id', 'name'],
                            ...(req.user?.role === 'program-head'
                                ? { where: { stakeholder_id: userId }, required: true }
                                : {})
                        },
                        {
                            model: Department,
                            attributes: ['dept_id', 'name'],
                            ...(req.user?.role === 'dean'
                                ? { where: { stakeholder_id: userId }, required: true }
                                : {})
                        }
                    ],
                    attributes: ['pc_offering_id', 'revision_number', 'course_description', 'course_id', 'program_id', 'dept_id',
                        'school_year', 'semester', 'base_offering_id', 'carried_from_offering_id', 'approved_at']
                },
                {
                    model: AssignmentWorkflowLog,
                    as: 'workflowLogs', // Uses correct DB alias
                    attributes: ['actor_role', 'actor_name', 'action_type', 'createdAt']
                }
            ],
            distinct: true,
            order: [['date_assigned', 'DESC']],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        });

        // Map and format payload properties
        const formattedData = await Promise.all(assignments.rows.map(async assignment => {
            const data = assignment.toJSON();

            // A carried-over offering is the same approved syllabus: its history is its source's.
            if (data.ProgramCourseOffering?.carried_from_offering_id) {
                data.workflowLogs = await effectiveLogs(sequelize, data.co_assign_id);
            }

            // 1. Restore the legacy 'logs' array property for frontend compatibility
            data.logs = data.workflowLogs;

            // 2. Dynamically extract the date_approved timestamp if the Dean has signed off
            const logs = data.workflowLogs || [];
            const deanApprovalLog = logs.find(log =>
                (log.action_type === 'ACCEPTED' || log.action_type === 'APPROVED') &&
                log.actor_role === 'DEAN'
            );

            data.date_approved = deanApprovalLog ? deanApprovalLog.createdAt : null;

            return data;
        }));

        res.json({
            total: assignments.count,
            page: parseInt(page, 10),
            perPage: parseInt(limit, 10),
            data: formattedData
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/assignments/offering/:pcId — the workflow log of one offering's assignment.
// The approval screens derive a plan's stage and who may act from this, and from nothing else.
const getWorkflowByOffering = async (req, res, next) => {
    try {
        const access = req.courseAccess || {};
        // Which plan this is (course code and revision), for reviewers whose sections leave out Course Details:
        // the page checks it matches the address before anyone can act on it.
        const course = access.course_id ? await Course.findByPk(access.course_id, { attributes: ['course_no'] }) : null;
        const plan = { code: course?.course_no ?? null, revision: access.revision_number > 0 ? access.revision_number : null };
        const assignmentId = access.co_assign_id;
        if (!assignmentId) {
            return res.json({ co_assign_id: null, pc_offering_id: access.pc_offering_id ?? null, logs: [], plan });
        }
        const logs = (await effectiveLogs(sequelize, assignmentId))
            .map(({ actor_role, actor_name, action_type, note, createdAt }) => ({ actor_role, actor_name, action_type, note: note || null, createdAt }));
        return res.json({ co_assign_id: assignmentId, pc_offering_id: access.pc_offering_id, logs, plan });
    } catch (err) {
        return next(err);
    }
};

const getAssignmentById = async (req, res, next) => {
    try {
        const id = req.params.id;
        const assignment = await CourseOfferingAssignment.findOne({
            where: { co_assign_id: id },
            include: [
                {
                    model: ProgramCourseOffering,
                    include: [
                        { model: Course, attributes: ['course_id', 'course_no', 'course_title'] },
                        { model: Program, attributes: ['program_id', 'name'] },
                        { model: Department, attributes: ['dept_id', 'name'] }
                    ]
                },
                {
                    model: AssignmentWorkflowLog,
                    as: 'workflowLogs'
                }
            ]
        });

        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        const accessRows = await loadAssignmentCourseRows(assignment.co_assign_id);
        if (!canAccessCourseRows(req.user, accessRows)) {
            return res.status(403).json({ error: 'You do not have access to this course.' });
        }

        const data = assignment.toJSON();
        if (data.ProgramCourseOffering?.carried_from_offering_id) {
            data.workflowLogs = await effectiveLogs(sequelize, data.co_assign_id);
        }

        // 1. Restore the legacy 'logs' array property for frontend compatibility
        data.logs = data.workflowLogs;

        // 2. Dynamically extract the date_approved timestamp if the Dean has signed off
        const logs = data.workflowLogs || [];
        const deanApprovalLog = logs.find(log =>
            (log.action_type === 'ACCEPTED' || log.action_type === 'APPROVED') &&
            log.actor_role === 'DEAN'
        );

        data.date_approved = deanApprovalLog ? deanApprovalLog.createdAt : null;

        res.json(data);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/assignments/action
 * Module 2 integration: records a workflow action (submit / return / approve)
 * as an AssignmentWorkflowLog row so course-table statuses reflect real state.
 * Body: { actor_role, action_type, pcId, note? } — note is required when the Program Head sends a Dean
 * return back to the Dean (COUNTERED). Workflow mutations require the
 * exact offering id so duplicate course codes cannot select another program.
 */
const recordWorkflowAction = async (req, res, next) => {
    try {
        const { actor_role, action_type, pcId } = req.body || {};
        const VALID_ACTIONS = ['SUBMITTED', 'RETURNED', 'ACCEPTED', 'FORWARDED', 'COUNTERED'];
        const VALID_ROLES = ['INSTRUCTOR', 'LIBRARY_DIRECTOR', 'PROGRAM_HEAD', 'DEAN'];
        const authenticatedActor = WORKFLOW_ROLE_BY_ACCOUNT[req.user?.role];

        if (!authenticatedActor || actor_role !== authenticatedActor) {
            return res.status(403).json({ error: 'Your account cannot perform this workflow action.' });
        }
        const instructorAction = action_type === 'SUBMITTED' && authenticatedActor === 'INSTRUCTOR';
        const reviewerAction = ['RETURNED', 'ACCEPTED'].includes(action_type) && authenticatedActor !== 'INSTRUCTOR';
        // Forwarding a Dean return to the instructor, or countering it back to the Dean, is the Program Head's alone.
        const headAction = ['FORWARDED', 'COUNTERED'].includes(action_type) && authenticatedActor === 'PROGRAM_HEAD';
        if (!instructorAction && !reviewerAction && !headAction) {
            return res.status(403).json({ error: 'Your account cannot perform this workflow action.' });
        }

        if (!VALID_ACTIONS.includes(action_type)) {
            return res.status(400).json({ error: `action_type must be one of: ${VALID_ACTIONS.join(', ')}` });
        }
        if (!VALID_ROLES.includes(actor_role)) {
            return res.status(400).json({ error: `actor_role must be one of: ${VALID_ROLES.join(', ')}` });
        }
        // The Dean is told why their return came back, so the reason is required.
        const note = String(req.body?.note ?? '').trim();
        if (action_type === 'COUNTERED' && note.length < 5) {
            return res.status(400).json({ error: 'Say why the plan goes back to the Dean (at least a few words).' });
        }
        if (note.length > 1000) return res.status(400).json({ error: 'The note is longer than 1,000 characters.' });
        const offeringId = Number(pcId);
        if (!Number.isSafeInteger(offeringId) || offeringId <= 0) {
            return res.status(400).json({ error: 'Provide a valid pcId to identify the course assignment.' });
        }

        return await withWorkflowLock(offeringId, async () => {
            // Every refusal is decided BEFORE the transaction opens. The server shares one SQLite connection, so a
            // rollback also undoes any other request's write made while the transaction was open: refusing a
            // double-click by throwing inside the transaction used to discard someone else's edit.
            // ponytail: the in-process lock above is what keeps the history unchanged until the insert; a second
            // server process recording workflow actions would need the check repeated inside the transaction.
            const assignment = await CourseOfferingAssignment.findOne({ where: { pc_offering_id: offeringId } });
            if (!assignment) return res.status(404).json({ error: 'No course assignment found for this course.' });
            const accessRows = await loadAssignmentCourseRows(assignment.co_assign_id);
            if (!canAccessCourseRows(req.user, accessRows)) {
                return res.status(403).json({ error: 'You do not have access to this course.' });
            }
            const history = await effectiveLogs(sequelize, assignment.co_assign_id);
            const transition = validateWorkflowTransition(history, actor_role, action_type);
            if (!transition.allowed) {
                return res.status(409).json({ error: transition.error || 'This workflow action is not allowed right now.' });
            }

            const transactionOptions = sequelize.getDialect() === 'sqlite'
                ? { type: Transaction.TYPES.IMMEDIATE }
                : {};
            const log = await sequelize.transaction(transactionOptions, async transaction => {
                const created = await AssignmentWorkflowLog.create({
                    co_assign_id: assignment.co_assign_id,
                    actor_role,
                    actor_name: String(req.user?.name || '').slice(0, 100) || null,
                    actor_user_id: req.user?.id ?? null,
                    action_type,
                    note: action_type === 'COUNTERED' ? note : null
                }, { transaction });
                // The revision number is assigned only now, when the Dean accepts.
                if (actor_role === 'DEAN' && action_type === 'ACCEPTED') {
                    await assignRevisionOnApproval(offeringId, new Date(), transaction);
                }
                return created;
            });

            // Tell whoever acts next. Never fails the action (see utils/notificationEvents.js).
            await notifyWorkflowAction({
                offeringId, actorUserId: req.user?.id, actorRole: actor_role, action: action_type, assignmentId: log.co_assign_id
            });

            // The Dean's approval fixes the review record: keep a copy of what it is built from. Never fails the action.
            if (actor_role === 'DEAN' && action_type === 'ACCEPTED') {
                try { await freezeReviewRecord(offeringId); } catch (error) { console.error(`Review record not frozen, the approval stands: ${error.message}`); }
            }

            return res.status(201).json({
                log: {
                    log_id: log.log_id,
                    co_assign_id: log.co_assign_id,
                    actor_role: log.actor_role,
                    action_type: log.action_type,
                    createdAt: log.createdAt
                }
            });
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listAssignments,
    getAssignmentById,
    getWorkflowByOffering,
    recordWorkflowAction,
    _internals: { validateWorkflowTransition, withWorkflowLock, PARALLEL_REVIEW_ROLES }
};
