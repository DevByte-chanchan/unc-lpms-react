export const testRefs = [
  { id: 'TB-DEP-001', numericId: 9991, title: 'Test Ref', type: 'Textbook', year: 2009, authors: 'Test', isbn: '', publisher: '', uploadDate: '2015-01-01', hasIssue: false, archived: false, departments: [], programs: [], usedInCourses: [] },
  { id: 'OR-ISS-001', numericId: 9992, title: 'Test Ref 2', type: 'Online Resources', year: 2014, authors: 'Test', isbn: '', link: '', publisher: '', uploadDate: '2016-01-01', hasIssue: true, archived: false, departments: [], programs: [], usedInCourses: [] },
  { id: 'OE-DEP-002', numericId: 9993, title: 'Test Ref 3', type: 'Open Educational Resources', year: 2010, authors: 'Test', isbn: '', link: '', publisher: '', uploadDate: '2012-01-01', hasIssue: false, archived: false, departments: [], programs: [], usedInCourses: [] },
  { id: 'TB-VOLD-001', numericId: 10001, title: 'Test Ref 4', type: 'Textbook', year: 1978, authors: 'Test', isbn: '', publisher: '', uploadDate: '1985-01-01', hasIssue: false, archived: false, departments: [], programs: [], usedInCourses: [] },
  { id: 'NUR-OBS-001', numericId: 10002, title: 'Test Ref 5', type: 'Online Resources', year: 1999, authors: 'Test', isbn: '', link: '', publisher: '', uploadDate: '2001-01-01', hasIssue: true, archived: false, departments: [], programs: [], usedInCourses: [] },
]

export const workflow = (overrides = {}) => ({
  courseCode: 'BSCS331L',
  currentStage: 'submitted',
  submittedAt: new Date().toISOString(),
  parallelReview: {
    library_director: { status: 'pending', completedAt: null },
    industry_consultant: { status: 'pending', completedAt: null },
    program_head: { status: 'pending', completedAt: null }
  },
  programHead: { status: 'pending', completedAt: null },
  dean: { status: 'pending', completedAt: null },
  ...overrides
})
