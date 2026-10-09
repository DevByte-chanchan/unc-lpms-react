import test from 'node:test'
import assert from 'node:assert/strict'
import { revisionLabel, termLabel, historyRevisionLabel } from './offeringLabels.js'

test('an approved revision shows its number', () => {
  assert.equal(revisionLabel({ revision_number: 2 }), 'Rev 2')
  assert.equal(historyRevisionLabel({ revNum: 2 }), 'Revision 2')
})

test('a carried-over offering is marked with the revision it carries', () => {
  assert.equal(revisionLabel({ revision_number: 2, carried_from_offering_id: 14 }), 'Carried over (Rev 2)')
  assert.equal(historyRevisionLabel({ revNum: 2, carriedOver: true }), 'Carried over (Rev 2)')
})

test('a working copy has no revision number yet', () => {
  assert.equal(revisionLabel({ revision_number: 0 }), 'Working copy')
  assert.equal(historyRevisionLabel({ revNum: null, workingCopy: true }), 'Working copy')
})

test('the term reads school year and semester, and is blank when unknown', () => {
  assert.equal(termLabel({ school_year: '2027-2028', semester: '1st' }), '2027-2028 · 1st sem')
  assert.equal(termLabel({}), '')
})
