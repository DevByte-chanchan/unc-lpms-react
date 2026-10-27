// The health of the Reference Library for the Director of Libraries: which titles cannot be used, are
// older than the recency rule, or are missing what a reviewer looks for. Pure, so it runs under plain
// node in the tests. The same wording is used on the screen and in the exported report.
import { unavailableReason } from './referenceCatalog.js'
import { csvCell } from './csvCell.js'

const isTextbook = (record) => String(record?.type || '').toLowerCase().startsWith('textbook')

// The reasons one library record needs attention. years is the recency rule (published this many years ago or more is old).
export const healthIssues = (record, { years = 5, currentYear = new Date().getFullYear() } = {}) => {
  const issues = []
  const unavailable = unavailableReason(record)
  if (unavailable) issues.push(`Not available: ${unavailable}`)
  const year = Number.parseInt(record?.year, 10)
  if (!Number.isFinite(year)) issues.push('No publication year')
  else if (currentYear - year >= years) issues.push(`Published ${year}, ${years} years ago or more`)
  if (isTextbook(record) && !String(record?.isbn || '').trim()) issues.push('No ISBN')
  if (!isTextbook(record) && !String(record?.link || '').trim()) issues.push('No link')
  return issues
}

// Counts for the summary strip, over the records given (the caller passes the active ones).
export const healthSummary = (records = [], options = {}) => {
  const rows = records.map(record => ({ record, issues: healthIssues(record, options) }))
  const count = (test) => rows.filter(row => row.issues.some(test)).length
  return {
    total: rows.length,
    needAttention: rows.filter(row => row.issues.length).length,
    unavailable: count(issue => issue.startsWith('Not available')),
    outdated: count(issue => issue.startsWith('Published')),
    noYear: count(issue => issue === 'No publication year'),
    noIsbn: count(issue => issue === 'No ISBN'),
    noLink: count(issue => issue === 'No link')
  }
}

const COLUMNS = [
  ['ID', r => r.id],
  ['Title', r => r.title],
  ['Authors', r => r.authors],
  ['Type', r => r.type],
  ['Year', r => r.year],
  ['ISBN', r => r.isbn],
  ['Copies', r => (r.copies == null ? '' : r.copies)],
  ['Status', r => r.status],
  ['Category', r => r.category],
  ['Used in courses', r => (r.usedInCourses || []).join('; ')]
]

// The report: every record with at least one issue, one row each, the reasons in the last column.
export const toHealthCsv = (records = [], options = {}) => {
  const flagged = records.map(record => ({ record, issues: healthIssues(record, options) })).filter(row => row.issues.length)
  return [
    [...COLUMNS.map(([name]) => name), 'Issues'].map(csvCell).join(','),
    ...flagged.map(({ record, issues }) => [...COLUMNS.map(([, read]) => read(record)), issues.join('; ')].map(csvCell).join(','))
  ].join('\r\n')
}
