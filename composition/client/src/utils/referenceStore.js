// The reference library, on the server. Replaces the old localStorage store: every read and write
// goes to /api/references. Writes need the Director of Libraries; the server enforces that.
import { fetchJson } from './api.js'
import { getReferenceTypes, setReferenceTypes } from './referenceTypes.js'
import { normalizeReferenceLibraryRows } from './referenceDiscovery.js'

const json = { 'Content-Type': 'application/json' }

// Loads the type definitions once per page load.
export const loadReferenceTypes = async () => {
  if (getReferenceTypes().length === 0) setReferenceTypes((await fetchJson('/api/references/types')).types)
  return getReferenceTypes()
}

// Library records (archived ones flagged), shaped for the Reference Library and the comment picker.
export const loadLibrary = async () => normalizeReferenceLibraryRows(await fetchJson('/api/references/library'))

export const serverId = (id) => Number(String(id).replace(/^srv-/, ''))

// One record by its library id ("srv-12") or number.
export const loadReference = async (id) => {
  const row = await fetchJson(`/api/references/${serverId(id)}`)
  return normalizeReferenceLibraryRows([row])[0] || null
}

// The API takes the form's field keys; anything not in `fields` is left out.
export const toPayload = (values) => {
  const payload = { type: values.type }
  for (const key of ['title', 'authors', 'isbn', 'year', 'link', 'publisher']) {
    if (values[key] !== undefined && values[key] !== null && String(values[key]).trim() !== '') payload[key] = String(values[key]).trim()
  }
  return payload
}

export const createReference = (values) => fetchJson('/api/references', { method: 'POST', headers: json, body: JSON.stringify(toPayload(values)) })

// A library record can stand for several identical server rows (same title and author, copied per
// course by the seeders); an edit or archive applies to all of them so the record stays consistent.
const idsOf = (record) => (record.sourceIds?.length ? record.sourceIds : [serverId(record.id)])

export const updateReference = async (record, values) => {
  for (const id of idsOf(record)) {
    await fetchJson(`/api/references/${id}`, { method: 'PUT', headers: json, body: JSON.stringify(toPayload(values)) })
  }
}

export const setArchived = async (record, archived) => {
  for (const id of idsOf(record)) {
    await fetchJson(`/api/references/${id}/${archived ? 'archive' : 'unarchive'}`, { method: 'PUT' })
  }
}

// rows: [{ type, title, authors, isbn, year, link, publisher }]. dryRun previews without writing.
export const importReferences = (rows, { dryRun = false } = {}) => fetchJson('/api/references/import', {
  method: 'POST', headers: json, body: JSON.stringify({ rows, dryRun })
})
