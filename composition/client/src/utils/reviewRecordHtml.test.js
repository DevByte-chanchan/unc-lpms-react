import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReviewRecordHtml } from './reviewRecordHtml.js'

const record = {
  course: { code: 'BIT321L', title: 'Systems', term: '1st Semester', revisionNumber: 2 },
  status: { state: 'Approved', approved: true, approvedAt: '2026-06-28T07:00:00.000Z' },
  generatedAt: '2026-07-01T00:00:00.000Z',
  approvers: [
    { role: 'LIBRARY_DIRECTOR', roleLabel: 'Director of Libraries', name: 'SANTOS, MARIA', date: '2026-06-23T02:00:00.000Z', accepted: true },
    { role: 'PROGRAM_HEAD', roleLabel: 'Program Head', name: 'DANILA, JUNAR', date: '2026-06-25T01:45:00.000Z', accepted: true },
    { role: 'DEAN', roleLabel: 'Dean', name: 'REYES, AGNES', date: '2026-06-28T07:00:00.000Z', accepted: true }
  ],
  actions: [
    { name: 'NORTON, MONICA', role: 'INSTRUCTOR', roleLabel: 'Instructor', action: 'Submitted', date: '2026-06-12T02:00:00.000Z', inChain: true },
    { name: 'CRUZ, ROBERTO', role: 'INDUSTRY_CONSULTANT', roleLabel: 'Industry Consultant', action: 'Returned', date: '2026-06-13T02:00:00.000Z', inChain: false }
  ],
  comments: [
    { reviewerName: 'DANILA, JUNAR', role: 'PROGRAM_HEAD', roleLabel: 'Program Head', section: 'Topics', location: 'CO2-ILO3', targets: ['Container Basics'], message: 'Add a lab topic.', date: '2026-06-16T03:30:00.000Z', resolved: true, resolvedDate: '2026-06-20T00:00:00.000Z', documentationOnly: false },
    { reviewerName: null, role: 'INDUSTRY_CONSULTANT', roleLabel: 'Industry Consultant', section: 'General', location: '', targets: [], message: 'Consider Kubernetes.', date: '2026-06-17T03:30:00.000Z', resolved: false, resolvedDate: null, documentationOnly: true }
  ]
}

test('the record lists every comment with reviewer, role, section, message, date and resolved state', () => {
  const html = buildReviewRecordHtml(record)
  for (const text of ['DANILA, JUNAR', 'Program Head', 'Topics — CO2-ILO3', 'Container Basics', 'Add a lab topic.', 'Consider Kubernetes.', 'Yes (']) {
    assert.ok(html.includes(text), text)
  }
  assert.match(html, /Reviewer comments \(2\)/)
})

test('every workflow action and the final approvers with dates are listed', () => {
  const html = buildReviewRecordHtml(record)
  for (const text of ['Submitted', 'NORTON, MONICA', 'SANTOS, MARIA', 'REYES, AGNES', 'Approved by the Dean on']) assert.ok(html.includes(text), text)
})

test('consultant entries are labelled as documentation, not part of the chain; an unknown author is not invented', () => {
  const html = buildReviewRecordHtml(record)
  assert.match(html, /\(documentation only\)/)
  assert.match(html, /\(not part of the approval chain\)/)
  assert.match(html, /Name not recorded/)
})

test('an unapproved plan says so, and an approver who has not accepted is shown as such', () => {
  const html = buildReviewRecordHtml({ ...record, status: { state: 'Pending', approved: false }, approvers: [{ role: 'DEAN', roleLabel: 'Dean', accepted: false }] })
  assert.match(html, /Not yet approved by the Dean \(status: Pending\)/)
  assert.match(html, /Not yet accepted/)
})

test('it is a record, not the syllabus, and comment text is escaped', () => {
  const html = buildReviewRecordHtml({ ...record, comments: [{ ...record.comments[0], message: '<script>alert(1)</script>' }] })
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /separate from the approved syllabus/)
})

test('no comments gives an explicit empty row', () => {
  assert.match(buildReviewRecordHtml({ ...record, comments: [] }), /No comments were recorded for this revision/)
})
