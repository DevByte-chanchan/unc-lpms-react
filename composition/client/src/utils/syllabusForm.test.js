import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSyllabusHtml, buildCoaepHtml } from './syllabusPdfHtml.js'
import { DEFAULT_FORM_INFO, mergeFormInfo } from './formInfo.js'
import { workflowFromLogs } from './workflowFromLogs.js'

// escapeHtml writes '/' as an entity; a browser renders it as '/'.
const plain = (html) => html.replace(/&#x2F;/g, '/')

const syllabus = { code: 'BIT313L', name: 'Human-Computer Interaction', revision: 2, instructor: 'NORTON, MONICA' }
let tick = 0
const log = (actor_role, action_type, actor_name = null) =>
  ({ actor_role, action_type, actor_name, createdAt: new Date(Date.UTC(2026, 5, 1 + tick++)).toISOString() })
const reviewed = workflowFromLogs([
  log('INSTRUCTOR', 'SUBMITTED', 'NORTON, MONICA'),
  log('LIBRARY_DIRECTOR', 'ACCEPTED', 'SANTOS, MARIA'),
  log('PROGRAM_HEAD', 'ACCEPTED', 'DANILA, JUNAR')
], 'BIT313L')
const approved = workflowFromLogs([
  log('INSTRUCTOR', 'SUBMITTED', 'NORTON, MONICA'),
  log('LIBRARY_DIRECTOR', 'ACCEPTED', 'SANTOS, MARIA'),
  log('PROGRAM_HEAD', 'ACCEPTED', 'DANILA, JUNAR'),
  log('DEAN', 'ACCEPTED', 'REYES, AGNES')
], 'BIT313L')

test('the footer carries the form\'s ISO revision and effectivity from the config, not hardcoded text', () => {
  const formInfo = mergeFormInfo({ syllabus: { revisionNo: '3', effectivity: '08/15/2026' } })
  const html = plain(buildSyllabusHtml(syllabus, 'BIT313L', approved, '', { formInfo }))
  assert.match(html, /Effectivity: 08\/15\/2026/)
  assert.match(html, /Revision No\.: 3/)
  assert.doesNotMatch(html, /Effectivity: 06\/01\/2024/)
})

test('without settings the footer falls back to the previous values', () => {
  const html = plain(buildSyllabusHtml(syllabus, 'BIT313L', approved, ''))
  assert.match(html, /Effectivity: 06\/01\/2024/)
  assert.match(html, /Revision No\.: 0/)
  assert.match(html, new RegExp(DEFAULT_FORM_INFO.syllabus.docControlNo))
})

test('the syllabus\'s own revision number stays in the body and is separate from the form revision', () => {
  const html = buildSyllabusHtml(syllabus, 'BIT313L', approved, '', { formInfo: mergeFormInfo({ syllabus: { revisionNo: '9' } }) })
  assert.match(html, /Syllabus Revision No\.[\s\S]{0,200}>2</)
  assert.match(html, /Revision No\.: 9/)
})

test('a later form setting does not leak into the next build (one config per build)', () => {
  buildSyllabusHtml(syllabus, 'X', approved, '', { formInfo: mergeFormInfo({ syllabus: { effectivity: '01/01/2030' } }) })
  assert.match(plain(buildSyllabusHtml(syllabus, 'X', approved, '')), /Effectivity: 06\/01\/2024/)
})

test('the COAEP uses its own form identity', () => {
  const html = plain(buildCoaepHtml({ header: { course: 'X' }, cos: [], approved: true }, '', { formInfo: mergeFormInfo({ coaep: { effectivity: '09/09/2026', docControlNo: 'UNC-FM-VPAA-02' } }) }))
  assert.match(html, /Effectivity: 09\/09\/2026/)
  assert.match(html, /UNC-FM-VPAA-02/)
})

test('the approval block fills names and dates from the workflow log', () => {
  const html = buildSyllabusHtml(syllabus, 'BIT313L', approved, '')
  assert.match(html, /SANTOS, MARIA/)
  assert.match(html, /DANILA, JUNAR/)
  assert.match(html, /REYES, AGNES/)
})

test('a step that has not accepted yet stays blank, with no name or date', () => {
  const html = buildSyllabusHtml(syllabus, 'BIT313L', reviewed, '')
  assert.match(html, /SANTOS, MARIA/)
  assert.doesNotMatch(html, /REYES, AGNES/)
})

test('an export made before the Dean accepts is marked "Pending Dean approval" on every page', () => {
  const html = buildSyllabusHtml(syllabus, 'BIT313L', reviewed, '', { pendingApproval: true })
  const pages = html.match(/<div class="page[^"]*">/g).length
  assert.ok(pages > 1)
  assert.equal(html.match(/PENDING DEAN APPROVAL<\/div>\s*<div aria-hidden/g).length, pages)
})

test('an approved export carries no pending marker', () => {
  assert.doesNotMatch(buildSyllabusHtml(syllabus, 'BIT313L', approved, '', { pendingApproval: false }), /PENDING DEAN APPROVAL/)
})

test('mergeFormInfo ignores blank or missing server values', () => {
  const merged = mergeFormInfo({ syllabus: { revisionNo: '  ', effectivity: '02/02/2027' }, coaep: null })
  assert.equal(merged.syllabus.revisionNo, '0')
  assert.equal(merged.syllabus.effectivity, '02/02/2027')
  assert.deepEqual(merged.coaep, DEFAULT_FORM_INFO.coaep)
})
