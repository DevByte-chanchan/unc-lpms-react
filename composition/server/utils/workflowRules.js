'use strict';

// The approval chain, as one pure state machine over a plan's workflow log.
//
//   instructor submits -> Library Director and Program Head review in parallel
//                      -> the Dean acts only after BOTH have accepted.
//
// The Industry Consultant is not part of the chain: they may read and comment, but never
// accept or return, so any consultant entry in an old log is ignored here.
//
// A return goes back to the instructor. While it waits there, nobody can accept it. A return by
// the Library Director or the Program Head clears every acceptance, so after the resubmission
// both reviewers accept again (the instructor may have changed any section).
//
// A Dean return goes to the Program Head first (owner's decision, Nov 2026): the plan stays locked
// "with the Program Head", who either FORWARDS it to the instructor or, disagreeing, COUNTERS it
// back to the Dean with a note. After a forward the instructor edits and resubmits, and it goes back
// to the Dean only: the reviewers' acceptances stay. The same rules are mirrored on the client in utils/workflowFromLogs.js.

const REQUIRED_REVIEWERS = ['LIBRARY_DIRECTOR', 'PROGRAM_HEAD'];
const DECIDING_ROLES = new Set([...REQUIRED_REVIEWERS, 'DEAN']);

// logs: AssignmentWorkflowLog rows in chronological order.
const deriveReviewState = (logs = []) => {
    const accepted = new Set();
    const returned = new Set();
    let submitted = false;
    // A Dean return waiting on the Program Head to forward it or counter it.
    let withProgramHead = false;

    for (const entry of Array.isArray(logs) ? logs : []) {
        if (entry.actor_role === 'INSTRUCTOR' && entry.action_type === 'SUBMITTED') {
            if (!submitted) {
                submitted = true;
                accepted.clear();
            }
            // Resubmission: the plan is back with the reviewers (see the RETURNED rule below).
            returned.clear();
            withProgramHead = false;
        } else if (entry.actor_role === 'PROGRAM_HEAD' && ['FORWARDED', 'COUNTERED'].includes(entry.action_type)) {
            if (!withProgramHead) continue;
            withProgramHead = false;
            // Forwarded: it is the instructor's, as a Dean return. Countered: back with the Dean.
            if (entry.action_type === 'FORWARDED') returned.add('DEAN');
        } else if (DECIDING_ROLES.has(entry.actor_role)) {
            if (['ACCEPTED', 'APPROVED'].includes(entry.action_type)) {
                // Older logs may hold an acceptance given while the plan waited on the instructor (or on the Program
                // Head after a Dean return); it never counts.
                if (returned.size > 0 || withProgramHead) continue;
                accepted.add(entry.actor_role);
                returned.delete(entry.actor_role);
            } else if (entry.action_type === 'RETURNED') {
                if (entry.actor_role === 'DEAN') {
                    // To the Program Head first; the instructor gets it only when forwarded.
                    accepted.delete('DEAN');
                    withProgramHead = true;
                    continue;
                }
                returned.add(entry.actor_role);
                // A reviewer's return unlocks the whole plan, so every acceptance so far no longer matches
                // what will be resubmitted: both reviewers approve again. A Dean return keeps the reviewers'
                // acceptances and only the Dean reviews again.
                accepted.clear();
            }
        }
    }

    return {
        submitted,
        accepted,
        returned,
        withProgramHead,
        approved: accepted.has('DEAN'),
        reviewersDone: REQUIRED_REVIEWERS.every(role => accepted.has(role)),
    };
};

// Whether a plan is editable by its instructor: before the first submission, or after a
// return. Pending and approved plans are locked.
const planEditState = (logs = []) => {
    const state = deriveReviewState(logs);
    if (state.approved) return { state: 'Approved', editable: false };
    if (state.returned.size > 0) return { state: 'Returned', editable: true };
    if (!state.submitted) return { state: 'Draft', editable: true };
    return { state: 'Pending', editable: false };
};

// The reviewer roles that must act now (empty when nothing awaits a reviewer: not submitted,
// returned and waiting for the instructor, or fully approved). The Dean is pending only once
// both required reviewers have accepted.
const pendingReviewerRoles = (logs = []) => {
    const state = deriveReviewState(logs);
    if (!state.submitted || state.approved || state.returned.size > 0) return [];
    if (state.withProgramHead) return ['PROGRAM_HEAD'];
    const waiting = REQUIRED_REVIEWERS.filter(role => !state.accepted.has(role));
    return waiting.length > 0 ? waiting : ['DEAN'];
};

// Whether an actor may append the requested workflow event.
const validateWorkflowTransition = (logs = [], actorRole, actionType) => {
    const state = deriveReviewState(logs);
    if (state.approved) {
        return { allowed: false, error: 'This learning plan is already fully approved.' };
    }

    // A Dean return waiting on the Program Head: only the Program Head forwards it or counters it.
    if (state.withProgramHead) {
        return actorRole === 'PROGRAM_HEAD' && ['FORWARDED', 'COUNTERED'].includes(actionType)
            ? { allowed: true }
            : { allowed: false, error: 'The Dean returned this plan to the Program Head, who forwards it to the instructor or sends it back to the Dean.' };
    }
    if (['FORWARDED', 'COUNTERED'].includes(actionType)) {
        return { allowed: false, error: 'There is no Dean return waiting for the Program Head.' };
    }

    if (actorRole === 'INSTRUCTOR') {
        return actionType === 'SUBMITTED' && (!state.submitted || state.returned.size > 0)
            ? { allowed: true }
            : { allowed: false, error: 'The learning plan can only be submitted initially or after it is returned.' };
    }

    if (!DECIDING_ROLES.has(actorRole)) {
        return { allowed: false, error: 'This role cannot perform a workflow action.' };
    }
    if (!state.submitted) {
        return { allowed: false, error: 'The instructor must submit the learning plan before reviewers can act.' };
    }
    if (!['ACCEPTED', 'RETURNED'].includes(actionType)) return { allowed: false };

    if (actorRole === 'DEAN') {
        if (state.returned.size > 0) {
            return { allowed: false, error: 'The instructor must resubmit the returned learning plan before the Dean can act.' };
        }
        if (!state.reviewersDone) {
            return { allowed: false, error: 'Both the Library Director and the Program Head must accept the learning plan before the Dean can act.' };
        }
        return { allowed: true };
    }

    if (actionType === 'ACCEPTED' && state.returned.size > 0) {
        return { allowed: false, error: 'This plan was returned to the instructor. It can be accepted after the instructor resubmits it.' };
    }
    if (state.accepted.has(actorRole)) {
        return { allowed: false, error: 'This reviewer has already accepted the current submission.' };
    }
    if (state.returned.has(actorRole)) {
        return { allowed: false, error: 'This reviewer has already returned the plan; it is waiting for the instructor to resubmit.' };
    }
    return { allowed: true };
};

module.exports = { REQUIRED_REVIEWERS, DECIDING_ROLES, deriveReviewState, planEditState, pendingReviewerRoles, validateWorkflowTransition };
