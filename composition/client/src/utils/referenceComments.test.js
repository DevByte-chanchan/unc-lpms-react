// Runnable self-check for the References Summary badge counts —
// `node src/utils/referenceComments.test.js` from client/. The rows below are
// the real shapes /api/comments/filter/:iloId/references and /api/ilos/:pcId/
// :revNum return on the running server for course 1/1.

const { unresolvedCountsByReference, iloIdsFromCourse } = await import('./referenceComments.js');

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

// GET /api/comments/filter/1/references — one comment, one row per target.
const ILO1_ROWS = [
  { comment_id: 30, commenter_role: 'PROGRAM_HEAD', message: 'mali po ', resolved_status: 0, ilo_id: 1, comment_for: 'references', target_id: 1 },
  { comment_id: 30, commenter_role: 'PROGRAM_HEAD', message: 'mali po ', resolved_status: 0, ilo_id: 1, comment_for: 'references', target_id: 2 },
  { comment_id: 30, commenter_role: 'PROGRAM_HEAD', message: 'mali po ', resolved_status: 0, ilo_id: 1, comment_for: 'references', target_id: 3 }
];

// GET /api/comments/filter/27/references — ILO 27, whose targets are 39 and 40.
const ILO27_ROWS = [
  { comment_id: 31, resolved_status: 0, ilo_id: 27, comment_for: 'references', target_id: 39 },
  { comment_id: 31, resolved_status: 0, ilo_id: 27, comment_for: 'references', target_id: 40 }
];

test('a comment is counted against the reference it targets, not the ILO number', () => {
  const counts = unresolvedCountsByReference([...ILO1_ROWS, ...ILO27_ROWS]);
  eq(counts[1], 1, 'reference 1 was commented on once');
  eq(counts[2], 1, 'reference 2 was commented on once');
  eq(counts[3], 1, 'reference 3 was commented on once');
  eq(counts[39], 1, 'reference 39 carries ILO 27’s comment');
  eq(counts[40], 1, 'reference 40 carries ILO 27’s comment');
  // Reference 27 is "UNC Student Handbook". ILO 27's comment is not about it —
  // that is exactly the badge the old per-reference fetch put there.
  eq(counts[27], undefined, 'reference 27 is not badged for sharing a number with ILO 27');
});

test('one comment spanning several targets is not counted several times', () => {
  const repeated = [
    { comment_id: 30, resolved_status: 0, target_id: 5 },
    { comment_id: 30, resolved_status: 0, target_id: 5 },
    { comment_id: 30, resolved_status: 0, target_id: 5 },
    { comment_id: 44, resolved_status: false, target_id: 5 }
  ];
  eq(unresolvedCountsByReference(repeated)[5], 2, 'distinct comment_ids, not rows');
});

test('resolved comments and rows with no target are left out', () => {
  const mixed = [
    { comment_id: 1, resolved_status: 1, target_id: 8 },
    { comment_id: 2, resolved_status: true, target_id: 8 },
    { comment_id: 3, resolved_status: 0, target_id: null },
    { comment_id: 4, resolved_status: 'false', target_id: 9 }
  ];
  const counts = unresolvedCountsByReference(mixed);
  eq(counts[8], undefined, 'a resolved comment raises no badge');
  eq(counts[9], 1, 'a string "false" still counts as unresolved');
  eq(Object.keys(counts).length, 1, 'a row with no target is skipped');
});

test('the ILO ids come out of the course payload the summary already has access to', () => {
  const payload = {
    course: { course_id: 1, course_no: 'BIT313L' },
    courseOutcomes: [
      { co_id: 1, ilos: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      { co_id: 2, ilos: [{ id: 4 }] },
      { co_id: 3 }
    ]
  };
  eq(iloIdsFromCourse(payload).join(','), '1,2,3,4', 'every ILO of the course');
  eq(iloIdsFromCourse(null).length, 0, 'a failed fetch yields nothing to query');
});

console.log('\nAll reference comment checks passed.');
