// How an offering's revision is shown. An offering is one of:
//   - an approved revision                     "Rev 2"
//   - an unchanged approved syllabus carried to a new term   "Carried over (Rev 2)"
//   - a working copy the Dean has not approved yet           "Working copy" (no revision number)
import { revisionOf } from './offeringKey.js'

// offering: a ProgramCourseOffering row as the API returns it.
export const revisionLabel = (offering = {}) => {
  const revision = revisionOf(offering.revision_number)
  if (offering.carried_from_offering_id) return `Carried over (Rev ${revision ?? '?'})`
  return revision ? `Rev ${revision}` : 'Working copy'
}

export const termLabel = (offering = {}) =>
  offering.school_year && offering.semester ? `${offering.school_year} · ${offering.semester} sem` : ''

// The same, for the revisions-history entries (camelCase).
export const historyRevisionLabel = (entry = {}) => {
  if (entry.carriedOver) return `Carried over (Rev ${entry.revNum ?? '?'})`
  return entry.revNum ? `Revision ${entry.revNum}` : 'Working copy'
}

// A program's short name from its words' initials, as the university writes them:
// "Bachelor of Science in Computer Science" -> "BSCS", "Associate in Computer Technology" -> "ACT".
export const programShort = (name = '') => String(name)
  .split(/\s+/).filter(word => word && !/^(of|in|and|the|for)$/i.test(word))
  .map(word => word[0].toUpperCase()).join('')

// The course picker of the CO and PO and COAEP pages, from /api/assignments rows: one option per offering, as
// "BIT213L — Object-Oriented Programming · 2026-2027 · 1st sem · Rev 2". The program is named only when the list has
// more than one (one course can be offered by two programs). Sorted by course code, newest term first; `selected`
// is the first option of the newest term, so the page opens on the current work.
export const courseOptions = (rows = []) => {
  const byId = new Map()
  for (const row of rows) {
    const offering = row?.ProgramCourseOffering
    if (offering?.pc_offering_id && offering.Course?.course_no && !byId.has(offering.pc_offering_id)) byId.set(offering.pc_offering_id, offering)
  }
  const offerings = [...byId.values()]
  const manyPrograms = new Set(offerings.map(o => o.Program?.name).filter(Boolean)).size > 1
  const options = offerings.map(o => ({
    id: String(o.pc_offering_id),
    code: o.Course.course_no,
    name: o.Course.course_title || '',
    year: o.school_year || '',
    label: [`${o.Course.course_no} — ${o.Course.course_title || ''}`, manyPrograms && programShort(o.Program?.name),
      termLabel(o), revisionLabel(o)].filter(Boolean).join(' · '),
  })).sort((a, b) => a.code.localeCompare(b.code) || b.year.localeCompare(a.year) || a.label.localeCompare(b.label))
  const newest = options.reduce((max, o) => (o.year > max ? o.year : max), '')
  return { options, selected: (options.find(o => o.year === newest) || options[0])?.id || '' }
}
