'use strict';

// Every version of a course's learning plan in one program, newest first, each with what happened to it and who
// did it (title defense: "file version tracing to track revision history: who edited / revised"). Built from the
// workflow log, the record of every assignment, submission, return and approval.
//
// Not recorded anywhere yet: which fields an instructor changed between submissions (the instructor module saves
// the plan without a change log). The history shows each submission, so it shows when a version changed hands.

const { sequelize, Sequelize } = require('../models');

const select = (sql, r = []) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });

const ROLE = { INSTRUCTOR: 'Instructor', PROGRAM_HEAD: 'Program Head', LIBRARY_DIRECTOR: 'Director of Libraries', DEAN: 'Dean', VPAA: 'VPAA' };
const ACTION = { ASSIGNED: 'Assigned', SUBMITTED: 'Submitted', RETURNED: 'Returned', ACCEPTED: 'Accepted',
    FORWARDED: "Passed the Dean's return to the instructor", COUNTERED: 'Sent back to the Dean' };
const label = (map, key) => map[key] || String(key || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());

// GET /api/assignments/offering/:pcId/history
const getVersionHistory = async (req, res, next) => {
    try {
        const pcId = Number(req.params.pcId);
        const [offering] = Number.isInteger(pcId)
            ? await select('SELECT course_id, program_id FROM ProgramCourseOfferings WHERE pc_offering_id = ?', [pcId]) : [];
        if (!offering) return res.status(404).json({ error: 'Course offering not found.' });
        const versions = await select(
            `SELECT pc_offering_id AS id, revision_number, school_year, semester, approved_at, carried_from_offering_id, createdAt
             FROM ProgramCourseOfferings WHERE course_id = ? AND program_id = ?
             ORDER BY julianday(createdAt) DESC, pc_offering_id DESC`, [offering.course_id, offering.program_id]);
        const logs = versions.length ? await select(
            `SELECT a.pc_offering_id, l.actor_name, l.actor_role, l.action_type, l.note, l.createdAt
             FROM AssignmentWorkflowLogs l INNER JOIN CourseOfferingAssignments a ON a.co_assign_id = l.co_assign_id
             WHERE a.pc_offering_id IN (?) ORDER BY julianday(l.createdAt) ASC, l.log_id ASC`, [versions.map(v => v.id)]) : [];
        return res.json({
            versions: versions.map(v => ({
                id: v.id,
                current: v.id === pcId,
                revision: Number(v.revision_number) || null,
                schoolYear: v.school_year,
                semester: v.semester,
                approvedAt: v.approved_at,
                carriedFrom: v.carried_from_offering_id,
                events: logs.filter(l => l.pc_offering_id === v.id).map(l => ({
                    at: l.createdAt,
                    who: l.actor_name || '',
                    role: label(ROLE, l.actor_role),
                    // The Dean's acceptance is the final approval.
                    action: l.actor_role === 'DEAN' && l.action_type === 'ACCEPTED' ? 'Approved' : label(ACTION, l.action_type),
                    note: l.note || '',
                })),
            })),
        });
    } catch (err) { return next(err); }
};

module.exports = { getVersionHistory };
