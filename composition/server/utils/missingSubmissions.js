'use strict';

// Which learning plans are still waiting on their instructor, and how that stands against the term's
// due date. Used by the "not yet submitted" page and by the automatic reminders, so they can never
// disagree about who is missing.
//
// A plan awaits its instructor while they can still submit it: never submitted, or returned (the same
// rule that lets them edit it, utils/editLock.js). An approved plan, and the carry-over of an approved
// plan, are not waiting.

const { Sequelize } = require('sequelize');
const { effectiveLogs } = require('./effectiveLogs');
const { planEditState } = require('./editLock');
const { daysUntil } = require('./reminderRules');

const placeholders = (ids) => ids.map(() => '?').join(', ');

// programIds: null for every program, or a list. term: { schoolYear, semester } (either may be omitted).
const findAwaiting = async ({ sequelize, programIds = null, schoolYear = null, semester = null }) => {
    if (Array.isArray(programIds) && programIds.length === 0) return [];
    const conditions = ['pco.approved_at IS NULL', 'pco.carried_from_offering_id IS NULL'];
    const replacements = [];
    if (programIds) { conditions.push(`pco.program_id IN (${placeholders(programIds)})`); replacements.push(...programIds); }
    if (schoolYear) { conditions.push('pco.school_year = ?'); replacements.push(schoolYear); }
    if (semester) { conditions.push('pco.semester = ?'); replacements.push(semester); }

    const rows = await sequelize.query(
        `SELECT pco.pc_offering_id AS offeringId, pco.program_id AS programId, pco.school_year AS schoolYear, pco.semester,
                pco.base_offering_id AS baseOfferingId, pco.updatedAt AS planUpdatedAt,
                c.course_no AS courseCode, c.course_title AS courseTitle, p.name AS programName,
                a.co_assign_id AS assignmentId, a.stakeholder_id AS instructorId, a.date_assigned AS assignedAt,
                u.name AS instructorName, u.email AS instructorEmail, u.is_active AS instructorActive,
                td.syllabus_due AS syllabusDue
         FROM ProgramCourseOfferings pco
             INNER JOIN Courses c ON c.course_id = pco.course_id
             INNER JOIN Programs p ON p.program_id = pco.program_id
             INNER JOIN CourseOfferingAssignments a ON a.pc_offering_id = pco.pc_offering_id
             LEFT JOIN Users u ON u.user_id = CAST(a.stakeholder_id AS INTEGER)
             LEFT JOIN TermDeadlines td ON td.program_id = pco.program_id AND td.school_year = pco.school_year AND td.semester = pco.semester
         WHERE ${conditions.join(' AND ')}
         ORDER BY pco.school_year DESC, pco.semester ASC, c.course_no ASC;`,
        { replacements, type: Sequelize.QueryTypes.SELECT }
    );

    const waiting = [];
    for (const row of rows) {
        const logs = await effectiveLogs(sequelize, row.assignmentId);
        const state = planEditState(logs);
        if (!state.editable) continue;
        // When a returned plan was returned (its latest return), for the "returned and not resubmitted" reminders.
        const lastReturn = state.state === 'Returned' ? [...logs].reverse().find(l => l.action_type === 'RETURNED') : null;
        waiting.push({
            ...row,
            instructorId: row.instructorId == null ? null : Number(row.instructorId),
            instructorActive: row.instructorActive == null ? false : Boolean(row.instructorActive),
            isRevision: row.baseOfferingId != null,
            state: state.state,
            returnedAt: lastReturn ? lastReturn.createdAt : null
        });
    }
    return waiting;
};

// Where a waiting plan stands on `today` (YYYY-MM-DD in the school's zone).
//   no-deadline: the program has set no due date;  overdue;  due-soon (3 days or fewer);  on-track.
const standing = (row, today) => {
    if (!row.syllabusDue) return { daysLeft: null, status: 'no-deadline' };
    const daysLeft = daysUntil(row.syllabusDue, today);
    return { daysLeft, status: daysLeft < 0 ? 'overdue' : daysLeft <= 3 ? 'due-soon' : 'on-track' };
};

module.exports = { findAwaiting, standing };
