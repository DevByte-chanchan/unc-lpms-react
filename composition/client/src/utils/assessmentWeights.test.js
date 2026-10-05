import test from 'node:test'
import assert from 'node:assert/strict'
import { PERIODS, periodLabel, periodCode, parseWeight, weightProblems } from './assessmentWeights.js'

const a = (iedLevel, weight, isOrientation = false) => ({ iedLevel, weight, isOrientation })

test('period labels and codes round-trip', () => {
  assert.deepEqual(PERIODS.map(period => period.label), ['Prelim', 'Midterm', 'Semi-final', 'Final'])
  for (const { code, label } of PERIODS) {
    assert.equal(periodCode(periodLabel(code)), code)
    assert.equal(periodLabel(code), label)
  }
  assert.equal(periodCode(''), '')
})

test('parseWeight accepts positive numbers up to 100, with an optional percent sign', () => {
  assert.equal(parseWeight('12.5'), 12.5)
  assert.equal(parseWeight(' 20% '), 20)
  for (const bad of ['', '0', '-5', '101', 'abc', '1e1', '.5', null, undefined]) assert.equal(parseWeight(bad), null, String(bad))
})

test('20 / 30 / 50 across the course passes however it is split', () => {
  assert.deepEqual(weightProblems([a('I', '20'), a('E', '30'), a('D', '20'), a('D', '30')]), [])
  assert.deepEqual(weightProblems([a('I', '5'), a('I', '15'), a('E', '7.5'), a('E', '22.5'), a('D', '50')]), [])
})

test('rounding a hundredth off passes, a real gap does not', () => {
  assert.deepEqual(weightProblems([a('I', '6.67'), a('I', '6.67'), a('I', '6.67'), a('E', '30'), a('D', '50')]), [])
  assert.equal(weightProblems([a('I', '20.1'), a('E', '30'), a('D', '50')]).length, 1)
})

test('a level that misses its total is reported with the actual total', () => {
  assert.deepEqual(weightProblems([a('I', '15'), a('E', '30'), a('D', '55')]), [
    'Introductory assessment weights total 15%, but must total 20%.',
    'Demonstrative assessment weights total 55%, but must total 50%.'
  ])
})

test('no assessments fails every level; orientation assessments are ignored', () => {
  assert.equal(weightProblems([]).length, 3)
  assert.deepEqual(weightProblems([a('I', '20'), a('E', '30'), a('D', '50'), a('I', '40', true)]), [])
})
