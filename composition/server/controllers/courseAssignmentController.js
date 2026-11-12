'use strict';

// Course Assignment (Program Head): the pre-assignment beside the registrar's official list.
//
//   GET  /api/course-assignments?school_year=2026-2027&semester=1st
//        every course of the programs this Program Head heads, its pre-assigned instructor for the term, the
//        official sections and faculty (when a list was imported), and how the two compare
//   POST /api/course-assignments/official?school_year=&semester=     body: the .xls / .xlsx file, as raw bytes
//        imports the Subject Offerings export; replaces that term's official rows for these programs
//   PUT  /api/course-assignments/:offeringId/instructor   { instructor_user_id }
//        changes the pre-assigned instructor (e.g. to the official one); the plan stays with the course
//
// Pre-assigning a course that has no assignment yet is POST /api/offerings (offeringController.assignCourse).
// Interview, Part 1: pre-assign before enrollment, then "ima-match mo lang ... i-update mo si nasa initial
// assignment mo" once the official list arrives at the end of enrollment.

const { sequelize, Sequelize } = require('../models');
const service = require('../services/offeringService');
const offerings = require('../utils/subjectOfferings');
const { onCourseAssigned } = require('../utils/notificationEvents');
const { programReadiness } = require('../utils/programReadiness');

const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
const asInt = (value) => (Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null);
const fail = (res, next, error) => {
    if (error instanceof service.ServiceError) return res.status(error.statusCode).json({ message: error.message });
    return next(error);
};
const termOf = (query) => {
    const schoolYear = String(query.school_year || '');
    const semester = String(query.semester || '');
    service.validTerm(schoolYear, semester);
    return { schoolYear, semester };
};

const headedPrograms = async (userId) => (await select('SELECT program_id FROM Programs WHERE stakeholder_id = ?', [userId])).map(p => p.program_id);

const coursesOf = (programIds) => (programIds.length ? select(
    `SELECT DISTINCT pco.course_id, pco.program_id, c.course_no, c.course_title, c.year_lvl
     FROM ProgramCourseOfferings pco INNER JOIN Courses c ON c.course_id = pco.course_id
     WHERE pco.program_id IN (?) ORDER BY c.course_no ASC;`, [programIds]) : []);

const activeInstructors = () => select(
    `SELECT user_id, name FROM Users
     WHERE (role = 'instructor' OR roles LIKE '%"instructor"%') AND (is_active IS NULL OR is_active != 0) ORDER BY name ASC;`);

async function listAssignments(req, res, next) {
    try {
        const { schoolYear, semester } = termOf(req.query);
        const programIds = await headedPrograms(req.user.id);
        const [courses, users] = await Promise.all([coursesOf(programIds), activeInstructors()]);
        const assignments = programIds.length ? await select(
            `SELECT pco.pc_offering_id, pco.course_id, pco.program_id, a.stakeholder_id AS instructor_user_id,
                    u.name AS instructor_name, a.date_assigned
             FROM ProgramCourseOfferings pco
                 INNER JOIN CourseOfferingAssignments a ON a.pc_offering_id = pco.pc_offering_id
                 LEFT JOIN Users u ON u.user_id = a.stakeholder_id
             WHERE pco.program_id IN (?) AND pco.school_year = ? AND pco.semester = ?;`,
            [programIds, schoolYear, semester]) : [];
        const stored = programIds.length ? await select(
            `SELECT program_id, course_no, section, faculty, createdAt FROM OfficialOfferings
             WHERE program_id IN (?) AND school_year = ? AND semester = ? ORDER BY course_no, section;`,
            [programIds, schoolYear, semester]) : [];
        const sections = stored.map(s => ({ courseNo: s.course_no, section: s.section, faculty: JSON.parse(s.faculty || '[]') }));
        const rows = offerings.compare({ courses, assignments, sections, users, hasOfficial: stored.length > 0 });
        // Programs whose documents are not complete yet: none of their courses can be assigned (offeringService).
        const notReady = [];
        const programs = programIds.length ? await select('SELECT program_id, name FROM Programs WHERE program_id IN (?) ORDER BY name', [programIds]) : [];
        for (const program of programs) {
            const readiness = await programReadiness(sequelize, program.program_id);
            if (!readiness.complete) notReady.push({ programId: program.program_id, name: program.name, missing: readiness.missing });
        }
        return res.json({
            rows,
            notReady,
            // The programs this Program Head heads, for the page title ("BSIT: Course Assignment").
            programs: programs.map(p => ({ programId: p.program_id, name: p.name })),
            instructors: users,
            official: stored.length ? { sections: stored.length, importedAt: stored[0].createdAt } : null,
        });
    } catch (error) {
        return fail(res, next, error);
    }
}

