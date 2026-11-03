import test from 'node:test'
import assert from 'node:assert/strict'
import { dayLabel, statusLabel, sortMissing, lastReminderLabel, schoolYearOptions, currentSchoolYear, assignedLabel, timeToPrepareLabel, shortDay, lastReminderShort, courseSubline, programCode, niceName } from './missingSubmissions.js'

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

test('when the course was assigned and how long the instructor had to prepare', () => {
  assert.equal(assignedLabel({ assignedDay: '2026-10-20' }), '20 Oct 2026')
  assert.equal(assignedLabel({}), '—')
  assert.equal(timeToPrepareLabel({ assignedDaysBeforeDue: 14 }), '14 days to prepare')
  assert.equal(timeToPrepareLabel({ assignedDaysBeforeDue: 1 }), '1 day to prepare')
  assert.equal(timeToPrepareLabel({ assignedDaysBeforeDue: 0 }), 'Assigned on the due date')
  assert.equal(timeToPrepareLabel({ assignedDaysBeforeDue: -3 }), 'Assigned after the due date')
  assert.equal(timeToPrepareLabel({ assignedDaysBeforeDue: null }), '')
})

test('short forms: the year is dropped when it is this year, names and programs are shortened', () => {
  assert.equal(shortDay('2026-10-30', '2026-11-01'), '30 Oct')
  assert.equal(shortDay('2025-10-30', '2026-11-01'), '30 Oct 2025')
  assert.equal(shortDay(null), '—')
  assert.equal(lastReminderShort({ lastReminderAt: '2026-10-31 02:00:00', lastReminderBy: 'the system' }, '2026-11-01'), '31 Oct · system')
  assert.equal(lastReminderShort({ lastReminderAt: '2026-10-31 02:00:00', lastReminderBy: 'a person' }, '2026-11-01'), '31 Oct · person')
  assert.equal(lastReminderShort({}), 'Never')
  assert.equal(programCode('Bachelor of Science in Information Technology'), 'BSIT')
  assert.equal(programCode('Bachelor of Science in Computer Science'), 'BSCS')
  assert.equal(programCode(''), '—')
  assert.equal(niceName('NORTON, MONICA'), 'Norton, Monica')
  assert.equal(niceName("DE LA CRUZ, MARY-ANN"), 'De La Cruz, Mary-Ann')
})

test('the line under a course says where it stands, when it was assigned, and the time to prepare', () => {
  const row = { state: 'Returned', assignedDay: '2026-06-01', assignedDaysBeforeDue: 151 }
  assert.equal(courseSubline(row, '2026-11-01'), 'Returned · assigned 1 Jun, 151 days to prepare')
  assert.equal(courseSubline({ state: 'Draft', isRevision: true, assignedDay: '2026-10-20', assignedDaysBeforeDue: -2 }, '2026-11-01'), 'Not submitted · revision · assigned 20 Oct, assigned after the due date')
  assert.equal(courseSubline({ state: 'Draft', assignedDay: '2026-10-20' }, '2026-11-01'), 'Not submitted · assigned 20 Oct')
})
