import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { availabilityOf, isAttachable, unavailableReason, DEFAULT_CATALOG_SETTINGS } from './referenceCatalog.js'
import { normalizeReferenceLibraryRows } from './referenceDiscovery.js'
import { toPayload } from './referenceStore.js'

test('a lost or withdrawn title, or one with no copies left, is unavailable and says why', () => {
  assert.equal(unavailableReason({ status: 'lost' }), 'lost')
  assert.equal(unavailableReason({ status: 'Withdrawn' }), 'withdrawn')
  assert.equal(unavailableReason({ status: 'available', copies: 0 }), 'no copies left')
  assert.equal(availabilityOf({ reference_id: 5, status: 'lost' }), 'unavailable')
})

test('an unknown number of copies is not the same as none', () => {
  assert.equal(unavailableReason({ status: 'available', copies: null }), '')
  assert.equal(unavailableReason({ status: 'available' }), '')
  assert.equal(unavailableReason({ status: 'available', copies: 3 }), '')
  assert.equal(availabilityOf({ reference_id: 5, status: 'available', copies: null }), 'library')
})

test('an unavailable title cannot be attached, even when the library-availability setting is off', () => {
  assert.equal(isAttachable({ reference_id: 5, status: 'withdrawn' }), false)
  assert.equal(isAttachable({ reference_id: 5, copies: 0 }, { ...DEFAULT_CATALOG_SETTINGS, requireLibraryAvailability: false }), false)
  assert.equal(isAttachable({ reference_id: 5, status: 'available', copies: 2 }), true)
})

test('library records carry copies, status, category and the date received', () => {
  const [record] = normalizeReferenceLibraryRows([{
    reference_id: 7, title: 'Book', author: 'A', type: 'Textbook', copies: 4, status: 'LOST', category: 'Databases', date_received: '2024-02-01 00:00:00'
  }])
  assert.deepEqual([record.copies, record.status, record.category, record.received], [4, 'lost', 'Databases', '2024-02-01'])
  const [bare] = normalizeReferenceLibraryRows([{ reference_id: 8, title: 'Old', author: 'B', type: 'OER' }])
  assert.deepEqual([bare.copies, bare.status, bare.category, bare.received], [null, 'available', '', ''])
})

test('the save payload sends the new fields, and a zero count is kept', () => {
  const payload = toPayload({ type: 'Textbook', title: 'T', copies: '0', status: 'lost', category: ' Networks ', received: '2024-02-01' })
  assert.deepEqual(payload, { type: 'Textbook', title: 'T', copies: '0', status: 'lost', category: 'Networks', received: '2024-02-01' })
})

test('the reference form draws a choice as a dropdown and the picker explains an unavailable title', () => {
  const fields = readFileSync(new URL('../components/ReferenceFields.jsx', import.meta.url), 'utf8')
  assert.match(fields, /field\.kind === 'choice'/)
  const picker = readFileSync(new URL('../components/ReferencePicker.jsx', import.meta.url), 'utf8')
  assert.match(picker, /ref\.unavailableReason/)
})
