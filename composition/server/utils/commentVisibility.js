'use strict';

const { canViewComment } = require('../config/sectionAccess');

// The approver rule: each approver sees only the comments they wrote, so one reviewer's comments
// never reach another (and a review cannot be copied from a colleague's). The instructor, whose
// plan is being reviewed, sees every comment on it; so does the VPAA, who reads approved plans only.
// Within that, an approver who covers only part of a plan sees only that part (config/sectionAccess.js).

// The role recorded on a comment, for each approver's account role.
const COMMENT_ROLE_BY_ACCOUNT = Object.freeze({
    'program-head': 'PROGRAM_HEAD',
    'director-of-libraries': 'LIBRARY_DIRECTOR',
    'industry-consultant': 'INDUSTRY_CONSULTANT',
    dean: 'DEAN'
});

const isApprover = (role) => Object.hasOwn(COMMENT_ROLE_BY_ACCOUNT, role);

// The Dean decides last, and reads the other approvers' comments before deciding (owner's decision, Nov 2026).
// Every other approver sees only their own while the plan is under review.
const seesEveryComment = (role) => role === 'dean';

// Who wrote it: the account when it was recorded, otherwise (older rows that only kept a role,
// and that could not be traced to one account) anyone holding that role.
const isOwnComment = (user, comment) => {
    if (!user || !comment) return false;
    if (comment.commenter_user_id != null) return String(comment.commenter_user_id) === String(user.id ?? user.user_id);
    return isApprover(user.role) && comment.commenter_role === COMMENT_ROLE_BY_ACCOUNT[user.role];
};

const canSeeComment = (user, comment) => {
    if (!user) return false;
    if (!canViewComment(user.role, comment)) return false;
    if (seesEveryComment(user.role)) return true;
    // A Dean return goes to the Program Head first, so the Program Head reads the Dean's comments.
    if (user.role === 'program-head' && comment.commenter_role === 'DEAN') return true;
    return isApprover(user.role) ? isOwnComment(user, comment) : true;
};

const filterComments = (user, comments) => comments.filter(comment => canSeeComment(user, comment));

// The review record is the accreditation document. While a plan is under review it follows the same rule
// as the comment lists, so it cannot be used to read a colleague's comments. Once the plan is approved
// (or is the carry-over of an approved plan) an approver gets the whole record of the part they cover.
const canSeeRecordComment = (user, comment, { approved = false } = {}) => {
    if (!user || !canViewComment(user.role, comment)) return false;
    return approved || !isApprover(user.role) || seesEveryComment(user.role) ? true : isOwnComment(user, comment);
};

// While a Dean return waits on the Program Head, the instructor does not see the Dean's new comments yet: they
// reach the instructor with the forward. `state` is deriveReviewState(logs); `lastForwardAt` the latest FORWARDED.
const withoutHeldDeanComments = (user, rows, state, lastForwardAt = null) => {
    if (user?.role !== 'instructor' || !state?.withProgramHead) return rows;
    const cutoff = lastForwardAt ? new Date(lastForwardAt).getTime() : -Infinity;
    return rows.filter(row => row.commenter_role !== 'DEAN' || new Date(row.createdAt).getTime() <= cutoff);
};

module.exports = { COMMENT_ROLE_BY_ACCOUNT, isApprover, seesEveryComment, withoutHeldDeanComments, isOwnComment, canSeeComment, canSeeRecordComment, filterComments };
