import test from 'node:test'
import assert from 'node:assert/strict'
import { IED_LEVELS, DEFAULT_TARGET, levelLabel, levelCode, parsePercent, targetSentence } from './iedLevels.js'

test('level weights add up to 100 percent of the course', () => {
  assert.equal(IED_LEVELS.reduce((sum, level) => sum + level.weight, 0), 100)
  assert.deepEqual(IED_LEVELS.map(level => level.weight), [20, 30, 50])
})

test('a level label round-trips to its code', () => {
  for (const { code } of IED_LEVELS) assert.equal(levelCode(levelLabel(code)), code)
  assert.equal(levelCode(''), null)
  assert.equal(levelLabel(null), '')
})

test('parsePercent accepts whole numbers 1-100 only', () => {
  assert.equal(parsePercent('90'), 90)
  assert.equal(parsePercent(' 60 '), 60)
  for (const bad of ['', '0', '101', '9.5', '-5', 'abc', '1e2', null, undefined]) assert.equal(parsePercent(bad), null, String(bad))
})

test('the default target reads as the official COAEP wording', () => {
  assert.equal(
    targetSentence(DEFAULT_TARGET.studentsPercent, DEFAULT_TARGET.scorePercent),
    'At least 90% of enrolled students with a rating of at least 60% of the total score'
  )
})
