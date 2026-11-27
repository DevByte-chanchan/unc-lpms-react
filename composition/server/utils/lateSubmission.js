'use strict';

// Is submitting this plan now a late submission? (Panel feedback, Nov 2026: a late plan comes with the instructor's
// reason, which the Program Head and the Dean read.) Late = the plan's first submission, after the syllabus due date
// its program set for the term (TermDeadlines), counted in the school's days. A resubmission after a return was on
// time the first time, and a revision or carry-over of an approved plan is not a term submission, so neither is late.
//   { late: true, daysLate, dueDate } | { late: false, dueDate? }

const { Sequelize } = require('sequelize');
const { schoolClock, timezoneOf, daysUntil } = require('./reminderRules');

const MIN_REASON = 5;
const MAX_REASON = 1000;

const lateSubmission = async (sequelize, offeringId, now = new Date()) => {
    const select = (sql, replacements) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
    const [plan] = await select(
        `SELECT pco.base_offering_id AS baseId, pco.carried_from_offering_id AS carriedFrom, td.syllabus_due AS due
         FROM ProgramCourseOfferings pco
             LEFT JOIN TermDeadlines td ON td.program_id = pco.program_id AND td.school_year = pco.school_year AND td.semester = pco.semester
         WHERE pco.pc_offering_id = ?`, [offeringId]);
    if (!plan || !plan.due || plan.baseId != null || plan.carriedFrom != null) return { late: false, dueDate: plan?.due || null };
    const [before] = await select(
        `SELECT 1 AS yes FROM AssignmentWorkflowLogs l INNER JOIN CourseOfferingAssignments a ON a.co_assign_id = l.co_assign_id
         WHERE a.pc_offering_id = ? AND l.action_type = 'SUBMITTED' LIMIT 1`, [offeringId]);
    if (before) return { late: false, dueDate: plan.due };
    const daysLate = daysUntil(schoolClock(now, timezoneOf()).day, String(plan.due).slice(0, 10));
    return daysLate > 0 ? { late: true, daysLate, dueDate: String(plan.due).slice(0, 10) } : { late: false, dueDate: String(plan.due).slice(0, 10) };
};

// The reason sent with a submission, or the refusal to send back (null when none is needed or it is fine).
const lateReasonProblem = (late, reason) => {
    if (!late.late) return null;
    const text = String(reason ?? '').replace(/\s+/g, ' ').trim();
    if (text.length < MIN_REASON) {
        return { code: 'LATE_REASON_REQUIRED', daysLate: late.daysLate, dueDate: late.dueDate,
            error: `This learning plan is ${late.daysLate} day${late.daysLate === 1 ? '' : 's'} late (due ${late.dueDate}). Say why it is late; the Program Head and the Dean will read it.` };
    }
    if (text.length > MAX_REASON) return { code: 'LATE_REASON_TOO_LONG', error: `The reason is longer than ${MAX_REASON} characters.` };
    return null;
};

const cleanReason = (reason) => String(reason ?? '').replace(/\s+/g, ' ').trim();

module.exports = { lateSubmission, lateReasonProblem, cleanReason };
