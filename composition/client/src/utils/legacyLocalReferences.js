// The references used to be kept only in this browser (localStorage). They now live on the server.
// This module is the way OUT of the old store: read what is still there so it can be uploaded once,
// and remove it afterwards. Nothing writes to the old store any more.

const REF_KEY = 'lpsm_reference_library_v1'
const ID_MIGRATION_KEY = 'lpsm_ref_id_migrated_v1'

// Entries that mirrored the server's own rows ("srv-…") or were built-in demo placeholders are not
// the Director's own additions, so they are not offered for upload.
const DEMO_IDS = new Set(['TB-DEP-001', 'OR-ISS-001', 'OE-DEP-002', 'TB-BUS-001', 'TB-EDU-001', 'OE-NUR-001', 'OR-ENG-001', 'TB-CS-002', 'OE-BUS-002', 'TB-ENG-002', 'TB-VOLD-001', 'NUR-OBS-001'])

export const readLegacyReferences = (storage = globalThis.localStorage) => {
  try {
    const parsed = JSON.parse(storage?.getItem(REF_KEY) || '[]')
    return (Array.isArray(parsed) ? parsed : [])
      .filter(ref => ref && ref.title && !String(ref.id ?? '').startsWith('srv-') && !DEMO_IDS.has(String(ref.id)))
  } catch {
    return []
  }
}

export const clearLegacyReferences = (storage = globalThis.localStorage) => {
  try {
    storage?.removeItem(REF_KEY)
    storage?.removeItem(ID_MIGRATION_KEY)
  } catch { /* storage unavailable: nothing to clear */ }
}
