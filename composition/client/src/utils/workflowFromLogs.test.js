import test from 'node:test'
import assert from 'node:assert/strict'
import { workflowFromLogs } from './workflowFromLogs.js'
import { consolidatedStatus, canActOnStage, verifySignature } from './reviewGate.js'

let tick = 0
const log = (actor_role, action_type, actor_name = null) => ({
  actor_role, action_type, actor_name, createdAt: new Date(Date.UTC(2026, 5, 1 + tick++)).toISOString()
})
const stage = (logs) => workflowFromLogs(logs, 'BIT313L').currentStage

test('no logs, or only an assignment, is a draft the instructor can act on', () => {
  assert.equal(stage([]), 'draft')
  const wf = workflowFromLogs([log('PROGRAM_HEAD', 'ASSIGNED')], 'BIT313L')
  assert.equal(wf.currentStage, 'draft')
  assert.equal(canActOnStage('instructor', wf), true)
})

test('reviewers cannot act on a plan that was never submitted', () => {
  const wf = workflowFromLogs([], 'BIT313L')
  for (const role of ['program-head', 'director-of-libraries', 'industry-consultant', 'dean']) {
    assert.equal(canActOnStage(role, wf), false, role)
  }
})

test('a submitted plan moves through parallel review to the dean to approved', () => {
  const submitted = [log('INSTRUCTOR', 'SUBMITTED')]
  assert.equal(stage(submitted), 'submitted')
  const one = [...submitted, log('PROGRAM_HEAD', 'ACCEPTED')]
  assert.equal(stage(one), 'parallel_review')
  const all = [...one, log('LIBRARY_DIRECTOR', 'ACCEPTED'), log('INDUSTRY_CONSULTANT', 'ACCEPTED')]
  assert.equal(stage(all), 'dean')
  assert.equal(stage([...all, log('DEAN', 'ACCEPTED')]), 'approved')
})

test('the dean may act only once all three parallel reviewers accepted', () => {
  const partial = workflowFromLogs([log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED')], 'BIT313L')
  assert.equal(canActOnStage('dean', partial), false)
  const all = workflowFromLogs([
    log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED'), log('INDUSTRY_CONSULTANT', 'ACCEPTED')
  ], 'BIT313L')
  assert.equal(canActOnStage('dean', all), true)
  assert.equal(canActOnStage('program-head', all), false, 'a reviewer who already accepted cannot act again')
})

test('any return in the current round returns the plan, and resubmitting starts a fresh round', () => {
  const returned = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('INDUSTRY_CONSULTANT', 'RETURNED')]
  assert.equal(stage(returned), 'returned')
  assert.equal(canActOnStage('instructor', workflowFromLogs(returned, 'BIT313L')), true)
  const resubmitted = [...returned, log('INSTRUCTOR', 'SUBMITTED')]
  const wf = workflowFromLogs(resubmitted, 'BIT313L')
  assert.equal(wf.currentStage, 'submitted')
  assert.equal(wf.parallelReview.program_head.status, 'pending', 'last round\'s acceptance does not carry over')
})

test('a Dean acceptance is final: approved with the approval date, and nobody can act', () => {
  const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED'), log('INDUSTRY_CONSULTANT', 'ACCEPTED'), log('DEAN', 'ACCEPTED')]
  const wf = workflowFromLogs(logs, 'BIT313L')
  const status = consolidatedStatus(wf)
  assert.equal(status.isFullyApproved, true)
  assert.equal(status.dateApproved, logs[4].createdAt)
  for (const role of ['instructor', 'program-head', 'dean']) assert.equal(canActOnStage(role, wf), false, role)
})

test('chain statuses come out as approved / returned / pending per approver', () => {
  const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'RETURNED')]
  const steps = Object.fromEntries(consolidatedStatus(workflowFromLogs(logs, 'X')).steps.map(s => [s.role, s.status]))
  assert.equal(steps['program-head'], 'approved')
  assert.equal(steps['director-of-libraries'], 'returned')
  assert.equal(steps['industry-consultant'], 'returned')
})

test('an approver\'s signature is rebuilt from the log and verifies; a log without a name has none', () => {
  const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED', 'DANILA, JUNAR'), log('LIBRARY_DIRECTOR', 'ACCEPTED')]
  const wf = workflowFromLogs(logs, 'BIT313L')
  assert.equal(wf.signatures.length, 1)
  assert.equal(wf.signatures[0].name, 'DANILA, JUNAR')
  assert.equal(wf.signatures[0].role, 'program-head')
  assert.equal(verifySignature(wf.signatures[0]), true)
})

test('logs in any order are read chronologically', () => {
  const a = log('INSTRUCTOR', 'SUBMITTED')
  const b = log('PROGRAM_HEAD', 'ACCEPTED')
  assert.equal(workflowFromLogs([b, a], 'X').currentStage, 'parallel_review')
})
