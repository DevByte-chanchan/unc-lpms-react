import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Browser stubs so the session module runs under plain node.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
}
globalThis.window = { dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} }
globalThis.Event = class { constructor(type) { this.type = type } }

const { signup, fetchPrivacyNotice } = await import('./session.js')

const answer = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const here = path.dirname(fileURLToPath(import.meta.url))
const read = relative => fs.readFileSync(path.join(here, '..', relative), 'utf8')

test('fetchPrivacyNotice returns the notice, and null when the server is down or answers oddly', async () => {
  const notice = { version: '2026-10-09', dpo: { configured: false }, sections: [{ title: 'T', items: ['x'] }] }
  globalThis.fetch = async () => answer(200, notice)
  assert.deepEqual(await fetchPrivacyNotice(), notice)

  globalThis.fetch = async () => answer(500, {})
  assert.equal(await fetchPrivacyNotice(), null)
  globalThis.fetch = async () => answer(200, { hello: 'world' })
  assert.equal(await fetchPrivacyNotice(), null, 'a body without a version and sections is not a notice')
  globalThis.fetch = async () => { throw new Error('offline') }
  assert.equal(await fetchPrivacyNotice(), null)
})

test('signup sends the accepted notice version with the registration', async () => {
  let sent = null
  globalThis.fetch = async (url, options) => {
    sent = { url: String(url), body: JSON.parse(options.body) }
    return answer(201, { user: { id: 9, name: 'NEW, USER', email: 'new.user@example.test', role: 'instructor' } })
  }
  const result = await signup({ name: 'NEW, USER', email: 'new.user@example.test', password: 'Password-1', role: 'instructor', consentVersion: '2026-10-09' })
  assert.equal(result.ok, true)
  assert.match(sent.url, /\/api\/auth\/register$/)
  assert.equal(sent.body.privacy_consent_version, '2026-10-09')
})

test('a server refusal for missing consent reaches the person as a message', async () => {
  globalThis.fetch = async () => answer(400, { error: 'Read and accept the Privacy Notice to create an account.', code: 'CONSENT_REQUIRED' })
  const result = await signup({ name: 'NEW, USER', email: 'new.user@example.test', password: 'Password-1', role: 'instructor' })
  assert.equal(result.ok, false)
  assert.match(result.error, /Privacy Notice/)
})

test('the registration form needs the checkbox, and the notice page is reachable signed out', () => {
  const login = read('pages/Login.jsx')
  assert.match(login, /type="checkbox"[^>]*checked=\{accepted\}/)
  assert.match(login, /mode === 'signup' && !accepted/)
  assert.match(login, /consentVersion: privacy\?\.version/)
  const app = read('App.jsx')
  assert.match(app, /location\.pathname === '\/privacy'\) return <Privacy \/>/)
  assert.ok(app.indexOf("'/privacy'") < app.indexOf('<Login />'), 'the notice is served before the sign-in gate')
})
