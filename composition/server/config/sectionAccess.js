'use strict';

// Which parts of a learning plan each approver may read or comment on.
//
// The Dean's rule (interview): the Director of Libraries checks the resources, the Industry
// Consultant checks the content and the course coverage, and each sees only that portion of the
// review. The Program Head and the Dean review the whole plan, and so do the roles that are not
// listed here (instructor, VPAA, superuser). Like config/permissions.js this is the single place
// that says it; the client mirrors it in src/utils/sectionAccess.js only to hide what the server
// would refuse.

const SECTIONS = Object.freeze({
    details: 'Course Details',
    alignment: 'Course and Program Outcome Alignment',
    coverage: 'Course Coverage',
    references: 'References',
    criteria: 'Criteria for Grading'
});

// Only the restricted roles are listed. Anyone else may see every section.
const ROLE_SECTIONS = Object.freeze({
    'director-of-libraries': Object.freeze(['references']),
    'industry-consultant': Object.freeze(['details', 'alignment', 'coverage'])
});

const hasRestriction = (role) => Object.hasOwn(ROLE_SECTIONS, role);

const allowedSections = (role) => (hasRestriction(role) ? [...ROLE_SECTIONS[role]] : Object.keys(SECTIONS));

const canViewSection = (role, section) => allowedSections(role).includes(section);

const canViewAnySection = (role, sections) => sections.some(section => canViewSection(role, section));

const hasFullAccess = (role) => !hasRestriction(role);

// A comment belongs to the part of the plan it is about. Comments on references are about the
// References section; comments on topics, activities or a CO/ILO are about the course coverage.
const sectionOfComment = (comment) => (comment && comment.comment_for === 'references' ? 'references' : 'coverage');

const canViewComment = (role, comment) => canViewSection(role, sectionOfComment(comment));

module.exports = {
    SECTIONS,
    ROLE_SECTIONS,
    allowedSections,
    canViewSection,
    canViewAnySection,
    hasFullAccess,
    sectionOfComment,
    canViewComment
};
