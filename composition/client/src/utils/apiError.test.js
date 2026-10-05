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

test('apiErrorMessage falls back for plain or empty errors', () => {
  assert.equal(apiErrorMessage(new Error('HTTP 500')), 'HTTP 500')
  assert.equal(apiErrorMessage(null, 'Nope'), 'Nope')
  assert.equal(apiErrorMessage(new Error('HTTP 400: {bad json'), 'x'), 'HTTP 400: {bad json')
})
