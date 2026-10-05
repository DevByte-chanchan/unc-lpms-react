'use strict';

const { CourseConsultant, Course, User } = require('../models');

const asInt = (value) => (Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null);

// GET /api/course-consultants?courseId= — Program Head / Dean list assignments; a consultant sees their own.
async function listAssignments(req, res, next) {
    try {
        const where = {};
        if (req.query.courseId) where.course_id = asInt(req.query.courseId);
        if (req.user.role === 'industry-consultant') where.consultant_user_id = req.user.id;
        const rows = await CourseConsultant.findAll({ where, order: [['course_consultant_id', 'ASC']], raw: true });
        const names = new Map((await User.findAll({ attributes: ['user_id', 'name'], raw: true })).map(u => [u.user_id, u.name]));
        return res.json(rows.map(row => ({ ...row, consultant_name: names.get(row.consultant_user_id) || null })));
    } catch (err) {
        return next(err);
    }
}

// POST /api/course-consultants — the Program Head assigns a consultant to a course.
// Assigning someone who was deactivated reactivates the same record.
async function assignConsultant(req, res, next) {
    try {
        const courseId = asInt(req.body?.course_id);
        const consultantId = asInt(req.body?.consultant_user_id);
        if (!courseId || !consultantId) return res.status(400).json({ message: 'course_id and consultant_user_id are required.' });

        if (!(await Course.findByPk(courseId))) return res.status(404).json({ message: 'Course not found.' });
        const consultant = await User.findByPk(consultantId);
        if (!consultant || consultant.role !== 'industry-consultant' || consultant.is_active === false) {
            return res.status(400).json({ message: 'That account is not an active industry consultant.' });
        }

        const existing = await CourseConsultant.findOne({ where: { course_id: courseId, consultant_user_id: consultantId } });
        if (existing) {
            if (existing.is_active) return res.status(409).json({ message: 'This consultant is already assigned to the course.' });
            await existing.update({ is_active: true, deactivated_at: null, deactivated_by_user_id: null, assigned_by_user_id: req.user.id });
            return res.json(existing);
        }
        const created = await CourseConsultant.create({
            course_id: courseId, consultant_user_id: consultantId, assigned_by_user_id: req.user.id, is_active: true
        });
        return res.status(201).json(created);
    } catch (err) {
        return next(err);
    }
}

// PUT /api/course-consultants/:id/deactivate — ends the assignment; the record is kept.
async function deactivateAssignment(req, res, next) {
    try {
        const row = await CourseConsultant.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Assignment not found.' });
        if (!row.is_active) return res.json(row);
        await row.update({ is_active: false, deactivated_at: new Date(), deactivated_by_user_id: req.user.id });
        return res.json(row);
    } catch (err) {
        return next(err);
    }
}

module.exports = { listAssignments, assignConsultant, deactivateAssignment };
