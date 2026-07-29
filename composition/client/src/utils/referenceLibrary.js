const REF_KEY = 'lpsm_reference_library_v1'
const ID_MIGRATION_KEY = 'lpsm_ref_id_migrated_v1'

const typePrefix = (type) => {
  if (type === 'Textbook') return 'TB'
  if (type === 'Online Resources') return 'OR'
  if (type === 'Open Educational Resources') return 'OER'
  return 'REF'
}

const _readAll = () => {
  try {
    const raw = localStorage.getItem(REF_KEY)
    const refs = raw ? JSON.parse(raw) : []
    if (!localStorage.getItem(ID_MIGRATION_KEY) && raw) {
      const counts = {}
      const migrated = refs.map(r => {
        if (!r.id || /^\d{13,}$/.test(String(r.id))) {
          const prefix = typePrefix(r.type)
          counts[prefix] = (counts[prefix] || 0) + 1
          return { ...r, id: `${prefix}${counts[prefix]}` }
        }
        return r
      })
      localStorage.setItem(REF_KEY, JSON.stringify(migrated))
      localStorage.setItem(ID_MIGRATION_KEY, '1')
      return migrated
    }
    return refs
  } catch (e) {
    return []
  }
}

const _writeAll = (refs) => {
  try {
    localStorage.setItem(REF_KEY, JSON.stringify(refs))
  } catch (e) {
    console.error('Failed to persist reference library', e)
  }
}

export const getReferences = (includeArchived = false) => {
  const refs = _readAll()
  if (!includeArchived) return refs.filter(r => !r.archived)
  return refs
}

export const setReferences = (refs) => _writeAll(refs)

export const addReference = (ref) => {
  const refs = _readAll()
  const maxId = refs.reduce((max, r) => Math.max(max, r.numericId || 0), 0)
  const count = refs.filter(r => r.type === ref.type).length + 1
  const newRef = { ...ref, numericId: maxId + 1, id: `${typePrefix(ref.type)}${count}` }
  refs.push(newRef)
  _writeAll(refs)
  return newRef
}

export const updateReference = (id, updates) => {
  const refs = _readAll()
  const idx = refs.findIndex(r => r.id === id)
  if (idx !== -1) {
    refs[idx] = { ...refs[idx], ...updates }
    _writeAll(refs)
    return refs[idx]
  }
  return null
}

export const deleteReference = (id) => {
  const refs = _readAll()
  const filtered = refs.filter(r => r.id !== id)
  _writeAll(filtered)
  return filtered
}

export const archiveReference = (id) => {
  const refs = _readAll()
  const idx = refs.findIndex(r => r.id === id)
  if (idx !== -1) {
    refs[idx] = { ...refs[idx], archived: true }
    _writeAll(refs)
    return refs[idx]
  }
  return null
}

export const unarchiveReference = (id) => {
  const refs = _readAll()
  const idx = refs.findIndex(r => r.id === id)
  if (idx !== -1) {
    const { archived, ...rest } = refs[idx]
    refs[idx] = rest
    _writeAll(refs)
    return refs[idx]
  }
  return null
}

export const getReferenceById = (id) => {
  const refs = _readAll()
  // Tolerant match: route params are strings while some stored ids/numericIds
  // are numbers — strict === made the edit form open blank.
  return refs.find(r => String(r.id) === String(id) || String(r.numericId) === String(id)) || null
}

const REF_COMMENTS_KEY = 'lpsm_reference_comments_v1'

export const getReferenceComments = (refId) => {
  try {
    const raw = localStorage.getItem(REF_COMMENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    return Array.isArray(all) ? all.filter(c => c.refId === refId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []
  } catch (e) { return [] }
}

export const addReferenceComment = (refId, text, author) => {
  try {
    const raw = localStorage.getItem(REF_COMMENTS_KEY)
    const all = raw ? JSON.parse(raw) : []
    const comment = { id: `RC-${Date.now()}`, refId, text, author, createdAt: new Date().toISOString() }
    all.push(comment)
    localStorage.setItem(REF_COMMENTS_KEY, JSON.stringify(all))
    return comment
  } catch (e) { return null }
}

export default {
  REF_KEY,
  getReferences,
  setReferences,
  addReference,
  updateReference,
  deleteReference,
  archiveReference,
  unarchiveReference,
  getReferenceById,
  getReferenceComments,
  addReferenceComment,
}
