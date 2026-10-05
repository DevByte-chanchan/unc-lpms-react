'use strict';

// A learning plan is editable only while the instructor owns it: before the
// first submission, or after a reviewer returned the current round. This is
// the same rule validateWorkflowTransition uses to let the instructor resubmit,
// so "can resubmit" and "can edit" never disagree.
//
// `logs` are AssignmentWorkflowLog rows in chronological order.
const planEditState = (logs = []) => {
    const history = Array.isArray(logs) ? logs : [];

    if (history.some(entry => entry.actor_role === 'DEAN' && ['ACCEPTED', 'APPROVED'].includes(entry.action_type))) {
        return { state: 'Approved', editable: false };
    }

    let lastSubmissionIndex = -1;
    history.forEach((entry, index) => {
        if (entry.actor_role === 'INSTRUCTOR' && entry.action_type === 'SUBMITTED') lastSubmissionIndex = index;
    });
    if (lastSubmissionIndex < 0) {
        const returned = history.some(entry => entry.action_type === 'RETURNED');
        return { state: returned ? 'Returned' : 'Draft', editable: true };
    }

    if (history.slice(lastSubmissionIndex + 1).some(entry => entry.action_type === 'RETURNED')) {
        return { state: 'Returned', editable: true };
    }
    return { state: 'Pending', editable: false };
};

const lockMessage = state =>
    `This learning plan is ${state.toLowerCase()} and cannot be edited. Edits are allowed only while it is a draft or has been returned.`;

module.exports = { planEditState, lockMessage };
