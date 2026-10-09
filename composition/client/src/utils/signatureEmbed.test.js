import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSyllabusHtml } from './syllabusPdfHtml.js'
import { buildReviewRecordHtml } from './reviewRecordHtml.js'
import { signatureImageSrc } from './sanitize.js'
import { workflowFromLogs } from './workflowFromLogs.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

let tick = 0
const log = (actor_role, action_type, actor_name = null) =>
  ({ actor_role, action_type, actor_name, createdAt: new Date(Date.UTC(2026, 5, 1 + tick++)).toISOString() })
const syllabus = { code: 'BIT313L', name: 'Human-Computer Interaction', revision: 2, instructor: 'NORTON, MONICA' }

const reviewed = workflowFromLogs([
  log('INSTRUCTOR', 'SUBMITTED', 'NORTON, MONICA'),
  log('LIBRARY_DIRECTOR', 'ACCEPTED', 'SANTOS, MARIA'),
  log('PROGRAM_HEAD', 'ACCEPTED', 'DANILA, JUNAR')
], 'BIT313L')

test('only PNG/JPEG data URIs are ever embedded', () => {
  assert.equal(signatureImageSrc(PNG), PNG)
  assert.equal(signatureImageSrc(JPG), JPG)
  for (const bad of [
    '', null, undefined, 42,
    'https://example.test/sig.png',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'data:text/html;base64,PGgxPg==',
    'javascript:alert(1)',
    `${PNG}" onerror="alert(1)`,
    'data:image/png;base64,AAAA" /><script>'
  ]) assert.equal(signatureImageSrc(bad), '', String(bad))
})

test('the syllabus approval block shows a signature only for approvers who accepted', () => {
  const html = buildSyllabusHtml(syllabus, 'BIT313L', {
    ...reviewed,
    // The Dean has not accepted; even if an image were supplied it must not appear.
    signatureImages: { 'director-of-libraries': PNG, 'program-head': JPG, dean: PNG.replace('iVBOR', 'ZZZZZ') }
  }, '')
  assert.ok(html.includes(PNG), 'Director of Libraries signature')
  assert.ok(html.includes(JPG), 'Program Head signature')
  assert.ok(!html.includes('ZZZZZ'), 'no Dean signature before the Dean accepts')
  assert.equal((html.match(/alt="Signature"/g) || []).length, 2)
})

test('without images the approval block is unchanged, and unsafe values are dropped', () => {
  const plain = buildSyllabusHtml(syllabus, 'BIT313L', reviewed, '')
  assert.ok(!plain.includes('alt="Signature"'))
  const hostile = buildSyllabusHtml(syllabus, 'BIT313L', { ...reviewed, signatureImages: { 'program-head': 'https://evil.test/x.png' } }, '')
  assert.ok(!hostile.includes('evil.test'))
})

test('the review record shows each accepted approver\'s signature in the approvers table', () => {
  const record = {
    course: { code: 'BIT321L' }, status: {}, actions: [], comments: [],
    approvers: [
      { role: 'LIBRARY_DIRECTOR', roleLabel: 'Director of Libraries', name: 'SANTOS, MARIA', date: '2026-06-23T02:00:00.000Z', accepted: true, signature: PNG },
      { role: 'PROGRAM_HEAD', roleLabel: 'Program Head', name: 'DANILA, JUNAR', date: '2026-06-25T01:45:00.000Z', accepted: true, signature: null },
      { role: 'DEAN', roleLabel: 'Dean', name: null, date: null, accepted: false, signature: JPG },
    ]
  }
  const html = buildReviewRecordHtml(record)
  assert.match(html, /Signature<\/th>/)
  assert.ok(html.includes(PNG))
  assert.ok(!html.includes(JPG), 'an approver who has not accepted shows no signature')
  assert.equal((html.match(/alt="Signature"/g) || []).length, 1)
})
