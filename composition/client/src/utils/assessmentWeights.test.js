import test from 'node:test'
import assert from 'node:assert/strict'
import { PERIODS, periodLabel, periodCode, parseWeight, weightProblems } from './assessmentWeights.js'

const a = (iedLevel, weight, isOrientation = false, period = 'p') => ({ iedLevel, weight, isOrientation, period })
const full = (period) => [a('I', '20', false, period), a('E', '30', false, period), a('D', '50', false, period)]
const otherPeriods = [...full('m'), ...full('s'), ...full('f')]

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

test('20 / 30 / 50 within each period passes however it is split', () => {
  assert.deepEqual(weightProblems([...full('p'), ...otherPeriods]), [])
  assert.deepEqual(weightProblems([a('I', '20'), a('E', '30'), a('D', '20'), a('D', '30'), ...otherPeriods]), [])
  assert.deepEqual(weightProblems([a('I', '5'), a('I', '15'), a('E', '7.5'), a('E', '22.5'), a('D', '50'), ...otherPeriods]), [])
})

test('a rounded split passes, a real gap does not', () => {
  assert.deepEqual(weightProblems([a('I', '6.67'), a('I', '6.67'), a('I', '6.67'), a('E', '30'), a('D', '50'), ...otherPeriods]), [])
  assert.equal(weightProblems([a('I', '20.1'), a('E', '30'), a('D', '50'), ...otherPeriods]).length, 1)
})

test('a missed level is reported with its period and actual total', () => {
  assert.deepEqual(weightProblems([a('I', '15'), a('E', '30'), a('D', '55'), ...otherPeriods]), [
    'Prelim: Introductory assessment weights total 15%, but must total 20%.',
    'Prelim: Demonstrative assessment weights total 55%, but must total 50%.'
  ])
})

test('no assessments fails every level of every period; orientation rows are ignored', () => {
  assert.equal(weightProblems([]).length, 12)
  assert.deepEqual(weightProblems([...full('p'), ...otherPeriods, a('I', '40', true)]), [])
})
