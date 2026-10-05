'use strict';

// The approval chain, as one pure state machine over a plan's workflow log.
//
//   instructor submits -> Library Director and Program Head review in parallel
//                      -> the Dean acts only after BOTH have accepted.
//
// The Industry Consultant is not part of the chain: they may read and comment, but never
// accept or return, so any consultant entry in an old log is ignored here.
//
// A return goes back to the instructor and resumes at the step that returned it. When the
// instructor resubmits, only the reviewer(s) who returned the plan review it again;
// acceptances already given still count. If the Dean returned it, it goes back to the Dean
// only. The same rules are mirrored on the client in utils/workflowFromLogs.js.

const REQUIRED_REVIEWERS = ['LIBRARY_DIRECTOR', 'PROGRAM_HEAD'];
const DECIDING_ROLES = new Set([...REQUIRED_REVIEWERS, 'DEAN']);

// logs: AssignmentWorkflowLog rows in chronological order.
const deriveReviewState = (logs = []) => {
    const accepted = new Set();
    const returned = new Set();
    let submitted = false;

    for (const entry of Array.isArray(logs) ? logs : []) {
        if (entry.actor_role === 'INSTRUCTOR' && entry.action_type === 'SUBMITTED') {
            if (!submitted) {
                submitted = true;
                accepted.clear();
            }
            // Resubmission: whoever returned it must decide again; nobody else's decision is lost.
            returned.clear();
        } else if (DECIDING_ROLES.has(entry.actor_role)) {
            if (['ACCEPTED', 'APPROVED'].includes(entry.action_type)) {
                accepted.add(entry.actor_role);
                returned.delete(entry.actor_role);
            } else if (entry.action_type === 'RETURNED') {
                returned.add(entry.actor_role);
                accepted.delete(entry.actor_role);
            }
        }
    }

    return {
        submitted,
        accepted,
        returned,
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

// Whether an actor may append the requested workflow event.
const validateWorkflowTransition = (logs = [], actorRole, actionType) => {
    const state = deriveReviewState(logs);
    if (state.approved) {
        return { allowed: false, error: 'This learning plan is already fully approved.' };
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

    if (state.accepted.has(actorRole)) {
        return { allowed: false, error: 'This reviewer has already accepted the current submission.' };
    }
    if (state.returned.has(actorRole)) {
        return { allowed: false, error: 'This reviewer has already returned the plan; it is waiting for the instructor to resubmit.' };
    }
    return { allowed: true };
};

module.exports = { REQUIRED_REVIEWERS, DECIDING_ROLES, deriveReviewState, planEditState, validateWorkflowTransition };
