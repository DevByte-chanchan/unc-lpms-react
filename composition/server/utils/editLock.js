'use strict';

// A learning plan is editable only while the instructor owns it: before the first
// submission, or after a reviewer returned it. Pending and approved plans are locked.
// The rule itself is part of the approval chain, in workflowRules.js, so "can resubmit"
// and "can edit" can never disagree.
const { planEditState } = require('./workflowRules');

const lockMessage = state =>
    `This learning plan is ${state.toLowerCase()} and cannot be edited. Edits are allowed only while it is a draft or has been returned.`;

module.exports = { planEditState, lockMessage };
