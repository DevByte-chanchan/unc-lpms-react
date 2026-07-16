const { CourseOfferingAssignment, ProgramCourseOffering, Course, Program, Department, AssignmentWorkflowLog } = require('../models');
const { Op } = require('sequelize');

const listAssignments = async (req, res, next) => {
    try {
        const { page = 1, limit = 25, programId, courseId, stakeholder, year, semester } = req.query;
        const offset = (page - 1) * limit;

        const whereAssignment = {};
        if (stakeholder) whereAssignment.stakeholder_id = stakeholder;

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
                        { model: Program, attributes: ['program_id', 'name'] },
                        { model: Department, attributes: ['dept_id', 'name'] }
                    ],
                    attributes: ['pc_offering_id', 'revision_number', 'course_description', 'course_id', 'program_id', 'dept_id']
                },
                {
                    model: AssignmentWorkflowLog,
                    as: 'workflowLogs', // Uses correct DB alias
                    attributes: ['actor_role', 'action_type', 'createdAt']
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

module.exports = { listAssignments, getAssignmentById };