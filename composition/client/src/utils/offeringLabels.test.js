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

test('a program is named by its initials, as the university writes them', async () => {
  const { programShort } = await import('./offeringLabels.js')
  assert.equal(programShort('Bachelor of Science in Information Technology'), 'BSIT')
  assert.equal(programShort('Bachelor of Science in Computer Science'), 'BSCS')
  assert.equal(programShort('Associate in Computer Technology'), 'ACT')
  assert.equal(programShort('Bachelor of Library and Information Science'), 'BLIS')
  assert.equal(programShort(''), '')
})

test('courseOptions: one option per offering, newest term first, opens on the newest term', async () => {
  const { courseOptions } = await import('./offeringLabels.js')
  const row = (id, code, year, extra = {}) => ({ ProgramCourseOffering: { pc_offering_id: id, school_year: year, semester: '1st', revision_number: 1,
    Course: { course_no: code, course_title: 'T' }, Program: { name: 'Bachelor of Science in Information Technology' }, ...extra } })
  const { options, selected } = courseOptions([row(1, 'B1', '2025-2026'), row(2, 'B1', '2027-2028', { carried_from_offering_id: 1 }),
    row(3, 'A1', '2026-2027', { revision_number: 0 }), row(1, 'B1', '2025-2026')])
  assert.deepEqual(options.map(o => o.label), ['A1 — T · 2026-2027 · 1st sem · Working copy',
    'B1 — T · 2027-2028 · 1st sem · Carried over (Rev 1)', 'B1 — T · 2025-2026 · 1st sem · Rev 1'])
  assert.equal(selected, '2')
  const two = courseOptions([row(1, 'B1', '2025-2026'), row(4, 'B1', '2025-2026', { Program: { name: 'Associate in Computer Technology' } })])
  assert.deepEqual(two.options.map(o => o.label.split(' · ')[1]).sort(), ['ACT', 'BSIT'])
  assert.deepEqual(courseOptions([]), { options: [], selected: '' })
})
