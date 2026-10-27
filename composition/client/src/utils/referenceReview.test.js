import test from 'node:test'
import assert from 'node:assert/strict'
import { issuesOf, reviewReferences, reviewSummary } from './referenceReview.js'

const now = new Date('2026-10-27T00:00:00Z')
const good = { id: 1, title: 'Clean Code', authors: 'Martin', typeKey: 'Textbook', isbn: '9780132350884', year: 2024, status: 'available', copies: 3 }
const options = { now }

test('a current, available textbook with an ISBN has no issue', () => {
  assert.deepEqual(issuesOf(good, options), [])
})

test('lost, withdrawn and zero-copy titles are flagged as not available', () => {
  assert.deepEqual(issuesOf({ ...good, status: 'lost' }, options), ['Not available: lost'])
  assert.deepEqual(issuesOf({ ...good, status: 'withdrawn' }, options), ['Not available: withdrawn'])
  assert.deepEqual(issuesOf({ ...good, copies: 0 }, options), ['Not available: no copies left'])
})

test('an old title says how old, and a missing year is its own issue', () => {
  assert.deepEqual(issuesOf({ ...good, year: 2015 }, options), ['Published 2015, before 2022'])
  assert.deepEqual(issuesOf({ ...good, year: '-' }, options), ['No publication year'])
})

test('a textbook needs an ISBN; any other type needs a link', () => {
  assert.deepEqual(issuesOf({ ...good, isbn: '-' }, options), ['No ISBN'])
  const site = { id: 2, title: 'Docs', authors: 'MDN', typeKey: 'Online Resources', link: '#', year: 2025 }
  assert.deepEqual(issuesOf(site, options), ['No link'])
  assert.deepEqual(issuesOf({ ...site, link: 'https://example.org' }, options), [])
})

test('the same title and authors attached twice is flagged on both', () => {
  const twin = { ...good, id: 9 }
  assert.deepEqual(issuesOf(good, { ...options, all: [good, twin] }), ['Listed more than once in this plan'])
  assert.deepEqual(issuesOf(twin, { ...options, all: [good, twin] }), ['Listed more than once in this plan'])
})

test('flagged references come first, and the summary counts them', () => {
  const bad = { ...good, id: 3, title: 'Old', status: 'lost' }
  const rows = reviewReferences([good, bad], options)
  assert.deepEqual(rows.map(row => row.ref.id), [3, 1])
  assert.deepEqual(reviewSummary(rows), { tone: 'flagged', text: '1 of 2 references needs a look.' })
  assert.deepEqual(reviewSummary(reviewReferences([good], options)), { tone: 'clean', text: 'No issues found in 1 reference.' })
  assert.deepEqual(reviewSummary([]), { tone: 'none', text: '' })
})
