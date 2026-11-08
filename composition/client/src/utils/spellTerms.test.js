import test from 'node:test'
import assert from 'node:assert/strict'
import { termWords, findIssues, setWordList } from './spellSuggest.js'
import { WORDS } from './wordList.js'

test('the words of a plan’s own names are skipped; real typos are still flagged', () => {
  setWordList(WORDS)
  const skip = termWords(['Kubernetes Orchestration Basics', 'Ibryam, B.', null])
  assert.ok(skip.has('kubernetes') && skip.has('ibryam') && skip.has('basics'))
  const flagged = findIssues('Add kubernetes labs and fix the studnets list').map(i => i.word.toLowerCase()).filter(w => !skip.has(w))
  assert.ok(flagged.includes('studnets'))
  assert.ok(!flagged.includes('kubernetes'))
})

test('the text box offers Ignore and passes the plan terms through', async () => {
  const fs = await import('node:fs')
  const box = fs.readFileSync(new URL('../components/SpellCheckArea.jsx', import.meta.url), 'utf8')
  const dialog = fs.readFileSync(new URL('../components/ApprovalCommentBox.jsx', import.meta.url), 'utf8')
  assert.match(box, /onClick=\{\(\) => ignore\(open\.issue\)\}/)
  assert.match(box, /localCheck\(value, skip\)/)
  assert.equal((dialog.match(/knownWords=\{planTerms\}/g) || []).length, 2)
})
