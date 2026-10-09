import test from 'node:test'
import assert from 'node:assert/strict'
import { offeringKey, offeringPath, revisionOf } from './offeringKey.js'

test('an approved revision is addressed by offering id and revision number', () => {
  assert.equal(offeringKey(14, 2), '14/2')
  assert.equal(offeringKey('14', '2'), '14/2')
  assert.equal(offeringPath(14, 2, 'approved'), '/courses/14/2/approved')
})

test('a working copy has no revision number and is addressed by its offering id alone', () => {
  for (const none of [0, '0', null, undefined, '', 'undefined']) {
    assert.equal(offeringKey(16, none), '16', String(none))
    assert.equal(offeringPath(16, none, 'draft'), '/offerings/16/draft', String(none))
  }
})

test('revisionOf treats 0 as "no revision yet"', () => {
  assert.equal(revisionOf(0), null)
  assert.equal(revisionOf(3), 3)
  assert.equal(revisionOf('x'), null)
})
