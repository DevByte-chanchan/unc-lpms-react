const { CourseOfferingAssignment, ProgramCourseOffering, Course, Program, Department }
    = require('../models');

const listAssignments = async (req, res, next) => {
    try {
        const { page = 1, limit = 25, programId, courseId, stakeholder } = req.query;
        const offset = (page - 1) * limit;

        const whereAssignment = {};
        if (stakeholder) whereAssignment.stakeholder_id = stakeholder;

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
                    attributes: ['pc_offering_id', 'revision_number', 'course_description']
                }
            ],
            order: [['date_assigned', 'DESC']],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        });

        res.json({
            total: assignments.count,
            page: parseInt(page, 10),
            perPage: parseInt(limit, 10),
            data: assignments.rows
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
                        { model: Program, attributes: ['program_id', 'program_name'] },
                        { model: Department, attributes: ['dept_id', 'dept_name'] }
                    ]
                }
            ]
        });

        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        res.json(assignment);
    } catch (err) {
        next(err);
    }
};

module.exports = { listAssignments, getAssignmentById };
