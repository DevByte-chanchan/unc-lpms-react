import { syllabiData as staticSyllabi } from '../data/syllabiData.js'

const SYLLABI_KEY = 'lpms_syllabi_v1'
const SUGGESTIONS_KEY = 'lpms_suggestions_v1'

function initSyllabi() {
  try {
    const raw = localStorage.getItem(SYLLABI_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  localStorage.setItem(SYLLABI_KEY, JSON.stringify(staticSyllabi))
  return [...staticSyllabi]
}

export function getSyllabi() {
  return initSyllabi()
}

export function getSyllabus(code) {
  const all = initSyllabi()
  return all.find(s => s.code === code) || null
}

export function updateSyllabus(code, updates) {
  const all = initSyllabi()
  const idx = all.findIndex(s => s.code === code)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...updates }
  localStorage.setItem(SYLLABI_KEY, JSON.stringify(all))
  return all[idx]
}

export function addReference(code, ref) {
  const syllabus = getSyllabus(code)
  if (!syllabus) return null
  const refs = [...(syllabus.references || [])]
  const newRef = { ...ref, id: ref.id || `REF-${Date.now()}` }
  refs.push(newRef)
  updateSyllabus(code, { references: refs })
  return newRef
}

export function getSuggestions(courseCode) {
  try {
    const raw = localStorage.getItem(SUGGESTIONS_KEY)
    const all = raw ? JSON.parse(raw) : []
    if (!Array.isArray(all)) return []
    return courseCode ? all.filter(s => s.courseCode === courseCode) : all
  } catch (e) { return [] }
}

export function addSuggestion(courseCode, reference, suggestedBy) {
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
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(all))
  return suggestion
}

export function acceptSuggestion(suggestionId) {
  const all = getSuggestions(null)
  const idx = all.findIndex(s => s.id === suggestionId)
  if (idx === -1) return null
  all[idx].status = 'accepted'
  all[idx].acceptedAt = new Date().toISOString()
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(all))
  const rawType = (all[idx].reference.type || '').toLowerCase()
  const mappedType = rawType === 'book' ? 'Textbook'
    : rawType.includes('online') ? 'Online Resources'
    : rawType.includes('educational') || rawType === 'oer' ? 'Open Educational Resources'
    : 'Textbook'
  addReference(all[idx].courseCode, {
    title: all[idx].reference.title,
    authors: all[idx].reference.authors,
    type: mappedType,
    year: all[idx].reference.year,
    isbn: all[idx].reference.isbn || '',
    link: all[idx].reference.link || ''
  })
  return all[idx]
}

export function rejectSuggestion(suggestionId) {
  const all = getSuggestions(null)
  const idx = all.findIndex(s => s.id === suggestionId)
  if (idx === -1) return null
  all[idx].status = 'rejected'
  all[idx].rejectedAt = new Date().toISOString()
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(all))
  return all[idx]
}
