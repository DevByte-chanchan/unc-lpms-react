'use strict';

// Who is told about what. Every hook here is fire-and-forget safe: it catches its own errors,
// so a notification problem can never fail the workflow action, comment or assignment it
// follows. Recipients never include the person who acted.

const { pendingReviewerRoles } = require('./workflowRules');
const { effectiveLogs } = require('./effectiveLogs');
const { notify, eventMessage } = require('./notify');

const db = () => require('../models');
const select = (sql, replacements = []) =>
    db().sequelize.query(sql, { replacements, type: db().Sequelize.QueryTypes.SELECT });

// The people attached to one offering: its instructor, its program's head, its department's dean
// (all by course ownership), plus every active Director of Libraries (a global reviewer).
const peopleFor = async (offeringId) => {
    const [row] = await select(
        `SELECT c.course_no, a.co_assign_id, a.stakeholder_id AS instructor_id,
                p.stakeholder_id AS program_head_id, d.stakeholder_id AS dean_id
         FROM ProgramCourseOfferings pco
             INNER JOIN Courses c ON c.course_id = pco.course_id
             LEFT JOIN CourseOfferingAssignments a ON a.pc_offering_id = pco.pc_offering_id
             LEFT JOIN Programs p ON p.program_id = pco.program_id
             LEFT JOIN Departments d ON d.dept_id = pco.dept_id
         WHERE pco.pc_offering_id = ?;`, [offeringId]);
    if (!row) return null;
    const librarians = await select(`SELECT user_id FROM Users WHERE role = 'director-of-libraries' AND is_active = 1;`);
    return {
        courseCode: row.course_no,
        assignmentId: row.co_assign_id,
        instructor: [row.instructor_id],
        programHead: [row.program_head_id],
        dean: [row.dean_id],
        libraryDirectors: librarians.map(l => l.user_id)
    };
};

// Users who hold a workflow role on this offering.
const usersForRole = (people, role) => ({
    INSTRUCTOR: people.instructor,
    PROGRAM_HEAD: people.programHead,
    DEAN: people.dean,
    LIBRARY_DIRECTOR: people.libraryDirectors
}[role] || []);

const withoutActor = (ids, actorUserId) => ids.filter(id => id != null && String(id) !== String(actorUserId));

// Pure: what a workflow action tells whom. `logsAfter` includes the action just recorded.
// Returns null when nobody needs telling (e.g. the first of two reviewers accepts).
const planEvent = ({ actorRole, action, logsAfter, people }) => {
    if (actorRole === 'INSTRUCTOR' && action === 'SUBMITTED') {
        return {
            type: 'plan_submitted', text: 'submitted for review',
            recipients: pendingReviewerRoles(logsAfter).flatMap(role => usersForRole(people, role))
        };
    }
    if (action === 'RETURNED') {
        return { type: 'plan_returned', text: 'returned for revision', recipients: usersForRole(people, 'INSTRUCTOR') };
    }
    if (action === 'ACCEPTED') {
        if (actorRole === 'DEAN') {
            return {
                type: 'plan_approved', text: 'approved',
                recipients: [...usersForRole(people, 'INSTRUCTOR'), ...usersForRole(people, 'PROGRAM_HEAD'), ...usersForRole(people, 'LIBRARY_DIRECTOR')]
            };
        }
        if (pendingReviewerRoles(logsAfter).includes('DEAN')) {
            return { type: 'plan_ready_for_dean', text: 'accepted, ready for the Dean', recipients: usersForRole(people, 'DEAN') };
        }
    }
    return null;
};

const guarded = (fn) => async (...args) => {
    try { return await fn(...args); } catch (error) {
        console.error(`Notification event not sent, the action continues: ${error.message}`);
        return 0;
    }
};

// ---- hooks

// After a submit / return / accept was recorded. Reads the log itself (inside the guard), so
// nothing the caller passes can make this fail the action that already succeeded.
const onWorkflowAction = guarded(async ({ offeringId, actorUserId, actorRole, action, assignmentId }) => {
    const people = await peopleFor(offeringId);
    if (!people) return 0;
    const logs = await effectiveLogs(db().sequelize, assignmentId);
    const event = planEvent({ actorRole, action, logsAfter: logs, people });
    if (!event) return 0;
    return notify(withoutActor(event.recipients, actorUserId), event.type, offeringId, eventMessage(people.courseCode, event.text, actorRole), actorRole);
});

// A comment was added. A reviewer's (or consultant's) comment goes to the instructor; the
// instructor's goes to the reviewers with a pending item.
const onComment = guarded(async ({ offeringId, actorUserId, commenterRole, assignmentId }) => {
    const people = await peopleFor(offeringId);
    if (!people) return 0;
    const recipients = commenterRole === 'INSTRUCTOR'
        ? pendingReviewerRoles(await effectiveLogs(db().sequelize, assignmentId)).flatMap(role => usersForRole(people, role))
        : usersForRole(people, 'INSTRUCTOR');
    return notify(withoutActor(recipients, actorUserId), 'comment_added', offeringId, eventMessage(people.courseCode, 'comment added', commenterRole), commenterRole);
});

// Comments were marked resolved: tell each comment's author once per offering.
// resolved: [{ authorUserId, offeringId }]
const onCommentsResolved = guarded(async ({ resolved, actorUserId, actorRole }) => {
    const byOffering = new Map();
    for (const { authorUserId, offeringId } of resolved) {
        if (!authorUserId || !offeringId) continue;
        if (!byOffering.has(offeringId)) byOffering.set(offeringId, new Set());
        byOffering.get(offeringId).add(authorUserId);
    }
    let written = 0;
    for (const [offeringId, authors] of byOffering) {
        const people = await peopleFor(offeringId);
        if (!people) continue;
        written += await notify(withoutActor([...authors], actorUserId), 'comment_resolved', offeringId,
            eventMessage(people.courseCode, 'comments marked resolved', actorRole), actorRole);
    }
    return written;
});

// The Program Head assigned a course to its lead instructor.
const onCourseAssigned = guarded(async ({ offeringId, instructorUserId, actorUserId }) => {
    const people = await peopleFor(offeringId);
    if (!people) return 0;
    return notify(withoutActor([instructorUserId], actorUserId), 'course_assigned', offeringId,
        eventMessage(people.courseCode, 'course assigned to you', 'PROGRAM_HEAD'), 'PROGRAM_HEAD');
});

// The lead instructor started a revision: the Program Head is told.
const onRevisionStarted = guarded(async ({ offeringId, actorUserId }) => {
    const people = await peopleFor(offeringId);
    if (!people) return 0;
    return notify(withoutActor(people.programHead, actorUserId), 'revision_started', offeringId,
        eventMessage(people.courseCode, 'revision started', 'INSTRUCTOR'), 'INSTRUCTOR');
});

module.exports = { peopleFor, usersForRole, planEvent, onWorkflowAction, onComment, onCommentsResolved, onCourseAssigned, onRevisionStarted };
