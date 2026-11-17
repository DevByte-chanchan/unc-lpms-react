import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }
globalThis.Event = class { constructor(type) { this.type = type } }

const { apiErrorMessage } = await import('./api.js')

test('apiErrorMessage pulls the server message out of a fetchJson error', () => {
  const err = new Error('HTTP 409: {"message":"This learning plan is pending and cannot be edited."}')
  assert.equal(apiErrorMessage(err), 'This learning plan is pending and cannot be edited.')
  assert.equal(apiErrorMessage(new Error('HTTP 403: {"error":"No access."}')), 'No access.')
})

test('apiErrorMessage never shows raw or technical text', () => {
  assert.match(apiErrorMessage(new Error('HTTP 500')), /went wrong on our side/)
  assert.equal(apiErrorMessage(null, 'Nope'), 'Nope')
  assert.match(apiErrorMessage(new Error('HTTP 400: {bad json')), /could not be completed/)
  assert.match(apiErrorMessage(new Error('HTTP 400: {"error":"SQLITE_CONSTRAINT: UNIQUE failed"}')), /could not be completed/)
  assert.equal(apiErrorMessage(new Error("Cannot read properties of undefined (reading 'x')"), 'Not saved.'), 'Not saved.')
  assert.match(apiErrorMessage(new TypeError('Failed to fetch')), /could not be reached/)
})
