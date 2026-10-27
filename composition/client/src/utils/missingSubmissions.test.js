import test from 'node:test'
import assert from 'node:assert/strict'
import { dayLabel, statusLabel, sortMissing, lastReminderLabel, schoolYearOptions, currentSchoolYear, remindSummary, toCsv, CSV_COLUMNS } from './missingSubmissions.js'

const row = (extra = {}) => ({
  courseCode: 'BIT313L', courseTitle: 'Human and Computer Interaction', programName: 'BSIT', schoolYear: '2026-2027', semester: '1st',
  instructorName: 'NORTON, MONICA', instructorEmail: 'monica@example.test', state: 'Draft', syllabusDue: '2026-11-05', daysLeft: 3, status: 'due-soon',
  lastReminderAt: null, lastReminderBy: null, remindersPaused: false, ...extra
})

test('a due date reads as a day, month and year', () => {
  assert.equal(dayLabel('2026-11-05'), '5 Nov 2026')
  assert.equal(dayLabel('2026-12-31 08:00:00'), '31 Dec 2026')
  assert.equal(dayLabel(null), '—')
  assert.equal(dayLabel('soon'), 'soon')
})

test('how a plan stands is said in words', () => {
  assert.equal(statusLabel(row({ status: 'on-track', daysLeft: 12 })), 'Due in 12 days')
  assert.equal(statusLabel(row({ daysLeft: 1 })), 'Due tomorrow')
  assert.equal(statusLabel(row({ daysLeft: 0 })), 'Due today')
  assert.equal(statusLabel(row({ status: 'overdue', daysLeft: -1 })), '1 day overdue')
  assert.equal(statusLabel(row({ status: 'overdue', daysLeft: -9 })), '9 days overdue')
  assert.equal(statusLabel(row({ status: 'no-deadline', daysLeft: null })), 'No due date')
})

test('the most overdue plans come first, then the soonest due, and plans with no due date last', () => {
  const sorted = sortMissing([
    row({ courseCode: 'C', status: 'no-deadline', daysLeft: null }),
    row({ courseCode: 'B', status: 'on-track', daysLeft: 9 }),
    row({ courseCode: 'A', status: 'overdue', daysLeft: -4 }),
    row({ courseCode: 'D', status: 'due-soon', daysLeft: 1 })
  ])
  assert.deepEqual(sorted.map(r => r.courseCode), ['A', 'D', 'B', 'C'])
})

test('the last reminder says when and by whom, or never', () => {
  assert.equal(lastReminderLabel(row()), 'Never')
  assert.equal(lastReminderLabel(row({ lastReminderAt: '2026-11-02 09:00:00.000 +00:00', lastReminderBy: 'the system' })), '2 Nov 2026, by the system')
})

test('the school years offered include the data, this year and the next, newest first', () => {
  assert.deepEqual(schoolYearOptions([{ schoolYear: '2024-2025' }], [{ school_year: '2026-2027' }], '2026-10-27'), ['2026-2027', '2025-2026', '2024-2025'])
})

test('the current school year starts in June', () => {
  assert.equal(currentSchoolYear('2026-10-27'), '2026-2027')
  assert.equal(currentSchoolYear('2027-02-03'), '2026-2027')
  assert.equal(currentSchoolYear('2027-06-01'), '2027-2028')
  assert.equal(currentSchoolYear(''), '')
})

test('the result of remind selected is explained', () => {
  assert.equal(remindSummary({ sent: 2, results: [] }), 'Reminded 2 instructors.')
  assert.equal(remindSummary({ sent: 1, results: [{ status: 'sent' }, { status: 'limited' }, { status: 'not-waiting' }] }),
    'Reminded 1 instructor. 1 reminded too recently, so skipped. 1 no longer waiting.')
})

test('the CSV has a header and one line per plan, in the same columns', () => {
  const csv = toCsv([row(), row({ courseCode: 'MATH311L', state: 'Returned', status: 'overdue', daysLeft: -2, remindersPaused: true })])
  const lines = csv.split('\r\n')
  assert.equal(lines.length, 3)
  assert.equal(lines[0].split(',').length, CSV_COLUMNS.length)
  assert.match(lines[0], /^Course,Title,Program,School year,Semester,Instructor/)
  assert.match(lines[1], /^BIT313L,Human and Computer Interaction,BSIT,2026-2027,1st/)
  assert.match(lines[2], /"Returned, not resubmitted"/)
  assert.match(lines[2], /2 days overdue/)
  assert.match(lines[2], /Yes$/)
})

test('a value that could run as a spreadsheet formula, or break a line, is made safe', () => {
  const csv = toCsv([row({ instructorName: '=HYPERLINK("http://evil.test")', courseTitle: 'Quote "this", and\nbreak', programName: '+SUM(A1)' })])
  const body = csv.split('\r\n').slice(1).join('\r\n')
  assert.ok(body.includes('"\'=HYPERLINK(""http://evil.test"")"'), 'a formula is turned into text, quotes doubled')
  assert.ok(body.includes('"Quote ""this"", and\nbreak"'), 'quotes, comma and line break are escaped')
  assert.ok(body.includes(",'+SUM(A1),"), 'a leading plus is turned into text')
})
