// The Program Head's "Not Yet Submitted" page: the wording, the term choices and the CSV export.
// Pure (it imports only the CSV cell helper), so it runs under plain node in the tests. The server decides who is missing and
// how late they are (GET /api/missing-submissions); this only presents it.

import { csvCell as cell } from './csvCell.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-11-05" -> "5 Nov 2026". Anything that is not such a day is shown as it came, or a dash.
export const dayLabel = (value) => {
  const text = String(value ?? '').slice(0, 10)
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(text)
  if (!match) return value ? String(value) : '—'
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1] || match[2]} ${match[1]}`
}

// How a plan stands against its due date, in words.
export const statusLabel = (row) => {
  if (row.status === 'no-deadline') return 'No due date'
  const days = row.daysLeft
  if (row.status === 'overdue') return `${-days} day${days === -1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

// The order the page lists them in: the most overdue first, then the soonest due, then those with no due date.
export const sortMissing = (rows) => [...rows].sort((a, b) => {
  const rank = (row) => (row.status === 'no-deadline' ? Number.POSITIVE_INFINITY : row.daysLeft)
  return rank(a) - rank(b) || String(a.courseCode).localeCompare(String(b.courseCode))
})

// Who last reminded the instructor, and when: "2 Nov 2026, by the system".
export const lastReminderLabel = (row) => (row.lastReminderAt ? `${dayLabel(String(row.lastReminderAt).replace(' ', 'T'))}, by ${row.lastReminderBy}` : 'Never')

// When the course was assigned, and how much time the instructor had before the due date. A plan may still
// be submitted late; this is the record of why it was.
export const assignedLabel = (row) => (row.assignedDay ? dayLabel(row.assignedDay) : '—')

export const timeToPrepareLabel = (row) => {
  const days = row.assignedDaysBeforeDue
  if (days == null) return ''
  if (days < 0) return 'Assigned after the due date'
  if (days === 0) return 'Assigned on the due date'
  return `${days} day${days === 1 ? '' : 's'} to prepare`
}

export const SEMESTERS = ['1st', '2nd', 'Summer']

// The school years to offer: those in the data, and this one and the next, newest first.
export const schoolYearOptions = (rows = [], deadlines = [], todayDay = '') => {
  const years = new Set([...rows.map(r => r.schoolYear), ...deadlines.map(d => d.school_year)].filter(Boolean))
  const year = Number(String(todayDay).slice(0, 4))
  if (year) { years.add(`${year - 1}-${year}`); years.add(`${year}-${year + 1}`) }
  return [...years].sort().reverse()
}

// The school year that today falls in: it starts in June (2026-06-01 .. 2027-05-31 is 2026-2027).
export const currentSchoolYear = (todayDay) => {
  const year = Number(String(todayDay).slice(0, 4))
  const month = Number(String(todayDay).slice(5, 7))
  if (!year || !month) return ''
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

// A sentence for the result of "Remind selected".
export const remindSummary = (response) => {
  const results = response?.results || []
  const count = (status) => results.filter(r => r.status === status).length
  const parts = [`Reminded ${response?.sent || 0} instructor${response?.sent === 1 ? '' : 's'}.`]
  if (count('limited')) parts.push(`${count('limited')} reminded too recently, so skipped.`)
  if (count('no-instructor')) parts.push(`${count('no-instructor')} ha${count('no-instructor') === 1 ? 's' : 've'} no active instructor.`)
  if (count('not-waiting')) parts.push(`${count('not-waiting')} no longer waiting.`)
  return parts.join(' ')
}

export const CSV_COLUMNS = [
  ['Course', r => r.courseCode],
  ['Title', r => r.courseTitle],
  ['Program', r => r.programName],
  ['School year', r => r.schoolYear],
  ['Semester', r => r.semester],
  ['Assigned', r => r.assignedDay || ''],
  ['Days to prepare', r => (r.assignedDaysBeforeDue == null ? '' : r.assignedDaysBeforeDue)],
  ['Instructor', r => r.instructorName || ''],
  ['Instructor e-mail', r => r.instructorEmail || ''],
  ['Plan', r => (r.state === 'Returned' ? 'Returned, not resubmitted' : 'Not submitted')],
  ['Due date', r => r.syllabusDue || ''],
  ['Standing', r => statusLabel(r)],
  ['Last reminder', r => lastReminderLabel(r)],
  ['Reminders paused', r => (r.remindersPaused ? 'Yes' : 'No')]
]

export const toCsv = (rows) => [
  CSV_COLUMNS.map(([name]) => cell(name)).join(','),
  ...rows.map(row => CSV_COLUMNS.map(([, read]) => cell(read(row))).join(','))
].join('\r\n')
