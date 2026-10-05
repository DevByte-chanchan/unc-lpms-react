'use strict';

const { deriveReviewState, planEditState, REQUIRED_REVIEWERS } = require('./workflowRules');

// The accreditation review record of one learning-plan revision: every reviewer comment,
// every workflow action, and who finally approved and when. It is a different document from
// the clean syllabus PDF, which carries no comments.

const ROLE_LABEL = {
    INSTRUCTOR: 'Instructor',
    LIBRARY_DIRECTOR: 'Director of Libraries',
    PROGRAM_HEAD: 'Program Head',
    DEAN: 'Dean',
    INDUSTRY_CONSULTANT: 'Industry Consultant',
};
const ACTION_LABEL = { ASSIGNED: 'Assigned', SUBMITTED: 'Submitted', RETURNED: 'Returned', ACCEPTED: 'Accepted', APPROVED: 'Accepted' };
const SECTION_LABEL = { references: 'References', topics: 'Topics', tlas: 'Teaching & Learning Activities' };

const iso = (value) => (value ? new Date(value).toISOString() : null);

// course: { code, title, term, revisionNumber }
// logs: workflow log rows, oldest first. comments: Comment rows, oldest first.
// iloLabels: Map(ilo_id -> 'CO2-ILO3' | 'Course Orientation'). targetTitles: Map(comment_id -> [title]).
const assembleReviewRecord = ({ course, logs = [], comments = [], iloLabels = new Map(), targetTitles = new Map() }) => {
    const { state } = planEditState(logs);
    const reviewState = deriveReviewState(logs);

    const lastAccept = (role) => [...logs].reverse().find(entry =>
        entry.actor_role === role && ['ACCEPTED', 'APPROVED'].includes(entry.action_type));

    const approvers = [...REQUIRED_REVIEWERS, 'DEAN'].map(role => {
        const entry = reviewState.accepted.has(role) ? lastAccept(role) : null;
        return {
            role,
            roleLabel: ROLE_LABEL[role],
            name: entry?.actor_name || null,
            date: iso(entry?.createdAt),
            accepted: !!entry,
        };
    });
    const deanEntry = reviewState.approved ? lastAccept('DEAN') : null;

    return {
        course,
        status: { state, approved: reviewState.approved, approvedAt: iso(deanEntry?.createdAt) },
        approvers,
        actions: logs.map(entry => ({
            name: entry.actor_name || null,
            role: entry.actor_role,
            roleLabel: ROLE_LABEL[entry.actor_role] || entry.actor_role,
            action: ACTION_LABEL[entry.action_type] || entry.action_type,
            date: iso(entry.createdAt),
            // The Industry Consultant is not part of the approval chain; any old entry is history only.
            inChain: entry.actor_role !== 'INDUSTRY_CONSULTANT',
        })),
        comments: comments.map(comment => ({
            reviewerName: comment.commenter_name || null,
            role: comment.commenter_role,
            roleLabel: ROLE_LABEL[comment.commenter_role] || comment.commenter_role,
            section: SECTION_LABEL[comment.comment_for] || 'General',
            location: iloLabels.get(comment.ilo_id) || '',
            targets: targetTitles.get(comment.comment_id) || [],
            message: comment.message,
            date: iso(comment.createdAt),
            resolved: !!comment.resolved_status,
            resolvedDate: iso(comment.resolved_date),
            // Documentation only: never part of the approval decision.
            documentationOnly: comment.commenter_role === 'INDUSTRY_CONSULTANT',
        })),
    };
};

module.exports = { ROLE_LABEL, assembleReviewRecord };
