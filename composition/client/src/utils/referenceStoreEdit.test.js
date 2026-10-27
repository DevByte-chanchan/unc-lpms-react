import test from 'node:test'
import assert from 'node:assert/strict'

// Browser stubs so the store runs under plain node.
const store = new Map()
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} }
globalThis.Event = class { constructor(type) { this.type = type } }

const { updateReference } = await import('./referenceStore.js')

const values = { type: 'Textbook', title: 'T', authors: 'A', isbn: '9789990000001', year: '2024' }

test('editing a library record sends each identical row the ids of the others, so they are not refused as duplicates', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), method: options.method }); return { ok: true, status: 200, json: async () => ({}) } }
  await updateReference({ id: 'srv-1', sourceIds: [1, 2, 3] }, values)
  assert.deepEqual(calls.map(c => c.method), ['PUT', 'PUT', 'PUT'])
  assert.match(calls[0].url, /\/api\/references\/1\?with=2,3$/)
  assert.match(calls[1].url, /\/api\/references\/2\?with=1,3$/)
  assert.match(calls[2].url, /\/api\/references\/3\?with=1,2$/)
})

test('a record with a single row sends no with parameter', async () => {
  const calls = []
  globalThis.fetch = async (url) => { calls.push(String(url)); return { ok: true, status: 200, json: async () => ({}) } }
  await updateReference({ id: 'srv-7', sourceIds: [7] }, values)
  assert.equal(calls.length, 1)
  assert.match(calls[0], /\/api\/references\/7$/)
})
