'use strict';

// Who is told about what. Every hook here is fire-and-forget safe: it catches its own errors,
// so a notification problem can never fail the workflow action, comment or assignment it
// follows. Recipients never include the person who acted.

const { pendingReviewerRoles } = require('./workflowRules');
const { effectiveLogs } = require('./effectiveLogs');
const { notify, eventMessage } = require('./notify');
const { yearsRule, flagsOf, needsAttention } = require('./referenceHealth');

const db = () => require('../models');
const select = (sql, replacements = []) =>
    db().sequelize.query(sql, { replacements, type: db().Sequelize.QueryTypes.SELECT });

// The people attached to one offering: its instructor, its program's head, its department's dean
// (all by course ownership), plus every active Director of Libraries (a global reviewer) and every
// active VPAA (who reads approved plans).
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
    const librarians = await select(`SELECT user_id FROM Users WHERE (role = 'director-of-libraries' OR roles LIKE '%"director-of-libraries"%') AND is_active = 1;`);
    const vpaa = await select(`SELECT user_id FROM Users WHERE (role = 'vpaa' OR roles LIKE '%"vpaa"%') AND is_active = 1;`);
    return {
        courseCode: row.course_no,
        assignmentId: row.co_assign_id,
        instructor: [row.instructor_id],
        programHead: [row.program_head_id],
        dean: [row.dean_id],
        libraryDirectors: librarians.map(l => l.user_id),
        vpaa: vpaa.map(v => v.user_id)
    };
};

// Users who hold a workflow role on this offering.
const usersForRole = (people, role) => ({
    INSTRUCTOR: people.instructor,
    PROGRAM_HEAD: people.programHead,
    DEAN: people.dean,
    LIBRARY_DIRECTOR: people.libraryDirectors,
    VPAA: people.vpaa
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
    // A Dean return goes to the Program Head first; the instructor hears when it is forwarded.
    if (action === 'RETURNED' && actorRole === 'DEAN') {
        return { type: 'plan_returned', text: 'returned to the Program Head', recipients: usersForRole(people, 'PROGRAM_HEAD') };
    }
    if (action === 'RETURNED' || action === 'FORWARDED') {
        return { type: 'plan_returned', text: 'returned for revision', recipients: usersForRole(people, 'INSTRUCTOR') };
    }
    if (action === 'COUNTERED') {
        return { type: 'plan_ready_for_dean', text: 'sent back to the Dean', recipients: usersForRole(people, 'DEAN') };
    }
    if (action === 'ACCEPTED') {
        if (actorRole === 'DEAN') {
            return {
                type: 'plan_approved', text: 'approved',
                recipients: [...usersForRole(people, 'INSTRUCTOR'), ...usersForRole(people, 'PROGRAM_HEAD'), ...usersForRole(people, 'LIBRARY_DIRECTOR'), ...usersForRole(people, 'VPAA')]
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

// A submitted plan whose references need attention: the Director of Libraries is told which plan, so they
// look at it first. Counts only; the Reference view of the plan shows which titles and why.
const warnDirectorOfFlaggedReferences = async ({ offeringId, people }) => {
    const refs = await select(
        `SELECT DISTINCT r.reference_id, r.type, r.isbn, r.link, r.publication_year, r.status, r.copies
         FROM WeeklyReferences wr
             INNER JOIN \`References\` r ON r.reference_id = wr.reference_id
             INNER JOIN Weeks w ON w.week_id = wr.week_id
             INNER JOIN CourseOutcomes co ON co.co_id = w.co_id
         WHERE co.pc_offering_id = ?;`, [offeringId]);
    if (refs.length === 0) return 0;
    const years = await yearsRule();
    const flagged = refs.filter(ref => needsAttention(flagsOf(ref, { years }))).length;
    if (flagged === 0) return 0;
    return notify(people.libraryDirectors, 'reference_flags', offeringId,
        eventMessage(people.courseCode, `${flagged} of ${refs.length} references need a look`, null), null);
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
    const written = await notify(withoutActor(event.recipients, actorUserId), event.type, offeringId, eventMessage(people.courseCode, event.text, actorRole), actorRole);
    // Only when the plain notice was written: if notifications are failing, one logged failure is enough.
    if (written > 0 && event.type === 'plan_submitted' && pendingReviewerRoles(logs).includes('LIBRARY_DIRECTOR')) {
        await warnDirectorOfFlaggedReferences({ offeringId, people });
    }
    return written;
});

// A comment was added. A reviewer's (or consultant's) comment goes to the instructor; the
// instructor's goes to the reviewers with a pending item.
const onComment = guarded(async ({ offeringId, actorUserId, commenterRole, assignmentId }) => {
    const people = await peopleFor(offeringId);
    if (!people) return 0;
    // The Dean's comments reach the instructor through the Program Head (who forwards a Dean return or sends it
    // back), and the instructor cannot read them before that: the Program Head is told, not the instructor.
    const recipients = commenterRole === 'INSTRUCTOR'
        ? pendingReviewerRoles(await effectiveLogs(db().sequelize, assignmentId)).flatMap(role => usersForRole(people, role))
        : commenterRole === 'DEAN'
            ? usersForRole(people, 'PROGRAM_HEAD')
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
