import test from 'node:test'
import assert from 'node:assert/strict'
import { weekRowsOf, withWeekRows, parseCommentPlace } from './weeklyCoverage.js'

const coverage = {
  orientation: { intendedLearningOutcome: 'VMO', deliveryWeek: 'Week 1', allocatedTime: '(2 hrs)', topics: [{ title: 'Orientation' }], tlas: [{ tlaName: 'Walkthrough' }], references: ['OR1 - Handbook'] },
  courseOutcomes: [
    { coNumber: 1, coDescription: 'First', ilos: [{ label: 'ILO1', description: 'Compare' }], weeks: [
      { week_id: 33, weekNumberInCo: 1, computedWeekNumber: 1, deliveryWeek: 'Week 1', allocatedTime: '(3 hrs)', topics: [{ title: 'Runtimes' }], tlas: [{ tlaName: 'Lecture' }], references: ['TB1 - Scott'] },
      { week_id: 'empty-1', weekNumberInCo: 2 }
    ] },
    { coNumber: 2, coDescription: 'Second', ilos: [], weeks: [{ week_id: 37, weekNumberInCo: 1, computedWeekNumber: 5, topics: [], tlas: [], references: [] }] }
  ],
  topics: [], assessments: []
}

test('one row per week plus the orientation, with ids that say where a comment goes', () => {
  const rows = weekRowsOf(coverage)
  assert.deepEqual(rows.map(r => r.id), ['CO1-O', 'CO1-W1', 'CO2-W1'])
  assert.deepEqual(rows.map(r => r.label), ['CO1 · Course orientation', 'CO1 · Week 1', 'CO2 · Week 5'])
  assert.deepEqual(rows[1].topics, ['Runtimes'])
  assert.deepEqual(rows[1].tlas, ['Lecture'])
  assert.deepEqual(rows[1].references, ['TB1 - Scott'])
  assert.equal(rows[1].intendedLearningOutcome, 'ILO1: Compare')
})

test('an older per-ILO coverage passes through unchanged', () => {
  const old = { ilos: [{ id: 'CO1-ILO1' }] }
  assert.equal(withWeekRows(old), old)
  assert.deepEqual(weekRowsOf(old), old.ilos)
  assert.deepEqual(withWeekRows(coverage).ilos.length, 3)
})

test('comment places parse to a course outcome and a week', () => {
  assert.deepEqual(parseCommentPlace('CO2-W3'), { coIndex: 2, weekIndex: 3 })
  assert.deepEqual(parseCommentPlace('CO1-O'), { coIndex: 1, weekIndex: 1 })
  assert.deepEqual(parseCommentPlace('CO2-ILO1'), { coIndex: 2, iloIndex: 1 })
  assert.equal(parseCommentPlace('nonsense'), null)
})
