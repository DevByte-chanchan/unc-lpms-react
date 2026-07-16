// ============================================================================
// SINGLE SOURCE OF TRUTH for the Assigned Courses / Learning Plan tables.
//
// Every role sees the SAME courses in the SAME status tabs. The only
// difference is which tabs a role is allowed to see:
//   - instructor : Draft, Pending, Returned, Approved
//   - approvers  : Pending, Returned, Approved   (no Draft)
//   - vpaa       : Approved only
//
// Course DETAIL and COMMENTS still load from the backend by course code —
// this module only decides the list + which tab each course lives in.
// ============================================================================
import { getSyllabi } from './dataStore.js';
import { setWorkflow } from './workflowHelpers.js';

// 4 courses per status tab (16 total). All exist in syllabiData (enriched) and
// are seeded in the DB by seeders/populate_full_syllabi.js.
export const DEMO_COURSES_BY_STATUS = {
  draft:    ['BIT201', 'BIT301', 'BSCS513', 'IT 312'],
  pending:  ['BSCS511', 'BIT202', 'BSCS502', 'IT 321'],
  returned: ['BSCS515', 'BIT304', 'BSCS508', 'IT 402'],
  approved: ['IT 411', 'BIT203', 'BSCS504', 'IT 305'],
};

export const STATUS_BY_CODE = (() => {
  const m = {};
  for (const [status, codes] of Object.entries(DEMO_COURSES_BY_STATUS)) {
    codes.forEach((c) => { m[c] = status; });
  }
  return m;
})();

const APPROVER_ROLES = ['program-head', 'dean', 'director-of-libraries', 'industry-consultant'];

// Which status tabs a given role is allowed to see.
export function statusesForRole(role) {
  if (role === 'vpaa') return ['approved'];
  if (APPROVER_ROLES.includes(role)) return ['pending', 'returned', 'approved'];
  return ['draft', 'pending', 'returned', 'approved']; // instructor / default
}

const INSTRUCTOR = 'Danny Casimero';
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Build one table row carrying the fixed status plus the date fields the
// approver-chain popup and the DATE columns read.
export function buildRow(code, status) {
  const syl = (getSyllabi() || []).find((s) => s.code === code) || {};
  const program = String(code).startsWith('BSCS') ? 'BSCS' : 'BSIT';
  const row = {
    code,
    name: syl.name || code,
    program,
    instructor: INSTRUCTOR,
    status, // explicit — this is what drives the tab
    date_assigned: syl.update || daysAgo(30),
    date_submitted: null,
    ic_date_accepted: null, ld_date_accepted: null, ph_date_accepted: null, d_date_accepted: null,
    ic_date_returned: null, ld_date_returned: null, ph_date_returned: null, d_date_returned: null,
    date_updated: null,
  };
  if (status === 'pending') {
    row.date_submitted = daysAgo(10);
  } else if (status === 'returned') {
    row.date_submitted = daysAgo(12);
    row.ic_date_accepted = daysAgo(9);
    row.ld_date_returned = daysAgo(6);
    row.date_updated = daysAgo(6);
  } else if (status === 'approved') {
    row.date_submitted = daysAgo(22);
    row.ic_date_accepted = daysAgo(18);
    row.ld_date_accepted = daysAgo(17);
    row.ph_date_accepted = daysAgo(16);
    row.d_date_accepted = daysAgo(6);
  }
  return row;
}

// All rows a role should see (across every tab it is allowed to open).
export function getCoursesForRole(role = 'instructor') {
  const rows = [];
  for (const status of statusesForRole(role)) {
    for (const code of DEMO_COURSES_BY_STATUS[status]) rows.push(buildRow(code, status));
  }
  return rows;
}

// Convenience: the fixed status label for a code, e.g. 'BIT201' -> 'Draft'.
export function statusLabelForCode(code) {
  return cap(STATUS_BY_CODE[code]) || 'Draft';
}

// Seed the workflow store so the approver-chain popup and the syllabus detail
// page reflect the same fixed statuses as the tables.
export function seedDemoWorkflowsCanonical() {
  const done = (n) => ({ status: 'done', completedAt: daysAgo(n) });
  const pend = () => ({ status: 'pending', completedAt: null });

  for (const [code, status] of Object.entries(STATUS_BY_CODE)) {
    let wf;
    if (status === 'draft') {
      wf = { courseCode: code, currentStage: 'submitted',
        parallelReview: { library_director: pend(), industry_consultant: pend(), program_head: pend() },
        programHead: pend(), dean: pend() };
    } else if (status === 'pending') {
      wf = { courseCode: code, currentStage: 'submitted', submittedAt: daysAgo(10),
        parallelReview: { library_director: pend(), industry_consultant: pend(), program_head: pend() },
        programHead: pend(), dean: pend() };
    } else if (status === 'returned') {
      wf = { courseCode: code, currentStage: 'returned', submittedAt: daysAgo(12),
        parallelReview: { library_director: done(6), industry_consultant: done(9), program_head: pend() },
        programHead: pend(), dean: pend() };
    } else {
      wf = { courseCode: code, currentStage: 'approved', submittedAt: daysAgo(22),
        parallelReview: { library_director: done(17), industry_consultant: done(18), program_head: done(16) },
        programHead: done(16), dean: done(6), vpaa: done(2) };
    }
    setWorkflow(code, wf);
  }
}

export default {
  DEMO_COURSES_BY_STATUS,
  STATUS_BY_CODE,
  statusesForRole,
  buildRow,
  getCoursesForRole,
  statusLabelForCode,
  seedDemoWorkflowsCanonical,
};
