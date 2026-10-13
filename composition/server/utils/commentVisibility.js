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
    return isApprover(user.role) ? isOwnComment(user, comment) : true;
};

const filterComments = (user, comments) => comments.filter(comment => canSeeComment(user, comment));

module.exports = { COMMENT_ROLE_BY_ACCOUNT, isApprover, isOwnComment, canSeeComment, filterComments };
