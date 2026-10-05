const { sequelize, CourseOfferingAssignment, ProgramCourseOffering, Course, Program, Department, AssignmentWorkflowLog } = require('../models');
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

        // --- Academic Term Filtering Logic ---
        if (year && semester) {
            const startYear = parseInt(year, 10);
            let startDate, endDate;

            if (semester === '1st Sem') {
                // First Semester: July 20 to Nov 25 of the given year
                startDate = new Date(`${startYear}-06-01T00:00:00.000Z`);
                endDate = new Date(`${startYear}-11-25T23:59:59.999Z`);
            } else if (semester === '2nd Sem') {
                // Second Semester: Dec 9 of the given year to April 27 of the NEXT calendar year
                startDate = new Date(`${startYear}-12-09T00:00:00.000Z`);
                endDate = new Date(`${startYear + 1}-04-27T23:59:59.999Z`);
            }

            if (startDate && endDate) {
                // Filter by date_assigned falling within the academic term
                whereAssignment.date_assigned = {
                    [Op.between]: [startDate, endDate]
                };
            }
        }
        // ------------------------------------

        const whereOffering = {};
        if (programId) whereOffering.program_id = programId;
        if (courseId) whereOffering.course_id = courseId;

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
                    attributes: ['pc_offering_id', 'revision_number', 'course_description', 'course_id', 'program_id', 'dept_id']
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
        const formattedData = assignments.rows.map(assignment => {
            const data = assignment.toJSON();

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
        });

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
        const assignmentId = req.courseAccess?.co_assign_id;
        if (!assignmentId) {
            return res.json({ co_assign_id: null, pc_offering_id: req.courseAccess?.pc_offering_id ?? null, logs: [] });
        }
        const logs = await AssignmentWorkflowLog.findAll({
            where: { co_assign_id: assignmentId },
            attributes: ['actor_role', 'actor_name', 'action_type', 'createdAt'],
            order: [['createdAt', 'ASC'], ['log_id', 'ASC']],
            raw: true
        });
        return res.json({ co_assign_id: assignmentId, pc_offering_id: req.courseAccess.pc_offering_id, logs });
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
 * Body: { actor_role, action_type, pcId } — workflow mutations require the
 * exact offering id so duplicate course codes cannot select another program.
 */
const recordWorkflowAction = async (req, res, next) => {
    try {
        const { actor_role, action_type, pcId } = req.body || {};
        const VALID_ACTIONS = ['SUBMITTED', 'RETURNED', 'ACCEPTED'];
        const VALID_ROLES = ['INSTRUCTOR', 'LIBRARY_DIRECTOR', 'PROGRAM_HEAD', 'DEAN'];
        const authenticatedActor = WORKFLOW_ROLE_BY_ACCOUNT[req.user?.role];

        if (!authenticatedActor || actor_role !== authenticatedActor) {
            return res.status(403).json({ error: 'Your account cannot perform this workflow action.' });
        }
        const instructorAction = action_type === 'SUBMITTED' && authenticatedActor === 'INSTRUCTOR';
        const reviewerAction = ['RETURNED', 'ACCEPTED'].includes(action_type) && authenticatedActor !== 'INSTRUCTOR';
        if (!instructorAction && !reviewerAction) {
            return res.status(403).json({ error: 'Your account cannot perform this workflow action.' });
        }

        if (!VALID_ACTIONS.includes(action_type)) {
            return res.status(400).json({ error: `action_type must be one of: ${VALID_ACTIONS.join(', ')}` });
        }
        if (!VALID_ROLES.includes(actor_role)) {
            return res.status(400).json({ error: `actor_role must be one of: ${VALID_ROLES.join(', ')}` });
        }
        const offeringId = Number(pcId);
        if (!Number.isSafeInteger(offeringId) || offeringId <= 0) {
            return res.status(400).json({ error: 'Provide a valid pcId to identify the course assignment.' });
        }

        return await withWorkflowLock(offeringId, async () => {
            let log;
            try {
                const transactionOptions = sequelize.getDialect() === 'sqlite'
                    ? { type: Transaction.TYPES.IMMEDIATE }
                    : {};
                log = await sequelize.transaction(transactionOptions, async transaction => {
                const assignment = await CourseOfferingAssignment.findOne({
                    where: { pc_offering_id: offeringId },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (!assignment) {
                    const notFound = new Error('No course assignment found for this course.');
                    notFound.statusCode = 404;
                    throw notFound;
                }
                const accessRows = await loadAssignmentCourseRows(assignment.co_assign_id, transaction);
                if (!canAccessCourseRows(req.user, accessRows)) {
                    const forbidden = new Error('You do not have access to this course.');
                    forbidden.statusCode = 403;
                    throw forbidden;
                }
                const history = await AssignmentWorkflowLog.findAll({
                    where: { co_assign_id: assignment.co_assign_id },
                    order: [['log_id', 'ASC']],
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                const transition = validateWorkflowTransition(history, actor_role, action_type);
                if (!transition.allowed) {
                    const conflict = new Error(transition.error || 'This workflow action is not allowed right now.');
                    conflict.statusCode = 409;
                    throw conflict;
                }
                return AssignmentWorkflowLog.create({
                    co_assign_id: assignment.co_assign_id,
                    actor_role,
                    actor_name: String(req.user?.name || '').slice(0, 100) || null,
                    action_type
                }, { transaction });
                });
            } catch (error) {
                if ([403, 404, 409].includes(error?.statusCode)) {
                    return res.status(error.statusCode).json({ error: error.message });
                }
                throw error;
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
