// Review by exception: what the Director of Libraries should look at first in a plan's references.
// Pure. A reference with no issue is simply listed; one with issues is listed first, with the reasons.
// The system only points: accepting or returning the plan is still the Director's decision.
import { DEFAULT_CATALOG_SETTINGS, isWithinRecency, recencyWindow, unavailableReason } from './referenceCatalog.js'

const blank = (value) => ['', '-', '#', null, undefined].includes(typeof value === 'string' ? value.trim() : value)
const titleKey = (ref) => `${String(ref.title || '').trim().toLowerCase()}|${String(ref.authors || '').trim().toLowerCase()}`

// The reasons one reference needs a look. `all` is every reference of the plan, to spot a title attached twice.
export const issuesOf = (ref, { all = [], settings = DEFAULT_CATALOG_SETTINGS, now = new Date() } = {}) => {
  const issues = []
  const unavailable = unavailableReason(ref)
  if (unavailable) issues.push(`Not available: ${unavailable}`)

  const window = recencyWindow(settings, now)
  if (blank(ref.year)) issues.push('No publication year')
  else if (!isWithinRecency(ref, window)) issues.push(`Published ${ref.year}, before ${window.from}`)

  const isTextbook = String(ref.typeKey || ref.type || '').toLowerCase().startsWith('textbook')
  if (isTextbook && blank(ref.isbn)) issues.push('No ISBN')
  if (!isTextbook && blank(ref.link)) issues.push('No link')

  const twins = all.filter(other => other !== ref && other.id !== ref.id && titleKey(other) === titleKey(ref))
  if (twins.length) issues.push('Listed more than once in this plan')
  return issues
}

// Every reference with its issues, those with issues first (each group keeps its order).
export const reviewReferences = (references = [], options = {}) => {
  const rows = references.map(ref => ({ ref, issues: issuesOf(ref, { ...options, all: references }) }))
  return [...rows.filter(row => row.issues.length), ...rows.filter(row => !row.issues.length)]
}

// One sentence for the top of the table.
export const reviewSummary = (rows = []) => {
  if (rows.length === 0) return { tone: 'none', text: '' }
  const flagged = rows.filter(row => row.issues.length).length
  if (flagged === 0) return { tone: 'clean', text: `No issues found in ${rows.length} reference${rows.length === 1 ? '' : 's'}.` }
  return { tone: 'flagged', text: `${flagged} of ${rows.length} reference${rows.length === 1 ? '' : 's'} need${flagged === 1 ? 's' : ''} a look.` }
}
