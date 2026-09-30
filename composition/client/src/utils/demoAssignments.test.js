// Runnable self-check for the approvers-table demo rows —
// `node src/utils/demoAssignments.test.js` from client/.
//
// The point of these rows is that the table cannot tell them apart from server
// rows, so the checks below run the table's OWN status logic over them rather
// than trusting the shape by eye.

const { buildDemoAssignments, withDemoFallback, isDemoRow } = await import('./demoAssignments.js');
const { DEMO_COURSES_BY_STATUS } = await import('./demoCourses.js');

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

// Copied verbatim from ApprovalCoursesTable.jsx — if the table's rule changes
// and these rows stop landing in the right tab, this test is the alarm.
const computeOverallStatus = (row) => {
  const logs = row.logs || [];
  const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
  if (latestLog && latestLog.action_type === 'RETURNED') return 'Returned';
  if (latestLog && latestLog.action_type === 'ACCEPTED' && latestLog.actor_role === 'DEAN') return 'Approved';
  const hasBeenSubmitted = row.date_submitted !== null ||
    logs.some(log => log.action_type === 'SUBMITTED' || log.action_type === 'ACCEPTED');
  if (hasBeenSubmitted) return 'Pending';
  return 'Draft';
};

const getCode = (row) => {
  const pco = row.ProgramCourseOffering || {};
  const course = pco.Course || {};
  return course.course_no || course.code || course.course_id || pco.course_id || row.pc_offering_id || row.code || '-';
};

const getName = (row) => {
  const pco = row.ProgramCourseOffering || {};
  const course = pco.Course || {};
  return course.course_title || course.title || course.name || pco.course_description || row.name || '-';
};

const NOW = new Date('2026-08-11T00:00:00Z');
const rows = buildDemoAssignments(NOW);

test('every demo course in the module\'s source of truth gets a row', () => {
  const expected = ['pending', 'returned', 'approved']
    .flatMap(s => DEMO_COURSES_BY_STATUS[s] || []);
  eq(rows.length, expected.length, 'row count');
  expected.forEach(code => {
    if (!rows.some(r => getCode(r) === code)) throw new Error(`${code} has no row`);
  });
  // Draft is the instructor's tab; approvers never see it, so it is not seeded.
  DEMO_COURSES_BY_STATUS.draft.forEach(code => {
    if (rows.some(r => getCode(r) === code)) throw new Error(`${code} is a draft and must not reach the approvers' table`);
  });
});

test('the table\'s own status rule sorts each row into the tab it was built for', () => {
  const byStatus = (want) => rows.filter(r => computeOverallStatus(r) === want).map(getCode).sort();
  const expect = (key) => [...DEMO_COURSES_BY_STATUS[key]].sort();

  eq(byStatus('Pending').join(','), expect('pending').join(','), 'Pending tab');
  eq(byStatus('Returned').join(','), expect('returned').join(','), 'Returned tab');
  eq(byStatus('Approved').join(','), expect('approved').join(','), 'Approved tab');
  eq(byStatus('Draft').length, 0, 'nothing falls through to Draft');
});

test('a pending row is genuinely mid-review, not silently approved', () => {
  rows.filter(r => computeOverallStatus(r) === 'Pending').forEach(r => {
    if (!r.date_submitted) throw new Error(`${getCode(r)} is pending but was never submitted`);
    if (r.date_approved) throw new Error(`${getCode(r)} is pending but carries a date approved`);
    // A Dean acceptance would flip it to Approved — the row must not have one.
    if (r.logs.some(l => l.actor_role === 'DEAN')) throw new Error(`${getCode(r)} has a Dean action while pending`);
  });
  // Some, but not all, pending rows show a reviewer who has already accepted,
  // so the approver-chain popup is not uniformly blank.
  const withEarlyAccept = rows.filter(r => computeOverallStatus(r) === 'Pending' && r.logs.length > 1);
  if (withEarlyAccept.length === 0) throw new Error('no pending row shows any review progress');
  if (withEarlyAccept.length === rows.filter(r => computeOverallStatus(r) === 'Pending').length) {
    throw new Error('every pending row shows progress — a just-submitted plan should be represented too');
  }
});

test('an approved row carries the Dean\'s date, a returned row carries none', () => {
  rows.filter(r => computeOverallStatus(r) === 'Approved').forEach(r => {
    if (!r.date_approved) throw new Error(`${getCode(r)} is approved with no date approved`);
    const dean = r.logs.find(l => l.actor_role === 'DEAN');
    eq(dean.createdAt, r.date_approved, `${getCode(r)} date approved matches the Dean's action`);
  });
  rows.filter(r => computeOverallStatus(r) === 'Returned').forEach(r => {
    if (r.date_approved) throw new Error(`${getCode(r)} was returned but carries a date approved`);
  });
});

test('a row reads correctly through the retained assignment status accessors too', () => {
  // The retained assignment status accessors read the code off the TOP level, not out of
  // ProgramCourseOffering — one set of rows has to serve both screens.
  const dashCode = (row) =>
    row.course_no || row.code || row.course_id || row.pc_offering_id || row.course?.code || '-';
  rows.forEach(r => {
    eq(dashCode(r), getCode(r), 'the dashboard and the table agree on the course code');
    if (!(r.course_name || r.name)) throw new Error(`${getCode(r)} has no top-level course name`);
    if (!r.instructor) throw new Error(`${getCode(r)} has no instructor, so "who has not submitted" would be blank`);
  });
});

test('every row reads through the table\'s own accessors — no blank cells', () => {
  rows.forEach(r => {
    if (getCode(r) === '-') throw new Error('a row has no course code');
    if (getName(r) === '-') throw new Error(`${getCode(r)} has no course name`);
    if (!r.date_assigned) throw new Error(`${getCode(r)} has no date assigned`);
    const id = (r.ProgramCourseOffering || {}).pc_offering_id;
    if (!id) throw new Error(`${getCode(r)} has no offering id, so its View link would break`);
  });
  // Offering ids are derived from the code, so they are stable across reloads.
  const again = buildDemoAssignments(NOW);
  rows.forEach((r, i) => eq(
    r.ProgramCourseOffering.pc_offering_id,
    again[i].ProgramCourseOffering.pc_offering_id,
    `${getCode(r)} offering id is deterministic`
  ));
});

test('real data always wins — the fallback only fills a genuinely empty table', () => {
  const real = [{ assignment_id: 7, logs: [], date_submitted: null }];
  eq(withDemoFallback(real, NOW).length, 1, 'one real row stays one row');
  eq(withDemoFallback(real, NOW)[0].assignment_id, 7, 'and it is the real one');

  eq(withDemoFallback([], NOW).length, rows.length, 'an empty response falls back');
  eq(withDemoFallback(null, NOW).length, rows.length, 'so does a null response');
  eq(withDemoFallback(undefined, NOW).length, rows.length, 'and an undefined one');

  if (!withDemoFallback([], NOW).every(isDemoRow)) throw new Error('fallback rows must be flagged as demo');
  if (withDemoFallback(real, NOW).some(isDemoRow)) throw new Error('a real row must never be flagged as demo');
});

console.log('\nAll demo assignment checks passed.');
