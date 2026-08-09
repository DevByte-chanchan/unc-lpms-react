// Runnable self-check for the demo seeder — `node src/utils/demoSeed.test.js`
// from client/. The seeder runs at module load on every page load, so this is
// the guard that a reload never overwrites an approval somebody made.

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const { getWorkflow, setWorkflow, hasWorkflow } = await import('./workflowHelpers.js');
const { seedDemoWorkflowsCanonical } = await import('./demoCourses.js');

const test = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
};

const eq = (actual, expected, what) => {
  if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`);
};

test('an empty store is seeded so the demo tables have data', () => {
  eq(hasWorkflow('BIT201'), false, 'nothing stored yet');
  seedDemoWorkflowsCanonical();
  eq(getWorkflow('BIT201').currentStage, 'submitted', 'the draft course is seeded');
  eq(getWorkflow('IT 411').currentStage, 'approved', 'the approved course is seeded');
});

test('a reload never overwrites an approval that was actually made', () => {
  // What ApprovalSyllabusSections writes when the Dean approves BIT201.
  const approved = {
    courseCode: 'BIT201',
    currentStage: 'approved',
    parallelReview: {
      library_director: { status: 'done', completedAt: '2026-08-01T00:00:00Z' },
      industry_consultant: { status: 'done', completedAt: '2026-08-01T00:00:00Z' },
      program_head: { status: 'done', completedAt: '2026-08-01T00:00:00Z' }
    },
    programHead: { status: 'done', completedAt: '2026-08-01T00:00:00Z' },
    dean: { status: 'done', completedAt: '2026-08-01T00:00:00Z' },
    signatures: [{ role: 'dean', name: 'REYES, AGNES', signedAt: '2026-08-01T00:00:00Z' }]
  };
  setWorkflow('BIT201', approved);

  seedDemoWorkflowsCanonical();   // the next page load

  eq(getWorkflow('BIT201').currentStage, 'approved', 'the approval survived the reload');
  eq(getWorkflow('BIT201').dean.status, 'done', 'the dean stage survived');
  eq((getWorkflow('BIT201').signatures || []).length, 1, 'the signature survived');
});

test('a course the user has never touched is still seeded on the same run', () => {
  store.delete('lpsm_workflow_v1');
  setWorkflow('BIT301', { courseCode: 'BIT301', currentStage: 'returned' });

  seedDemoWorkflowsCanonical();

  eq(getWorkflow('BIT301').currentStage, 'returned', 'the touched course is left alone');
  eq(getWorkflow('BIT201').currentStage, 'submitted', 'the untouched course is filled in');
});

console.log('\nAll demo seeder checks passed.');
