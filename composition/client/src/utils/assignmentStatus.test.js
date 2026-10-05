import test from 'node:test'
import assert from 'node:assert/strict'
import * as statusModel from './assignmentStatus.js'

const history = [
  { actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: '2026-08-01T08:00:00.000Z' },
  { actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', createdAt: '2026-08-02T08:00:00.000Z' },
  { actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', createdAt: '2026-08-03T08:00:00.000Z' },
  { actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: '2026-08-05T08:00:00.000Z' }
]

test('approval details use the latest resubmission date', () => {
  assert.equal(
    statusModel.latestSubmissionAt({ date_submitted: history[0].createdAt, logs: history }),
    '2026-08-05T08:00:00.000Z'
  )
})

test('after a resubmission only the reviewer who returned it is pending; the other acceptance stands', () => {
  assert.deepEqual(statusModel.buildApproverStatus({ logs: history }), [
    { title: 'Library Director', status: 'Accepted', acceptedAt: '2026-08-02T08:00:00.000Z' },
    { title: 'Program Head', status: 'Pending' },
    { title: 'Dean', status: 'Pending' }
  ])
})

test('a returned plan shows who returned it and when', () => {
  const statuses = statusModel.buildApproverStatus({ logs: history.slice(0, 3) })
  assert.deepEqual(statuses[1], { title: 'Program Head', status: 'Returned', returnedAt: '2026-08-03T08:00:00.000Z' })
  assert.equal(statusModel.computeOverallStatus({ logs: history.slice(0, 3) }), 'Returned')
})

test('the industry consultant never appears in the chain and never changes the status', () => {
  const logs = [...history.slice(0, 2), { actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', createdAt: '2026-08-06T08:00:00.000Z' }]
  assert.deepEqual(statusModel.buildApproverStatus({ logs }).map(s => s.title), ['Library Director', 'Program Head', 'Dean'])
  assert.equal(statusModel.computeOverallStatus({ logs }), 'Pending')
})

test('overall status: draft, pending, returned, approved', () => {
  assert.equal(statusModel.computeOverallStatus({ logs: [] }), 'Draft')
  assert.equal(statusModel.computeOverallStatus({ logs: history.slice(0, 1) }), 'Pending')
  const approved = [
    history[0],
    { actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', createdAt: '2026-08-02T08:00:00.000Z' },
    { actor_role: 'PROGRAM_HEAD', action_type: 'ACCEPTED', createdAt: '2026-08-03T08:00:00.000Z' },
    { actor_role: 'DEAN', action_type: 'ACCEPTED', createdAt: '2026-08-04T08:00:00.000Z' }
  ]
  assert.equal(statusModel.computeOverallStatus({ logs: approved }), 'Approved')
})
