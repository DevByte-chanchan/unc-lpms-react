import test from 'node:test'
import assert from 'node:assert/strict'
import { findGrammarIssues } from './grammarRules.js'

// Apply every issue's first suggestion, right to left, the way the "fix all" button does.
const fixAll = (text) => findGrammarIssues(text)
  .filter(i => i.suggestions.length === 1)
  .sort((a, b) => b.offset - a.offset)
  .reduce((t, i) => t.slice(0, i.offset) + i.suggestions[0] + t.slice(i.offset + i.length), text)

test('clean text has nothing to flag', () => {
  assert.deepEqual(findGrammarIssues('The students need more practice with assessment. It is due on Friday.'), [])
  assert.deepEqual(findGrammarIssues(''), [])
  assert.deepEqual(findGrammarIssues('Use e.g. this one, i.e. the newer edition. Version 3.5 works.'), [])
  assert.deepEqual(findGrammarIssues('An hour, a user, a unit, an ILO and an SQL lab.'), [])
})

test('each rule finds its mistake and the fix is right', () => {
  assert.equal(fixAll('Their is a problem with the the lab'), 'There is a problem with the lab')
  assert.equal(fixAll('add a ILO for this topic.'), 'Add an ILO for this topic.')
  assert.equal(fixAll('This needs an topic.'), 'This needs a topic.')
  assert.equal(fixAll('I think i agree.'), 'I think I agree.')
  assert.equal(fixAll('Good work. please add a lab.'), 'Good work. Please add a lab.')
  assert.equal(fixAll('Add labs ,quizzes and a project .'), 'Add labs, quizzes and a project.')
  assert.equal(fixAll('Add labs,quizzes and projects.'), 'Add labs, quizzes and projects.')
  assert.equal(fixAll('Add  one  space.'), 'Add one space.')
  assert.equal(fixAll('You should of added more then one lab.'), 'You should have added more than one lab.')
  assert.equal(fixAll('Its a good start.'), 'It’s a good start.')
})

test('issues carry offsets that point at the words, and never overlap', () => {
  const text = 'their is a issue'
  const issues = findGrammarIssues(text)
  for (const i of issues) assert.equal(text.slice(i.offset, i.offset + i.length), i.word)
  for (let k = 1; k < issues.length; k++) assert.ok(issues[k].offset >= issues[k - 1].offset + issues[k - 1].length)
  assert.ok(issues.every(i => i.source === 'grammar'))
})
