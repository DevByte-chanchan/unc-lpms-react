import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationPath, canPoke, waitLabel, timeAgo } from './notificationLinks.js'

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
  assert.equal(notificationPath('vpaa', n), null)
})

test('a reviewer can be poked unless the server says when they next can be', () => {
  const now = Date.parse('2026-10-09T10:00:00Z')
  assert.equal(canPoke({ nextPokeAt: null }, now), true)
  assert.equal(canPoke({}, now), true)
  assert.equal(canPoke({ nextPokeAt: '2026-10-09T12:00:00Z' }, now), false)
  assert.equal(canPoke({ nextPokeAt: '2026-10-09T09:59:00Z' }, now), true)
})

test('wait and age labels', () => {
  const now = Date.parse('2026-10-09T10:00:00Z')
  assert.equal(waitLabel('2026-10-09T13:20:00Z', now), 'in 3 h 20 min')
  assert.equal(waitLabel('2026-10-09T10:12:00Z', now), 'in 12 min')
  assert.equal(timeAgo('2026-10-09T09:59:40Z', now), 'just now')
  assert.equal(timeAgo('2026-10-09T09:55:00Z', now), '5 min ago')
  assert.equal(timeAgo('2026-10-09T07:00:00Z', now), '3 h ago')
  assert.equal(timeAgo('2026-10-07T10:00:00Z', now), '2 d ago')
  assert.equal(timeAgo('not a date', now), '')
})
