import test from 'node:test'
import assert from 'node:assert/strict'

let statusModel = {}
try {
  statusModel = await import('./assignmentStatus.js')
} catch {
  // The first RED run proves the shared model does not exist yet.
}

const history = [
  { actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: '2026-08-01T08:00:00.000Z' },
  { actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', createdAt: '2026-08-02T08:00:00.000Z' },
  { actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', createdAt: '2026-08-03T08:00:00.000Z' },
  { actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: '2026-08-05T08:00:00.000Z' }
]

test('approval details use the latest resubmission date', () => {
  assert.equal(typeof statusModel.latestSubmissionAt, 'function', 'the shared assignment status model is missing')
  assert.equal(
    statusModel.latestSubmissionAt({ date_submitted: history[0].createdAt, logs: history }),
    '2026-08-05T08:00:00.000Z'
  )
})

test('reviewer decisions from a returned round reset to pending after resubmission', () => {
  assert.equal(typeof statusModel.buildApproverStatus, 'function', 'the shared assignment status model is missing')
  assert.deepEqual(
    statusModel.buildApproverStatus({ logs: history }),
    [
      { title: 'Industry Consultant', status: 'Pending' },
      { title: 'Library Director', status: 'Pending' },
      { title: 'Program Head', status: 'Pending' },
      { title: 'Dean', status: 'Pending' }
    ]
  )
})

test('only decisions recorded after resubmission appear in the current round', () => {
  assert.equal(typeof statusModel.buildApproverStatus, 'function', 'the shared assignment status model is missing')
  const acceptedAt = '2026-08-06T08:00:00.000Z'
  const statuses = statusModel.buildApproverStatus({
    logs: [...history, { actor_role: 'INDUSTRY_CONSULTANT', action_type: 'ACCEPTED', createdAt: acceptedAt }]
  })

  assert.deepEqual(statuses[0], {
    title: 'Industry Consultant',
    status: 'Accepted',
    acceptedAt
  })
  assert.equal(statuses[1].status, 'Pending')
  assert.equal(statuses[2].status, 'Pending')
  assert.equal(statuses[3].status, 'Pending')
})
