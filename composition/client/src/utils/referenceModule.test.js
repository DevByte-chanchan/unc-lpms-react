import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
}

const { setReferenceTypes, hasReferenceType, referenceTypeLabel, shortTypeLabel, fieldsFor, missingRequired } = await import('./referenceTypes.js')
const { csvRecordToRow, legacyReferenceToRow, typeKeyFromName } = await import('./referenceImportRows.js')
const { readLegacyReferences, clearLegacyReferences } = await import('./legacyLocalReferences.js')
const { updateReference, setArchived, importReferences, toPayload, createReference, serverId } = await import('./referenceStore.js')

// What GET /api/references/types returns (server/config/referenceTypes.js is the source).
const field = (key, label, required, kind = 'text') => ({ key, label, kind, required })
const TYPES = [
  { key: 'Textbook', label: 'Textbook', group: 'Textbook', fields: [field('title', 'Reference Title', true), field('authors', 'Author(s)', true), field('isbn', 'ISBN', true, 'isbn'), field('year', 'Publication Year', true, 'year'), field('publisher', 'Publisher', false)] },
  { key: 'OER', label: 'Open Educational Resource (OER)', group: 'Open Educational Resources', fields: [field('title', 'Reference Title', true), field('link', 'Link', true, 'url')] },
  { key: 'Online Resource', label: 'Online Resource', group: 'Online Resources', fields: [field('title', 'Reference Title', true), field('link', 'Link', true, 'url')] },
  { key: 'Online Subscription', label: 'Online Subscription (e.g., O’Reilly)', group: 'Online Subscriptions', fields: [field('title', 'Reference Title', true), field('publisher', 'Provider / platform', true), field('link', 'Subscription link', true, 'url')] }
]
setReferenceTypes(TYPES)

test('the registry matches type keys exactly and builds the form from the server fields', () => {
  assert.equal(hasReferenceType('Textbook'), true)
  for (const guess of ['textbook', 'TEXTBOOK', 'Online Resources', 'online', '', null, undefined]) assert.equal(hasReferenceType(guess), false, String(guess))
  assert.equal(referenceTypeLabel('OER'), 'Open Educational Resource (OER)')
  assert.equal(shortTypeLabel('Online Subscription'), 'Online Subscription')
  assert.deepEqual(fieldsFor('Online Subscription').map(f => f.key), ['title', 'publisher', 'link'])
  assert.deepEqual(fieldsFor('Journal'), [])
})

test('missingRequired names exactly the required fields still empty, with the type\'s own labels', () => {
  assert.deepEqual(missingRequired('', {}), { type: 'Please select a reference type.' })
  assert.deepEqual(Object.keys(missingRequired('Textbook', { title: 'T' })).sort(), ['authors', 'isbn', 'year'])
  assert.deepEqual(missingRequired('Textbook', { title: 'T', authors: 'A', isbn: '1', year: '2020' }), {})
  assert.equal(missingRequired('Online Subscription', { title: 'T' }).publisher, 'Provider / platform is required.')
  assert.equal(missingRequired('Textbook', { title: '   ', authors: 'A', isbn: '1', year: '2020' }).title, 'Reference Title is required.')
})

test('CSV records map by column name and type name; unknown types pass through for the server to refuse', () => {
  assert.deepEqual(csvRecordToRow({ 'Reference Type': 'Textbook', Title: ' Systems ', 'Author(s)': 'Doe', Year: '2025', ISBN: '123', Link: '' }), {
    type: 'Textbook', title: 'Systems', authors: 'Doe', year: '2025', isbn: '123', link: ''
  })
  assert.equal(csvRecordToRow({ type: 'online resources', title: 'x' }).type, 'Online Resource', 'the old plural name still in existing files')
  assert.equal(csvRecordToRow({ Type: 'Open Educational Resources' }).type, 'OER')
  assert.equal(csvRecordToRow({ Type: 'open educational resource (oer)' }).type, 'OER', 'by label')
  assert.equal(csvRecordToRow({ Type: 'oer' }).type, 'OER', 'by key, any case')
  assert.equal(csvRecordToRow({ Type: 'Online Subscription', Provider: "O'Reilly" }).publisher, "O'Reilly")
  assert.equal(csvRecordToRow({ Type: 'Journal' }).type, 'Journal')
  assert.equal(csvRecordToRow({ Type: '' }).type, '')
  assert.deepEqual(Object.keys(csvRecordToRow({ Type: 'Textbook', Department: 'SCIS', Program: 'BSIT' })), ['type'], 'columns the library does not store are ignored')
  assert.equal(typeKeyFromName('Textbooks'), 'Textbooks', 'no fuzzy matching')
})

