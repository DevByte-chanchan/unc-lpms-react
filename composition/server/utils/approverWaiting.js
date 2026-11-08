'use strict';

// Which submitted learning plans are waiting on an approver, since when, and who that approver is. Used
// by the automatic reminders. Who must act is decided by the approval chain itself (pendingReviewerRoles),
// so the reminders can never disagree with what the approvers see:
//   - the Director of Libraries and the Program Head review in parallel; each waits from the instructor's
//     latest submission;
//   - the Dean waits from the moment the second of those two accepted.
// A plan that is approved, returned (it is with the instructor), or not yet submitted is not waiting.

const { Sequelize } = require('sequelize');
const { effectiveLogs } = require('./effectiveLogs');
const { pendingReviewerRoles } = require('./workflowRules');
const { asDate, schoolClock, daysUntil } = require('./reminderRules');

const REVIEWERS = ['LIBRARY_DIRECTOR', 'PROGRAM_HEAD'];

// The instant a role began to wait on the plan, from its log (chronological).
const waitingSince = (logs, role) => {
    const last = logs.map(entry => entry.actor_role === 'INSTRUCTOR' && entry.action_type === 'SUBMITTED').lastIndexOf(true);
    if (last < 0) return null;
    const since = logs.slice(last);
    const latest = (match) => { const hits = since.filter(match); return hits.length ? hits[hits.length - 1].createdAt : null; };
    // A Dean return waits on the Program Head from that return.
    if (role === 'PROGRAM_HEAD') {
        const deanReturn = latest(entry => entry.actor_role === 'DEAN' && entry.action_type === 'RETURNED');
        if (deanReturn) return deanReturn;
    }
    if (role !== 'DEAN') return logs[last].createdAt;
    // The Dean waits from the later of the two acceptances given since that submission, or from the Program
    // Head sending a return back.
    return latest(entry => (REVIEWERS.includes(entry.actor_role) && ['ACCEPTED', 'APPROVED'].includes(entry.action_type))
        || (entry.actor_role === 'PROGRAM_HEAD' && entry.action_type === 'COUNTERED')) || logs[last].createdAt;
};

// One row per (plan, role it waits on): { offeringId, role, programHeadId, deanId, waitedDays }.
// `today` is the school's day (YYYY-MM-DD); programIds limits the plans (null = every program).
const findWaitingOnApprovers = async ({ sequelize, today, timeZone, programIds = null }) => {
    if (Array.isArray(programIds) && programIds.length === 0) return [];
    const where = programIds ? `AND pco.program_id IN (${programIds.map(() => '?').join(', ')})` : '';
    const rows = await sequelize.query(
        `SELECT pco.pc_offering_id AS offeringId, pco.program_id AS programId, a.co_assign_id AS assignmentId,
                p.stakeholder_id AS programHeadId, d.stakeholder_id AS deanId
         FROM ProgramCourseOfferings pco
             INNER JOIN CourseOfferingAssignments a ON a.pc_offering_id = pco.pc_offering_id
             LEFT JOIN Programs p ON p.program_id = pco.program_id
             LEFT JOIN Departments d ON d.dept_id = pco.dept_id
         WHERE pco.approved_at IS NULL AND pco.carried_from_offering_id IS NULL ${where}`,
        { replacements: programIds || [], type: Sequelize.QueryTypes.SELECT });

    const waiting = [];
    for (const row of rows) {
        const logs = await effectiveLogs(sequelize, row.assignmentId);
        for (const role of pendingReviewerRoles(logs)) {
            const since = waitingSince(logs, role);
            if (!since) continue;
            const waitedDays = daysUntil(today, schoolClock(asDate(since), timeZone).day);
            waiting.push({
                offeringId: row.offeringId, role, waitedDays,
                programHeadId: row.programHeadId == null ? null : Number(row.programHeadId),
                deanId: row.deanId == null ? null : Number(row.deanId)
            });
        }
    }
    return waiting;
};

module.exports = { findWaitingOnApprovers, waitingSince };
