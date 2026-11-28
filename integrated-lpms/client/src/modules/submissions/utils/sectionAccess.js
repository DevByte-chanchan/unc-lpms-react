// Which sections of a learning plan each approver sees on the approval screen. This mirrors
// server/config/sectionAccess.js, which is the rule that is enforced: the server refuses a
// restricted role's requests for any other part. The names here are the screen's section names.
//
// The Director of Libraries checks the references; the Industry Consultant checks the content and
// the course coverage. Every other role sees every section.

const ROLE_SECTIONS = {
  'director-of-libraries': ['References Summary'],
  'industry-consultant': ['Course Details', 'Course and Program Outcome Alignment', 'Course Coverage']
}

const isRestricted = (role) => Object.hasOwn(ROLE_SECTIONS, role)

// `all` is the screen's full ordered list; the result keeps that order.
export const sectionsForRole = (role, all) => (isRestricted(role) ? all.filter(name => ROLE_SECTIONS[role].includes(name)) : [...all])

// The whole-plan documents (the exported syllabus, the revision history) need every section.
export const canSeeWholePlan = (role) => !isRestricted(role)
