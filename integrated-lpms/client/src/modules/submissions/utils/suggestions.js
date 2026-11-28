// Reference suggestions an approver makes on a course, kept in the browser (demo mode).
const SUGGESTIONS_KEY = 'lpms_suggestions_v1'

function safeStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return null
}

export function getSuggestions(courseCode) {
  const storage = safeStorage()
  try {
    const raw = storage ? storage.getItem(SUGGESTIONS_KEY) : null
    const all = raw ? JSON.parse(raw) : []
    if (!Array.isArray(all)) return []
    return courseCode ? all.filter(s => s.courseCode === courseCode) : all
  } catch { return [] }
}

export function addSuggestion(courseCode, reference, suggestedBy) {
  const storage = safeStorage()
  const all = getSuggestions(null)
  const suggestion = {
    id: `SUG-${Date.now()}`,
    courseCode,
    reference: { ...reference },
    suggestedBy,
    suggestedAt: new Date().toISOString(),
    status: 'pending'
  }
  all.push(suggestion)
  if (storage) storage.setItem(SUGGESTIONS_KEY, JSON.stringify(all))
  return suggestion
}

export function acceptSuggestion(suggestionId) {
  const storage = safeStorage()
  const all = getSuggestions(null)
  const idx = all.findIndex(s => s.id === suggestionId)
  if (idx === -1) return null
  all[idx].status = 'accepted'
  all[idx].acceptedAt = new Date().toISOString()
  if (storage) storage.setItem(SUGGESTIONS_KEY, JSON.stringify(all))
  const rawType = (all[idx].reference.type || '').toLowerCase()
  const mappedType = rawType === 'book' ? 'Textbook'
    : rawType.includes('online') ? 'Online Resources'
    : rawType.includes('educational') || rawType === 'oer' ? 'Open Educational Resources'
    : 'Textbook'
  // The accepted reference goes into the stored demo syllabus. Loaded on demand, so the screens that only list
  // suggestions do not ship the demo syllabus data.
  const accepted = all[idx]
  import('./dataStore.js').then(({ addReference }) => addReference(accepted.courseCode, {
    title: accepted.reference.title,
    authors: accepted.reference.authors,
    type: mappedType,
    year: accepted.reference.year,
    isbn: accepted.reference.isbn || '',
    link: accepted.reference.link || ''
  }))
  return accepted
}

export function rejectSuggestion(suggestionId) {
  const storage = safeStorage()
  const all = getSuggestions(null)
  const idx = all.findIndex(s => s.id === suggestionId)
  if (idx === -1) return null
  all[idx].status = 'rejected'
  all[idx].rejectedAt = new Date().toISOString()
  if (storage) storage.setItem(SUGGESTIONS_KEY, JSON.stringify(all))
  return all[idx]
}