test('a reference from the old local store becomes an import row', () => {
  assert.deepEqual(legacyReferenceToRow({ id: 'TB1', type: 'Online Resources', title: 'MDN', authors: 'Mozilla', year: 2024, link: 'https://x.org', isbn: '', departments: ['SCIS'], usedInCourses: ['BIT1'] }), {
    type: 'Online Resource', title: 'MDN', authors: 'Mozilla', isbn: '', year: '2024', link: 'https://x.org', publisher: ''
  })
  assert.equal(legacyReferenceToRow({ type: 'Open Educational Resources', title: 'T' }).type, 'OER')
  assert.equal(legacyReferenceToRow({ type: 'Textbook', title: 'T', year: '' }).year, '')
})

test('the old local store is read for the one-time upload, without server mirrors or demo placeholders, and then cleared', () => {
  store.set('lpsm_reference_library_v1', JSON.stringify([
    { id: 'TB1', title: 'Mine', type: 'Textbook' },
    { id: 'srv-12', title: 'Mirror of the server', type: 'Textbook' },
    { id: 'TB-DEP-001', title: 'Old demo', type: 'Textbook' },
    { id: 'OR2', title: '', type: 'Online Resources' },
    null
  ]))
  assert.deepEqual(readLegacyReferences().map(r => r.id), ['TB1'])
  store.set('lpsm_ref_id_migrated_v1', '1')
  clearLegacyReferences()
  assert.deepEqual(readLegacyReferences(), [])
  assert.equal(store.has('lpsm_ref_id_migrated_v1'), false)
  store.set('lpsm_reference_library_v1', 'not json')
  assert.deepEqual(readLegacyReferences(), [], 'a corrupt store reads as empty')
})

const withFetch = async (impl, run) => {
  const calls = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url).replace(/^https?:\/\/[^/]+/, ''), method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null, credentials: init.credentials })
    return impl(calls.at(-1))
  }
  try { await run(calls) } finally { globalThis.fetch = original }
}
const ok = (data = {}) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) })

test('saving goes to the server: create, and edit / archive for every row behind a record', async () => {
  assert.equal(serverId('srv-28'), 28)
  assert.deepEqual(toPayload({ type: 'Textbook', title: ' T ', authors: 'A', isbn: '', year: '2020', link: '  ', publisher: undefined, usedInCourses: ['X'] }), {
    type: 'Textbook', title: 'T', authors: 'A', year: '2020'
  })

  await withFetch(() => ok(), async (calls) => {
    await createReference({ type: 'Online Resource', title: 'T', link: 'https://x.org' })
    await updateReference({ id: 'srv-28', sourceIds: [28, 38] }, { type: 'Online Resource', title: 'T2', link: 'https://x.org' })
    await setArchived({ id: 'srv-28', sourceIds: [28, 38] }, true)
    await setArchived({ id: 'srv-40' }, false)
    assert.deepEqual(calls.map(c => `${c.method} ${c.url}`), [
      'POST /api/references',
      'PUT /api/references/28', 'PUT /api/references/38',
      'PUT /api/references/28/archive', 'PUT /api/references/38/archive',
      'PUT /api/references/40/unarchive'
    ])
    assert.deepEqual(calls[0].body, { type: 'Online Resource', title: 'T', link: 'https://x.org' })
    assert.equal(calls[0].credentials, 'include')
  })
})

test('a failed save stops and reports, it does not pretend to have saved', async () => {
  await withFetch((call) => (call.url.endsWith('/38')
    ? { ok: false, status: 400, text: async () => '{"message":"The reference is not valid.","errors":{"link":"Enter a valid http(s) link"}}' }
    : ok()), async (calls) => {
    await assert.rejects(updateReference({ id: 'srv-28', sourceIds: [28, 38, 39] }, { type: 'Online Resource', title: 'T', link: 'x' }), /HTTP 400/)
    assert.equal(calls.length, 2, 'it stops at the first failure')
  })
})

test('import sends the rows and the dry-run flag', async () => {
  await withFetch(() => ok({ total: 1 }), async (calls) => {
    await importReferences([{ type: 'Textbook', title: 'T' }], { dryRun: true })
    await importReferences([{ type: 'Textbook', title: 'T' }])
    assert.deepEqual(calls.map(c => c.body.dryRun), [true, false])
    assert.equal(calls[0].url, '/api/references/import')
  })
})

test('the old localStorage reference store is gone from the code base', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  assert.equal(fs.existsSync(path.join(root, 'utils', 'referenceLibrary.js')), false)
  const offenders = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.js') && /utils\/referenceLibrary(\.js)?['"]/.test(fs.readFileSync(full, 'utf8'))) offenders.push(path.relative(root, full))
    }
  }
  walk(root)
  assert.deepEqual(offenders, [])
})
