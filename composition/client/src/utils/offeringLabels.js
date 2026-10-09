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
