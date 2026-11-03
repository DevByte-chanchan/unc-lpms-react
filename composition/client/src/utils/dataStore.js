import { syllabiData as staticSyllabi } from '../data/syllabiData.js'
import { enrichSyllabi } from '../data/syllabiDataEnricher.js'

const SYLLABI_KEY = 'lpms_syllabi_v2'

function safeStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return null
}

// Parsed once per page load; updateSyllabus keeps it current. Re-parsing and re-saving ~230 KB on every read was wasted work.
let cached = null

function initSyllabi() {
  if (cached) return cached
  const storage = safeStorage()
  try {
    const raw = storage ? storage.getItem(SYLLABI_KEY) : null
    if (raw) {
      const data = JSON.parse(raw)
      enrichSyllabi(data)
      if (storage) storage.setItem(SYLLABI_KEY, JSON.stringify(data))
      return (cached = data)
    }
  } catch (e) { console.warn('Failed to parse stored syllabi, reinitializing:', e) }
  const enriched = [...staticSyllabi]
  enrichSyllabi(enriched)
  if (storage) storage.setItem(SYLLABI_KEY, JSON.stringify(enriched))
  return (cached = enriched)
}

const normalizeInstructor = (s) => {
  if (!s.instructor || s.instructor.toLowerCase().includes('norton') || s.instructor.toLowerCase().includes('monica')) {
    return { ...s, instructor: 'CASIMERO, DANNY' }
  }
  return s
}

export function getSyllabi() {
  return initSyllabi().map(normalizeInstructor)
}

export function getSyllabus(code) {
  const all = initSyllabi()
  const found = all.find(s => s.code === code) || null
  return found ? normalizeInstructor(found) : null
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
