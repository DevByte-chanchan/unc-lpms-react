// Guards the submission → approver-queue hand-off: the instructor writes the
// workflow under the course code the approver page reads back. The instructor
// route (/courses/:pcId/:revNum/:status) carries no code, so SyllabusSections
// resolves it from /api/course-details before writing; if that regresses, the
// write silently disappears and the approver sees a default workflow.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const { setWorkflow, getWorkflow, startSubmissionRound } = await import('./workflowHelpers.js');

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

const submittedWorkflow = (courseCode) => ({
  courseCode,
  currentStage: 'parallel_review',
  submittedAt: new Date().toISOString(),
  parallelReview: {
    library_director: { status: 'pending', completedAt: null },
    industry_consultant: { status: 'pending', completedAt: null },
    program_head: { status: 'pending', completedAt: null }
  },
  programHead: { status: 'pending', completedAt: null },
  dean: { status: 'pending', completedAt: null }
});

test('a workflow written under a blank code is dropped', () => {
  setWorkflow('', submittedWorkflow(''));
  if (getWorkflow('').submittedAt) throw new Error('Blank-code writes are silently discarded — this is the bug');
});

test('a submitted plan is readable under the code the approver page uses', () => {
  // 'BIT313L' is what GET /api/course-details/1/1 returns and what
  // ApprovalCoursesTable puts in the approver URL (course_no).
  setWorkflow('BIT313L', submittedWorkflow('BIT313L'));
  const wf = getWorkflow('BIT313L');
  if (wf.currentStage !== 'parallel_review') throw new Error('Approver should see the submitted stage');
  if (!wf.submittedAt) throw new Error('Approver should see the submission timestamp');
  if (wf.parallelReview.program_head.status !== 'pending') throw new Error('Program head should be pending');
});

test('resubmission starts a fresh reviewer round instead of carrying old approvals forward', () => {
  if (typeof startSubmissionRound !== 'function') throw new Error('the shared resubmission policy is missing');
  const previous = submittedWorkflow('BIT313L');
  previous.currentStage = 'returned';
  previous.parallelReview.library_director = { status: 'done', completedAt: '2026-08-01T00:00:00.000Z' };
  previous.parallelReview.program_head = { status: 'done', completedAt: '2026-08-02T00:00:00.000Z' };
  previous.programHead = { status: 'done', completedAt: '2026-08-02T00:00:00.000Z' };

  const next = startSubmissionRound(previous, 'BIT313L', '2026-08-30T00:00:00.000Z');
  for (const reviewer of Object.values(next.parallelReview)) {
    if (reviewer.status !== 'pending' || reviewer.completedAt !== null) {
      throw new Error('every parallel reviewer must decide again after resubmission');
    }
  }
  if (next.dean.status !== 'pending') throw new Error('the Dean must wait for the new review round');
});
