import test from 'node:test'
import assert from 'node:assert/strict'
import { healthIssues, healthSummary, toHealthCsv } from './referenceHealth.js'

const options = { years: 5, currentYear: 2026 }
const good = { id: 'srv-1', title: 'Clean Code', authors: 'Martin', type: 'Textbook', year: 2024, isbn: '9780132350884', status: 'available', copies: 3 }

test('a recent, available textbook with an ISBN is healthy', () => {
  assert.deepEqual(healthIssues(good, options), [])
})

test('what makes a record need attention', () => {
  assert.deepEqual(healthIssues({ ...good, status: 'lost' }, options), ['Not available: lost'])
  assert.deepEqual(healthIssues({ ...good, copies: 0 }, options), ['Not available: no copies left'])
  assert.deepEqual(healthIssues({ ...good, year: 2021 }, options), ['Published 2021, 5 years ago or more'])
  assert.deepEqual(healthIssues({ ...good, year: 2022 }, options), [])
  assert.deepEqual(healthIssues({ ...good, year: '' }, options), ['No publication year'])
  assert.deepEqual(healthIssues({ ...good, isbn: '' }, options), ['No ISBN'])
  assert.deepEqual(healthIssues({ id: 'srv-2', type: 'Online Resources', year: 2025, link: '' }, options), ['No link'])
})

test('the recency rule is the Director\'s: 3 years makes a 2023 title old', () => {
  assert.deepEqual(healthIssues({ ...good, year: 2023 }, { years: 3, currentYear: 2026 }), ['Published 2023, 3 years ago or more'])
})

test('the summary counts each kind once per record', () => {
  const records = [good, { ...good, id: 'srv-3', status: 'withdrawn', year: 2010 }, { ...good, id: 'srv-4', isbn: '' }]
  assert.deepEqual(healthSummary(records, options), { total: 3, needAttention: 2, unavailable: 1, outdated: 1, noYear: 0, noIsbn: 1, noLink: 0 })
})

test('the report lists only records with issues, safe to open in a spreadsheet', () => {
  const records = [good, { ...good, id: 'srv-5', title: '=HYPERLINK("x")', status: 'lost', usedInCourses: ['BIT1', 'BIT2'] }]
  const lines = toHealthCsv(records, options).split('\r\n')
  assert.equal(lines.length, 2)
  assert.match(lines[0], /^ID,Title,Authors,Type,Year,ISBN,Copies,Status,Category,Used in courses,Issues$/)
  assert.match(lines[1], /srv-5,"'=HYPERLINK\(""x""\)"/)
  assert.match(lines[1], /BIT1; BIT2,Not available: lost$/)
})
