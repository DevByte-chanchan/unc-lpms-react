export const ROLE_CANONICAL_MAP = {
  vpaa: 'VPAA',
  ovpaa: 'VPAA',
  dean: 'Dean',
  program_head: 'Program Head',
  'program head': 'Program Head',
  'program-head': 'Program Head',
  director_of_libraries: 'Director of Libraries',
  'director of libraries': 'Director of Libraries',
  'director-of-libraries': 'Director of Libraries',
  library_director: 'Director of Libraries',
  librarian: 'Director of Libraries',
  instructor: 'Instructor',
  faculty: 'Instructor',
  industry_consultant: 'Industry Consultant',
  'industry consultant': 'Industry Consultant',
  'industry-consultant': 'Industry Consultant',
  consultant: 'Industry Consultant',
  superuser: 'Superuser',
};

export const ROLE_DESCRIPTIONS = {
  Instructor: 'Write and manage learning plans for the courses assigned to you.',
  'Program Head': 'Manage course offerings, assignments, consultants, documents, and plan reviews.',
  Dean: 'Manage faculty, programs, department vision & mission, and final plan approvals.',
  VPAA: 'Manage academic terms, departments, university VMGO, approved plans, and accounts.',
  'Director of Libraries': 'Manage the reference library and review references in submitted plans.',
  'Industry Consultant': 'Review and endorse approved learning plans for the courses you consult on.',
  Superuser: 'Manage user accounts and system-wide access.',
};

export function normalizeRoleName(role) {
  if (!role) return null;
  const key = String(role).trim().toLowerCase();
  return ROLE_CANONICAL_MAP[key] || String(role).trim();
}

export function getDefaultRouteForRole(role) {
  switch (normalizeRoleName(role)) {
    case 'VPAA':
      return '/vpaa/academic-terms';
    case 'Dean':
      return '/dean/faculty';
    case 'Program Head':
      return '/program-head/course-offerings';
    case 'Director of Libraries':
      return '/library/dashboard';
    case 'Instructor':
      return '/instructor/dashboard';
    case 'Industry Consultant':
      return '/consultant/learning-plans';
    case 'Superuser':
      return '/vpaa/user-accounts';
    default:
      return '/instructor/dashboard';
  }
}

/**
 * Single cohesive, badge-free sidebar navigation list per role.
 * ZERO artificial per-module headings or module tags.
 */
export const SIDEBAR_ITEMS = {
  VPAA: [
    { label: 'Academic Terms', path: '/vpaa/academic-terms', icon: 'calendar' },
    { label: 'Department List', path: '/vpaa/departments', icon: 'building' },
    { label: 'University VMGO', path: '/vpaa/university-vmgo', icon: 'award' },
    { label: 'Approved Plans', path: '/vpaa/approved-plans', icon: 'fileText', matchPaths: ['/vpaa/approved-plans', '/submissions/review'] },
    { label: 'User Accounts', path: '/vpaa/user-accounts', icon: 'users' },
  ],
  Dean: [
    { label: 'Faculty', path: '/dean/faculty', icon: 'users' },
    { label: 'Programs', path: '/dean/programs', icon: 'layers' },
    { label: 'Vision & Mission', path: '/dean/vision-mission', icon: 'award' },
    { label: 'Learning Plans', path: '/dean/learning-plans', icon: 'fileText', matchPaths: ['/dean/learning-plans', '/submissions/review'] },
    { label: 'User Accounts', path: '/dean/user-accounts', icon: 'userCheck' },
  ],
  'Program Head': [
    { label: 'Course Offerings', path: '/program-head/course-offerings', icon: 'book' },
    { label: 'Course Assignment', path: '/program-head/course-assignments', icon: 'clipboard', matchPaths: ['/program-head/course-assignments', '/program-head/course-assignment'] },
    { label: 'Industry Consultants', path: '/program-head/industry-consultants', icon: 'briefcase' },
    { label: 'Program Documents', path: '/program-head/program-documents', icon: 'folder' },
    { label: 'Learning Plans', path: '/program-head/learning-plans', icon: 'fileText', matchPaths: ['/program-head/learning-plans', '/submissions/review'] },
  ],
  'Director of Libraries': [
    { label: 'Dashboard', path: '/library/dashboard', icon: 'grid' },
    { label: 'Reference Library', path: '/library/references', icon: 'bookOpen', matchPaths: ['/library/references', '/library/add-reference', '/library/view-reference', '/library/edit-reference'] },
    { label: 'Learning Plans', path: '/library/learning-plans', icon: 'fileText', matchPaths: ['/library/learning-plans', '/submissions/review'] },
  ],
  Instructor: [
    { label: 'Dashboard', path: '/instructor/dashboard', icon: 'grid' },
    { label: 'Learning Plans', path: '/instructor/assigned-courses', icon: 'fileText', matchPaths: ['/instructor/assigned-courses', '/courses'] },
  ],
  'Industry Consultant': [
    { label: 'Learning Plans', path: '/consultant/learning-plans', icon: 'fileText', matchPaths: ['/consultant/learning-plans', '/submissions/review'] },
  ],
  Superuser: [
    { label: 'User Accounts', path: '/vpaa/user-accounts', icon: 'users' },
  ],
};

// Backwards-compatible alias for any callers importing SIDEBAR_CONFIG
export const SIDEBAR_CONFIG = SIDEBAR_ITEMS;
