import test from 'node:test'
import assert from 'node:assert/strict'
import { navigationIconName } from './navigationIcons.js'

const DESTINATIONS = [
  'Learning Plan',
  'CO & PO Alignment',
  'PO & PEO Alignment',
  'COAEP',
  'Reference Library',
  'Course Catalog',
  'Approved Plans',
]

test('every retained navigation destination has its own meaningful icon', () => {
  const iconNames = DESTINATIONS.map(navigationIconName)

  assert.ok(iconNames.every(Boolean), 'every destination must resolve to an icon')
  assert.equal(new Set(iconNames).size, DESTINATIONS.length, 'navigation destinations must not reuse one generic icon')
})

test('navigation icons describe alignment, upload, catalog, and approval actions', () => {
  assert.equal(navigationIconName('CO & PO Alignment'), 'GitMerge')
  assert.equal(navigationIconName('PO & PEO Alignment'), 'Target')
  assert.equal(navigationIconName('COAEP'), 'UploadCloud')
  assert.equal(navigationIconName('Course Catalog'), 'Layers')
  assert.equal(navigationIconName('Approved Plans'), 'CheckCircle')
})
