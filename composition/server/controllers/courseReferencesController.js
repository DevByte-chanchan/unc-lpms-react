'use strict';

// The Director of Libraries files library references under each course: Department > Program > Course > its
// references (sir: per course, not per department).
//
//   GET    /api/course-references/tree                    departments, their programs and courses, with counts each
//   GET    /api/course-references/:courseId               a course's references: filed under it, used in its plans, or both
//
// A course's references are the ones the Director filed under it (CourseReferences) and the ones its learning plans
// use (WeeklyReferences on its offerings' weeks). Counting only the filed ones showed 0 for courses whose plans
// already cite titles from the library.
//   GET    /api/course-references/by-reference/:referenceId  the courses a reference is filed under
//   POST   /api/course-references/:courseId               { reference_id }      file one (Director)
//   DELETE /api/course-references/:courseId/:referenceId  take it off (Director)

const { sequelize, Sequelize } = require('../models');

const select = (sql, r = []) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });
const asInt = (value) => (/^\d+$/.test(String(value ?? '')) ? Number(value) : null);

// Every (course, reference) pair with how it is linked: filed, used in a plan, or both.
const COURSE_REFERENCE_LINKS = `
    SELECT course_id, reference_id, MAX(filed) AS filed, MAX(used) AS used FROM (
        SELECT cr.course_id, cr.reference_id, 1 AS filed, 0 AS used FROM CourseReferences cr
        UNION ALL
        SELECT pco.course_id, wr.reference_id, 0 AS filed, 1 AS used FROM WeeklyReferences wr
            INNER JOIN Weeks w ON w.week_id = wr.week_id
            INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
            INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
    ) GROUP BY course_id, reference_id`;

const tree = async (req, res, next) => {
    try {
        const rows = await select(
            `SELECT DISTINCT d.dept_id, d.name AS dept_name, p.program_id, p.name AS program_name,
                    c.course_id, c.course_no, c.course_title,
                    (SELECT COUNT(*) FROM (${COURSE_REFERENCE_LINKS}) l WHERE l.course_id = c.course_id) AS reference_count,
                    (SELECT COUNT(*) FROM (${COURSE_REFERENCE_LINKS}) l WHERE l.course_id = c.course_id AND l.filed = 1) AS filed_count,
                    (SELECT COUNT(*) FROM (${COURSE_REFERENCE_LINKS}) l WHERE l.course_id = c.course_id AND l.used = 1) AS used_count
             FROM ProgramCourseOfferings pco
                 INNER JOIN Programs p ON p.program_id = pco.program_id
                 INNER JOIN Departments d ON d.dept_id = p.dept_id
                 INNER JOIN Courses c ON c.course_id = pco.course_id
             ORDER BY d.name, p.name, c.course_no;`);
        const departments = [];
        for (const r of rows) {
            let dept = departments.find(d => d.id === r.dept_id);
            if (!dept) departments.push(dept = { id: r.dept_id, name: r.dept_name, programs: [] });
            let program = dept.programs.find(p => p.id === r.program_id);
            if (!program) dept.programs.push(program = { id: r.program_id, name: r.program_name, courses: [] });
            if (!program.courses.some(c => c.id === r.course_id)) {
                program.courses.push({
                    id: r.course_id, code: r.course_no, title: r.course_title,
                    references: Number(r.reference_count) || 0, filed: Number(r.filed_count) || 0, used: Number(r.used_count) || 0,
                });
            }
        }
        return res.json({ departments });
    } catch (err) { return next(err); }
};

const list = async (req, res, next) => {
    try {
        const courseId = asInt(req.params.courseId);
        if (!courseId) return res.status(400).json({ error: 'A course is required.' });
        const references = await select(
            `SELECT r.reference_id, r.title, r.author, r.type, r.publication_year, r.status, r.archived,
                    l.filed, l.used, cr.createdAt AS added_at
             FROM (${COURSE_REFERENCE_LINKS}) l
                 INNER JOIN \`References\` r ON r.reference_id = l.reference_id
                 LEFT JOIN CourseReferences cr ON cr.course_id = l.course_id AND cr.reference_id = l.reference_id
             WHERE l.course_id = ? ORDER BY r.title;`, [courseId]);
        return res.json({ references });
    } catch (err) { return next(err); }
};

const byReference = async (req, res, next) => {
    try {
        const courses = await select(
            `SELECT c.course_id, c.course_no, c.course_title FROM CourseReferences cr INNER JOIN Courses c ON c.course_id = cr.course_id
             WHERE cr.reference_id = ? ORDER BY c.course_no;`, [asInt(req.params.referenceId)]);
        return res.json({ courses });
    } catch (err) { return next(err); }
};

const add = async (req, res, next) => {
    try {
        const courseId = asInt(req.params.courseId);
        const referenceId = asInt(req.body?.reference_id);
        if (!courseId || !referenceId) return res.status(400).json({ error: 'A course and a reference are required.' });
        const [course] = await select('SELECT course_id FROM Courses WHERE course_id = ?', [courseId]);
        const [reference] = await select('SELECT reference_id FROM `References` WHERE reference_id = ?', [referenceId]);
        if (!course || !reference) return res.status(404).json({ error: 'That course or reference does not exist.' });
        const [already] = await select('SELECT 1 AS x FROM CourseReferences WHERE course_id = ? AND reference_id = ?', [courseId, referenceId]);
        if (already) return res.json({ added: false });
        await sequelize.getQueryInterface().bulkInsert('CourseReferences', [{ course_id: courseId, reference_id: referenceId, added_by: req.user.id, createdAt: new Date() }]);
        return res.status(201).json({ added: true });
    } catch (err) { return next(err); }
};

const remove = async (req, res, next) => {
    try {
        await sequelize.query('DELETE FROM CourseReferences WHERE course_id = ? AND reference_id = ?',
            { replacements: [asInt(req.params.courseId), asInt(req.params.referenceId)] });
        return res.json({ removed: true });
    } catch (err) { return next(err); }
};

module.exports = { tree, list, byReference, add, remove };
