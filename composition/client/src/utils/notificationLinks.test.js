import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationPath, timeAgo } from './notificationLinks.js'

const n = { offeringId: 15, courseCode: 'BIT 321L', revisionNumber: null, state: 'Pending' }

test('an instructor opens their editor; an approver opens the approval view of the same course', () => {
  assert.equal(notificationPath('instructor', n), '/offerings/15/pending')
  assert.equal(notificationPath('instructor', { ...n, revisionNumber: 2, state: 'approved' }), '/courses/15/2/approved')
  assert.equal(notificationPath('program-head', n), '/role/program-head/courses/BIT%20321L?status=pending&fromStatus=pending&pcId=15')
  assert.equal(notificationPath('dean', { ...n, revisionNumber: 3 }), '/role/dean/courses/BIT%20321L?status=pending&fromStatus=pending&pcId=15&revNum=3')
})

test('no link when the course is unknown or the role has no course view', () => {
  assert.equal(notificationPath('dean', { offeringId: 15 }), null)
  assert.equal(notificationPath('dean', {}), null)
  assert.equal(notificationPath('superuser', n), null)
  assert.equal(notificationPath('vpaa', n), null, 'the VPAA has no view of a plan under review')
})

test('the VPAA opens an approved plan from its notification', () => {
  assert.equal(notificationPath('vpaa', { ...n, state: 'approved' }), '/role/vpaa/courses/BIT%20321L?status=approved&fromStatus=approved&pcId=15')
})

test('age labels', () => {
  const now = Date.parse('2026-10-09T10:00:00Z')
  assert.equal(timeAgo('2026-10-09T09:59:40Z', now), 'just now')
  assert.equal(timeAgo('2026-10-09T09:55:00Z', now), '5 min ago')
  assert.equal(timeAgo('2026-10-09T07:00:00Z', now), '3 h ago')
  assert.equal(timeAgo('2026-10-07T10:00:00Z', now), '2 d ago')
  assert.equal(timeAgo('not a date', now), '')
})

test('a notification about no single course opens the page it is about', () => {
  assert.equal(notificationPath('program-head', { type: 'missing_digest' }), '/role/program-head/approval-course-table?page=Syllabus&status=not-submitted')
  assert.equal(notificationPath('director-of-libraries', { type: 'reference_health' }), '/role/director-of-libraries/reference-library')
  assert.equal(notificationPath('dean', { type: 'approval_waiting' }), '/role/dean?page=Syllabus&status=pending')
  assert.equal(notificationPath('instructor', { type: 'missing_digest' }), null)
  assert.equal(notificationPath('program-head', { type: 'reminder' }), null)
})

test('a notification about a comment opens that comment', () => {
  const n = { offeringId: 15, courseCode: 'BIT312L', state: 'pending', type: 'comment_added', commentId: 42 }
  assert.equal(notificationPath('instructor', n), '/offerings/15/pending?comment=42')
  assert.equal(notificationPath('instructor', { ...n, revisionNumber: 2 }), '/courses/15/2/pending?comment=42')
  assert.match(notificationPath('program-head', n), /&pcId=15&comment=42$/)
  assert.equal(notificationPath('instructor', { ...n, commentId: null }), '/offerings/15/pending')
})
