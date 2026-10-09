'use strict';

const { sequelize, Sequelize, CourseConsultant, Course, User } = require('../models');

const asInt = (value) => (Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null);

// GET /api/course-consultants?courseId= — Program Head / Dean list assignments; a consultant sees their own.
async function listAssignments(req, res, next) {
    try {
        const courseId = req.query.courseId ? asInt(req.query.courseId) : null;
        const consultantId = req.user.role === 'industry-consultant' ? req.user.id : null;
        const rows = await sequelize.query(
            `SELECT cc.*, u.name AS consultant_name, c.course_no, c.course_title
             FROM CourseConsultants cc
                 INNER JOIN Courses c ON c.course_id = cc.course_id
                 LEFT JOIN Users u ON u.user_id = cc.consultant_user_id
             WHERE (? IS NULL OR cc.course_id = ?) AND (? IS NULL OR cc.consultant_user_id = ?)
             ORDER BY cc.is_active DESC, c.course_no ASC, cc.course_consultant_id ASC;`,
            { replacements: [courseId, courseId, consultantId, consultantId], type: Sequelize.QueryTypes.SELECT });
        return res.json(rows);
    } catch (err) {
        return next(err);
    }
}

// GET /api/course-consultants/candidates — what the Program Head can pick from: the courses of the
// programs they head and the active consultant accounts.
async function getCandidates(req, res, next) {
    try {
        const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
        const courses = await select(
            `SELECT DISTINCT c.course_id, c.course_no, c.course_title
             FROM ProgramCourseOfferings pco
                 INNER JOIN Courses c ON c.course_id = pco.course_id
                 INNER JOIN Programs p ON p.program_id = pco.program_id
             WHERE p.stakeholder_id = ? ORDER BY c.course_no ASC;`, [req.user.id]);
        const consultants = await select(
            `SELECT user_id, name FROM Users WHERE role = 'industry-consultant' AND (is_active IS NULL OR is_active != 0) ORDER BY name ASC;`);
        return res.json({ courses, consultants });
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
        // Only the head of a program that offers the course may assign its consultant.
        const [headed] = await sequelize.query(
            `SELECT 1 AS ok FROM ProgramCourseOfferings pco INNER JOIN Programs p ON p.program_id = pco.program_id
             WHERE pco.course_id = ? AND p.stakeholder_id = ? LIMIT 1;`,
            { replacements: [courseId, req.user.id], type: Sequelize.QueryTypes.SELECT });
        if (!headed) return res.status(403).json({ message: 'Only the head of a program that offers this course can assign its consultant.' });
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

module.exports = { listAssignments, getCandidates, assignConsultant, deactivateAssignment };
