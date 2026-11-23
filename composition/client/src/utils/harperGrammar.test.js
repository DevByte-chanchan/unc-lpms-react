import test from 'node:test'
import assert from 'node:assert/strict'
import { LocalLinter } from 'harper.js'
import { binaryInlined } from 'harper.js/binaryInlined'
import { toIssues, withHarper, OFF, LINT_OPTIONS } from './harperGrammar.js'

// A real Harper linter (the in-process one; the browser uses the worker one), set up as the app sets it up.
const linter = new LocalLinter({ binary: binaryInlined })
const ready = (async () => {
  await linter.setup()
  await linter.setLintConfig({ ...(await linter.getLintConfig()), ...OFF })
})()
const check = async (text) => { await ready; return toIssues(text, await linter.lint(text, LINT_OPTIONS)) }

test('Harper finds grammar the built-in rules miss, in the text box shape', async () => {
  const text = 'Please complete there project before Friday.'
  const [issue] = await check(text)
  assert.equal(issue.word, 'there')
  assert.equal(text.slice(issue.offset, issue.offset + issue.length), 'there')
  assert.ok(issue.suggestions.includes('their'))
  assert.equal(issue.source, 'grammar')
})

test('no spelling from Harper: Filipino, Bikol and course codes are left to our own word lists', async () => {
  const issues = await check('Ito ay para sa klase ng BSIT at MATH311L. Salamat po, mga estudyante, sa inyong tulong kaya ini-review ko.')
  assert.deepEqual(issues, [])
})

test('offsets stay right after an emoji (harper.js gives UTF-16 offsets)', async () => {
  const text = 'Great 👍 Please complete there project before Friday.'
  const issue = (await check(text)).find(i => i.word === 'there')
  assert.ok(issue, 'still found')
  assert.equal(text.slice(issue.offset, issue.offset + issue.length), 'there')
})

test('withHarper adds only what does not overlap an issue already there, and skips ignored words', () => {
  const own = [{ offset: 0, length: 5, word: 'Teh', source: 'spelling' }]
  const harper = [
    { offset: 2, length: 3, word: 'x', source: 'grammar' },
    { offset: 10, length: 5, word: 'there', source: 'grammar' },
    { offset: 20, length: 4, word: 'Bsit', source: 'grammar' }
  ]
  assert.deepEqual(withHarper(own, harper, new Set(['bsit'])).map(i => i.word), ['Teh', 'there'])
  assert.equal(withHarper(own, []), own)
})
