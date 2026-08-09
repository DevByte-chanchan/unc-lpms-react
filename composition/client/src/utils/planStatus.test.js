// Runnable self-check for the status tracker, the calendar-derived deadlines
// and the reminders — `node src/utils/planStatus.test.js` from client/.

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const {
  planStatusFor, rollupPlans, nonSubmitters, parseCalendarUpload, deriveDeadlines,
  deadlineState, buildReminders, pushNotifications, notificationsFor, markNotificationsRead,
  setAcademicCalendar, getAcademicCalendar, DEFAULT_CALENDAR_RULES
} = await import('./planStatus.js');

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

const done = (iso) => ({ status: 'done', completedAt: iso });
const pend = () => ({ status: 'pending', completedAt: null });

const DRAFT = {
  courseCode: 'BIT201', currentStage: 'draft',
  parallelReview: { library_director: pend(), industry_consultant: pend(), program_head: pend() },
  programHead: pend(), dean: pend()
};
const PENDING = { ...DRAFT, courseCode: 'BSCS511', currentStage: 'submitted', submittedAt: '2026-07-20T00:00:00Z' };
const APPROVED = {
  courseCode: 'IT 411', currentStage: 'approved', submittedAt: '2026-06-01T00:00:00Z',
  parallelReview: { library_director: done('2026-06-10T00:00:00Z'), industry_consultant: done('2026-06-11T00:00:00Z'), program_head: done('2026-06-12T00:00:00Z') },
  programHead: done('2026-06-12T00:00:00Z'), dean: done('2026-06-20T00:00:00Z')
};

test('a plan reports one stage, and the tracker is where it comes from', () => {
  const draft = planStatusFor('BIT201', DRAFT, { instructor: 'NORTON, MONICA' });
  eq(draft.stage, 'draft', 'stage');
  eq(draft.label, 'Draft', 'label');
  eq(draft.submitted, false, 'a draft is not submitted');

  const pending = planStatusFor('BSCS511', PENDING);
  eq(pending.submitted, true, 'a submitted plan is submitted');
  eq(pending.label, 'Pending review', 'label');
  eq(pending.awaiting.length, 4, 'four approvers still owe a decision');

  const approved = planStatusFor('IT 411', APPROVED);
  eq(approved.isFullyApproved, true, 'approved');
  eq(approved.dateApproved, '2026-06-20T00:00:00Z', 'the Dean carries the date approved');
  eq(approved.awaiting.length, 0, 'nobody is outstanding');
});

test('the roll-up and the non-submitter list answer the program head directly', () => {
  const plans = [
    planStatusFor('BIT201', DRAFT, { instructor: 'NORTON, MONICA' }),
    planStatusFor('BIT301', DRAFT, { instructor: 'CASIMERO, DANNY' }),
    planStatusFor('BSCS511', PENDING, { instructor: 'NORTON, MONICA' }),
    planStatusFor('IT 411', APPROVED, { instructor: 'CASIMERO, DANNY' })
  ];
  const summary = rollupPlans(plans);
  eq(summary.total, 4, 'total');
  eq(summary.notSubmitted, 2, 'two have not submitted [08:16]');
  eq(summary.approved, 1, 'one approved');

  const late = nonSubmitters(plans);
  eq(late.length, 2, 'the list names them');
  eq(late.map(p => p.code).join(','), 'BIT201,BIT301', 'which ones');
});

test('deadlines are derived from the uploaded calendar, not hard-coded', () => {
  // What a spreadsheet upload produces: label/date rows.
  const calendar = parseCalendarUpload([
    ['Term', 'AY2026-2027-1'],
    ['Start of Classes', '2026-08-17'],
    ['Midterm Grade Submission', '2026-10-12'],
    ['Final Grade Submission', '2026-12-14'],
    ['Something Else', '2026-01-01']
  ]);
  eq(calendar.startOfClasses, '2026-08-17', 'start of classes read from the upload');
  eq(calendar.term, 'AY2026-2027-1', 'term');
  eq(parseCalendarUpload([['Nothing', 'here']]), null, 'an unusable upload yields nothing');

  // Object rows (a header-ed sheet) work too.
  eq(parseCalendarUpload([{ 'Start of Classes': '2026-08-17' }]).startOfClasses, '2026-08-17', 'object rows');

  const deadlines = deriveDeadlines(calendar);
  eq(deadlines.syllabusDue, '2026-08-10', 'a syllabus is due about a week before classes start [08:51]');
  eq(deadlines.midtermGradesDue, '2026-10-12', 'midterm grade submission carried through');

  // The rule is configurable, not a constant.
  eq(deriveDeadlines(calendar, { syllabusDueDaysBeforeClasses: 14 }).syllabusDue, '2026-08-03', 'configured lead time');
  eq(deriveDeadlines(null), null, 'no calendar, no deadlines');

  eq(deadlineState(deadlines, new Date('2026-07-01')).state, 'upcoming', 'well before');
  eq(deadlineState(deadlines, new Date('2026-08-06')).state, 'due-soon', 'inside the reminder window');
  eq(deadlineState(deadlines, new Date('2026-08-15')).state, 'overdue', 'past the deadline');
  eq(deadlineState(null).state, 'no-calendar', 'without a calendar nothing fires');

  setAcademicCalendar(calendar);
  eq(getAcademicCalendar().startOfClasses, '2026-08-17', 'the calendar persists');
});

test('late faculty and the program head are notified automatically', () => {
  const plans = [
    planStatusFor('BIT201', DRAFT, { instructor: 'NORTON, MONICA' }),
    planStatusFor('BIT301', DRAFT, { instructor: 'CASIMERO, DANNY' }),
    planStatusFor('IT 411', APPROVED, { instructor: 'CASIMERO, DANNY' })
  ];
  const deadlines = deriveDeadlines({ startOfClasses: '2026-08-17' }, DEFAULT_CALENDAR_RULES);

  eq(buildReminders(plans, deadlines, new Date('2026-07-01')).length, 0, 'nothing fires while the deadline is far off');

  const reminders = buildReminders(plans, deadlines, new Date('2026-08-15'));
  eq(reminders.length, 3, 'one per late faculty member plus the PH summary [08:51]');
  const phSummary = reminders.find(r => r.role === 'program-head');
  if (!phSummary) throw new Error('the program head gets the summary too');
  if (!/BIT201, BIT301/.test(phSummary.message)) throw new Error(`the summary names the courses: ${phSummary.message}`);
  if (reminders.some(r => r.courseCode === 'IT 411')) throw new Error('a submitted plan is never chased');
  if (!reminders.every(r => r.severity === 'overdue')) throw new Error('past the due date is overdue');

  const first = pushNotifications(reminders);
  eq(first.added, 3, 'queued once');
  eq(pushNotifications(reminders).added, 0, 'running again on the same day does not duplicate');

  eq(notificationsFor('program-head').length, 1, 'the PH sees the summary');
  eq(notificationsFor('instructor').length, 2, 'faculty see their own chases');

  markNotificationsRead([phSummary.id]);
  eq(notificationsFor('program-head')[0].read, true, 'a read notice stays read');
});

console.log('\nAll plan status checks passed.');
