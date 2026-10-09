'use strict';

const { sequelize, Sequelize } = require('../models');
const service = require('../services/offeringService');
const { onCourseAssigned, onRevisionStarted } = require('../utils/notificationEvents');

const asInt = (value) => (Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null);

const fail = (res, next, error) => {
    if (error instanceof service.ServiceError) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
};

// GET /api/offerings/candidates — what the Program Head can assign: the courses of the programs
// they head (with the revision a new term would carry over), and the instructors to lead them.
async function getCandidates(req, res, next) {
    try {
        const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
        const courses = await select(
            `SELECT DISTINCT pco.course_id, pco.program_id, c.course_no, c.course_title, p.name AS program_name,
                    (SELECT MAX(a.revision_number) FROM ProgramCourseOfferings a
                      WHERE a.course_id = pco.course_id AND a.program_id = pco.program_id) AS latest_revision
             FROM ProgramCourseOfferings pco
                 INNER JOIN Courses c ON c.course_id = pco.course_id
                 INNER JOIN Programs p ON p.program_id = pco.program_id
             WHERE p.stakeholder_id = ?
             ORDER BY c.course_no ASC;`, [req.user.id]);
        const instructors = await select(
            `SELECT user_id, name FROM Users WHERE role = 'instructor' AND (is_active IS NULL OR is_active != 0) ORDER BY name ASC;`);
        return res.json({ courses, instructors, semesters: service.SEMESTERS });
    } catch (error) {
        return next(error);
    }
}

// POST /api/offerings — the Program Head assigns a course to a lead instructor for a term.
async function assignCourse(req, res, next) {
    try {
        const body = req.body || {};
        const courseId = asInt(body.course_id);
        const programId = asInt(body.program_id);
        const instructorUserId = asInt(body.instructor_user_id);
        if (!courseId || !programId || !instructorUserId) {
            return res.status(400).json({ message: 'course_id, program_id and instructor_user_id are required.' });
        }
        const result = await service.assignCourseForTerm({
            courseId, programId, instructorUserId, schoolYear: body.school_year, semester: body.semester, user: req.user,
        });
        await onCourseAssigned({ offeringId: result.offeringId, instructorUserId, actorUserId: req.user.id });
        return res.status(201).json(result);
    } catch (error) {
        return fail(res, next, error);
    }
}

// POST /api/offerings/:id/start-revision — the lead instructor starts a revision of an approved syllabus.
async function startRevision(req, res, next) {
    try {
        const offeringId = asInt(req.params.id);
        if (!offeringId) return res.status(400).json({ message: 'A valid offering id is required.' });
        const result = await service.startRevision({ offeringId, user: req.user });
        await onRevisionStarted({ offeringId: result.offeringId, actorUserId: req.user.id });
        return res.status(201).json(result);
    } catch (error) {
        return fail(res, next, error);
    }
}

module.exports = { getCandidates, assignCourse, startRevision };