async function importOfficial(req, res, next) {
    try {
        const { schoolYear, semester } = termOf(req.query);
        if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ message: 'Choose the Subject Offerings file (.xls or .xlsx).' });
        let parsed;
        try {
            parsed = offerings.parseSubjectOfferings(offerings.readWorkbook(req.body));
        } catch {
            parsed = null;
        }
        if (!parsed) return res.status(400).json({ message: 'This is not a Subject Offerings export: no CODE / COURSE NO header was found.' });
        if ((parsed.schoolYear && parsed.schoolYear !== schoolYear) || (parsed.semester && parsed.semester !== semester)) {
            return res.status(400).json({ message: `This file is for ${parsed.semester || '?'} semester ${parsed.schoolYear || '?'}, not ${semester} semester ${schoolYear}. Pick that term first.` });
        }

        const programIds = await headedPrograms(req.user.id);
        const courses = await coursesOf(programIds);
        // Only this Program Head's courses are kept: the export covers the whole school.
        const now = new Date();
        const rows = [];
        for (const course of courses) {
            const code = String(course.course_no || '').toUpperCase();
            for (const s of parsed.sections.filter(x => x.courseNo === code)) {
                rows.push({
                    program_id: course.program_id, school_year: schoolYear, semester, course_no: code, section: s.section,
                    title: s.title || null, faculty: JSON.stringify(s.faculty), imported_by: req.user.id, createdAt: now,
                });
            }
        }
        if (!rows.length) return res.status(400).json({ message: 'None of your program\'s courses are in this file.' });

        await sequelize.transaction(async (transaction) => {
            await sequelize.query('DELETE FROM OfficialOfferings WHERE program_id IN (?) AND school_year = ? AND semester = ?;',
                { replacements: [programIds, schoolYear, semester], transaction });
            await sequelize.getQueryInterface().bulkInsert('OfficialOfferings', rows, { transaction });
        });
        return res.status(201).json({ sections: rows.length, courses: new Set(rows.map(r => r.course_no)).size });
    } catch (error) {
        return fail(res, next, error);
    }
}

async function changeInstructor(req, res, next) {
    try {
        const offeringId = asInt(req.params.offeringId);
        const instructorUserId = asInt(req.body?.instructor_user_id);
        if (!offeringId || !instructorUserId) return res.status(400).json({ message: 'An offering and an instructor are required.' });
        const [row] = await select(
            `SELECT a.co_assign_id, a.stakeholder_id, p.stakeholder_id AS head_id
             FROM CourseOfferingAssignments a
                 INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = a.pc_offering_id
                 INNER JOIN Programs p ON p.program_id = pco.program_id
             WHERE a.pc_offering_id = ?;`, [offeringId]);
        if (!row) return res.status(404).json({ message: 'That course is not assigned for this term.' });
        if (String(row.head_id) !== String(req.user.id)) return res.status(403).json({ message: 'Only the head of this program can change its assignments.' });
        const users = await activeInstructors();
        if (!users.some(u => String(u.user_id) === String(instructorUserId))) {
            return res.status(400).json({ message: 'The instructor must be an active instructor account.' });
        }
        if (String(row.stakeholder_id) === String(instructorUserId)) return res.json({ changed: false });

        const now = new Date();
        await sequelize.transaction(async (transaction) => {
            await sequelize.query('UPDATE CourseOfferingAssignments SET stakeholder_id = ?, date_updated = ?, updatedAt = ? WHERE co_assign_id = ?;',
                { replacements: [String(instructorUserId), now, now, row.co_assign_id], transaction });
            await sequelize.getQueryInterface().bulkInsert('AssignmentWorkflowLogs', [{
                co_assign_id: row.co_assign_id, actor_role: 'PROGRAM_HEAD', actor_name: req.user.name || null,
                action_type: 'ASSIGNED', createdAt: now, updatedAt: now,
            }], { transaction });
        });
        await onCourseAssigned({ offeringId, instructorUserId, actorUserId: req.user.id });
        return res.json({ changed: true });
    } catch (error) {
        return fail(res, next, error);
    }
}

module.exports = { listAssignments, importOfficial, changeInstructor };
