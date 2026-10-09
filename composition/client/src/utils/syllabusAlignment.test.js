import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSyllabusHtml } from './syllabusPdfHtml.js'
import { workflowFromLogs } from './workflowFromLogs.js'

// Pages 2 and 3 of the syllabus carry the program's own PEOs, mission marks and outcomes.
const plain = (html) => html.replace(/&#x2F;/g, '/')
const syllabus = { code: 'BCS101', name: 'Intro', revision: 0, instructor: 'X' }
const workflow = workflowFromLogs([], 'BCS101')
const alignment = {
  program: { id: 2, name: 'Bachelor of Science in Computer Science', department: 'School of Computer and Information Sciences' },
  peos: [
    { statement: 'First <b>PEO</b>', missionAligned: true },
    { statement: 'Second PEO', missionAligned: false },
    { statement: 'Third PEO', missionAligned: true },
    { statement: 'Fourth PEO', missionAligned: true }
  ],
  outcomes: [
    { text: 'Outcome one', peos: [1, 4], gas: [2] },
    { text: 'Outcome two', peos: [3], gas: [1, 4] }
  ]
}

test('the syllabus shows the program\'s department, name, PEOs and outcomes, escaped', () => {
  const html = plain(buildSyllabusHtml(syllabus, 'BCS101', workflow, '', { programAlignment: alignment }))
  assert.match(html, /School of Computer and Information Sciences/)
  assert.match(html, /Program: Bachelor of Science in Computer Science/)
  assert.match(html, /1\. First &lt;b&gt;PEO&lt;\/b&gt;/)
  assert.match(html, /Outcome one/)
  assert.match(html, /Outcome two/)
  assert.doesNotMatch(html, /First <b>PEO/, 'a PEO is never inserted as markup')
})

test('the PO table has one column per PEO, and none of the BSIT sample text leaks in', () => {
  const html = plain(buildSyllabusHtml(syllabus, 'BCS101', workflow, '', { programAlignment: alignment }))
  assert.match(html, /colspan="10"/, '4 PEO columns + 6 fixed columns')
  assert.doesNotMatch(html, /Utilize competently the acquired technical/)
  assert.doesNotMatch(html, /Apply knowledge in computing, science, and mathematics/)
})

test('a program with no data yet gets empty tables, not the BSIT sample', () => {
  for (const missing of [null, { program: { name: 'P', department: 'D' }, peos: [], outcomes: [] }]) {
    const html = plain(buildSyllabusHtml(syllabus, 'BCS101', workflow, '', { programAlignment: missing }))
    assert.doesNotMatch(html, /Utilize competently the acquired technical/)
    assert.doesNotMatch(html, /Apply knowledge in computing, science, and mathematics/)
    assert.doesNotMatch(html, /DEPARTMENT NAME/)
  }
})

test('without programAlignment the built-in sample is unchanged (older callers)', () => {
  const html = plain(buildSyllabusHtml(syllabus, 'BCS101', workflow, ''))
  assert.match(html, /Utilize competently the acquired technical/)
  assert.match(html, /DEPARTMENT NAME/)
})
