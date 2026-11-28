'use strict';

const { toKebabRole } = require('../utils/roles');

const ALL_SECTIONS = Object.freeze(['details', 'alignment', 'coverage', 'references', 'criteria', 'revisions', 'coaep']);

const ROLE_SECTIONS = Object.freeze({
  instructor: ALL_SECTIONS,
  'program-head': ALL_SECTIONS,
  dean: ALL_SECTIONS,
  vpaa: ['details', 'alignment', 'coverage', 'references', 'criteria', 'revisions', 'coaep'],
  'director-of-libraries': ['references', 'details', 'revisions'],
  'industry-consultant': ['details', 'alignment', 'coverage'],
  superuser: [],
});

// Strict review UI section filter (matches M3 sectionAccess.js)
const REVIEW_SECTIONS = Object.freeze({
  'director-of-libraries': ['references'],
  'industry-consultant': ['details', 'alignment', 'coverage'],
  'program-head': ['details', 'alignment', 'coverage', 'references', 'criteria'],
  dean: ['details', 'alignment', 'coverage', 'references', 'criteria'],
  vpaa: ['details', 'alignment', 'coverage', 'references', 'criteria'],
  instructor: ['details', 'alignment', 'coverage', 'references', 'criteria'],
});

function canAccessSection(role, section) {
  const k = toKebabRole(role);
  const allowed = ROLE_SECTIONS[k] || [];
  return allowed.includes(section);
}

function getReviewSections(role) {
  const k = toKebabRole(role);
  return REVIEW_SECTIONS[k] || [];
}

module.exports = {
  ALL_SECTIONS,
  ROLE_SECTIONS,
  REVIEW_SECTIONS,
  canAccessSection,
  getReviewSections,
};
