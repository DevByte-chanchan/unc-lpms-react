import test from 'node:test'
import assert from 'node:assert/strict'

import { planLazyImportRecovery } from './lazyImportRecovery.js'

const PAGE_URL = 'http://localhost:5173/role/program-head/courses/BIT321L?status=pending'
const MODULE_URL = 'http://localhost:5173/src/pages/ApprovalSyllabus.jsx?t=1788150744308'

test('a failed lazy module reloads once and the same failure cannot loop', () => {
  const error = new TypeError(`Failed to fetch dynamically imported module: ${MODULE_URL}`)

  const first = planLazyImportRecovery(error, PAGE_URL, null)
  assert.deepEqual(first, {
    shouldReload: true,
    signature: `${PAGE_URL}::${MODULE_URL}`,
  })

  assert.deepEqual(planLazyImportRecovery(error, PAGE_URL, first.signature), {
    shouldReload: false,
    signature: first.signature,
  })
})

test('ordinary rendering errors never trigger a page reload', () => {
  assert.deepEqual(planLazyImportRecovery(new Error('Cannot read properties of undefined'), PAGE_URL, null), {
    shouldReload: false,
    signature: null,
  })
})
