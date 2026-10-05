import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGeneratedCoaepRecord, DRAFT_BANNER } from './generatedCoaepRecord.js'

const cos = [{ number: '1.0', statement: 'Design', ilos: [{ outcome: 'x', assessmentTools: [] }] }]
const build = (status) => buildGeneratedCoaepRecord({
  courseCode: 'BIT313L',
  courseName: 'HCI',
  payload: { course: { code: 'BIT313L', title: 'Human-Computer Interaction' }, status, cos }
})

test('builds a read-only record from the syllabus payload (course header, ILOs, default target)', () => {
  const record = buildGeneratedCoaepRecord({
    courseCode: 'BIT201',
    courseName: 'Data Structures and Algorithms',
    payload: { course: { code: 'BIT201', title: 'Data Structures and Algorithms' }, cos }
  })
  assert.equal(record.header.course, 'BIT201 - Data Structures and Algorithms')
  assert.equal(record.cos[0].ilos[0].outcome, 'x')
  assert.equal(record.performanceTarget, 'At least 90% of enrolled students with a rating of at least 60% of the total score')
})

test('no course outcomes means no record', () => {
  assert.equal(buildGeneratedCoaepRecord({ courseCode: 'X', payload: { cos: [] } }), null)
})

test('an approved plan is final: approval date and revision, no banner', () => {
  const record = build({ state: 'Approved', approved: true, revisionNumber: 2, approvedAt: '2026-06-28T07:00:00.000Z' })
  assert.equal(record.approved, true)
  assert.equal(record.banner, '')
  assert.equal(record.approvalDate, 'June 28, 2026')
  assert.equal(record.header.course, 'BIT313L - Human-Computer Interaction (Revision 2)')
  assert.equal(record.sourceLabel, 'Approved · June 28, 2026 · Revision 2')
})

test('every other state is a draft and says why', () => {
  for (const state of ['Draft', 'Pending', 'Returned']) {
    const record = build({ state, approved: false, revisionNumber: 1, approvedAt: null })
    assert.equal(record.approved, false, state)
    assert.equal(record.banner, DRAFT_BANNER, state)
    assert.equal(record.approvalDate, '', state)
    assert.equal(record.sourceLabel, `${DRAFT_BANNER} · plan is ${state.toLowerCase()} · Revision 1`)
  }
})

test('a payload without a status is treated as a draft, never as final', () => {
  const record = build(undefined)
  assert.equal(record.approved, false)
  assert.equal(record.banner, DRAFT_BANNER)
})

test('approved is only trusted when it is exactly true', () => {
  assert.equal(build({ state: 'Approved', approved: 'yes' }).approved, false)
})
