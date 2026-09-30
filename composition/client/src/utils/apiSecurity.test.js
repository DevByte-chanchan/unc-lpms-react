import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const store = new Map()
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: key => store.delete(key)
}
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }
globalThis.Event = class { constructor(type) { this.type = type } }
globalThis.fetch = async () => { throw new Error('no server in this test') }

const { fetchJson } = await import('./api.js')
const { getSession, setSession } = await import('./session.js')

test('API requests include the HttpOnly session cookie while preserving caller options', async () => {
  const originalFetch = globalThis.fetch
  let observed
  globalThis.fetch = async (url, options) => {
    observed = { url: String(url), options }
    return { ok: true, json: async () => ({ ok: true }) }
  }

  try {
    await fetchJson('/api/comments/by-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(observed.options.credentials, 'include')
  assert.equal(observed.options.method, 'POST')
  assert.equal(observed.options.body, '{}')
});

test('a protected API 401 clears the stale browser identity immediately', async () => {
  const originalFetch = globalThis.fetch
  setSession({ id: 4, name: 'CRUZ, ROBERTO', role: 'industry-consultant' })
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => '{"error":"Authentication required."}'
  })

  try {
    await assert.rejects(() => fetchJson('/api/assignments'), /HTTP 401/)
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(getSession(), null)
});

test('protected PDF source requests include the session cookie', async () => {
  const source = await readFile(new URL('../components/PDFViewerModal.jsx', import.meta.url), 'utf8')
  assert.match(source, /fetch\(src,\s*\{\s*credentials:\s*['"]include['"]\s*\}\)/)
  assert.doesNotMatch(source, /\/api\/export-pdf/)
})
