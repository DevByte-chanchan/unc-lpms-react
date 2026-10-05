import test from 'node:test'
import assert from 'node:assert/strict'
import { workflowFromLogs } from './workflowFromLogs.js'
import { consolidatedStatus, canActOnStage, verifySignature, exportEligibility } from './reviewGate.js'

let tick = 0
const log = (actor_role, action_type, actor_name = null) => ({
  actor_role, action_type, actor_name, createdAt: new Date(Date.UTC(2026, 5, 1 + tick++)).toISOString()
})
const stage = (logs) => workflowFromLogs(logs, 'BIT313L').currentStage
const wf = (logs) => workflowFromLogs(logs, 'BIT313L')

test('no logs, or only an assignment, is a draft the instructor can act on', () => {
  assert.equal(stage([]), 'draft')
  const draft = wf([log('PROGRAM_HEAD', 'ASSIGNED')])
  assert.equal(draft.currentStage, 'draft')
  assert.equal(canActOnStage('instructor', draft), true)
})

test('reviewers cannot act on a plan that was never submitted', () => {
  for (const role of ['program-head', 'director-of-libraries', 'dean']) {
    assert.equal(canActOnStage(role, wf([])), false, role)
  }
})

test('a submitted plan moves through the two parallel reviewers to the dean to approved', () => {
  const submitted = [log('INSTRUCTOR', 'SUBMITTED')]
  assert.equal(stage(submitted), 'submitted')
  const one = [...submitted, log('PROGRAM_HEAD', 'ACCEPTED')]
  assert.equal(stage(one), 'parallel_review')
  const both = [...one, log('LIBRARY_DIRECTOR', 'ACCEPTED')]
  assert.equal(stage(both), 'dean')
  assert.equal(stage([...both, log('DEAN', 'ACCEPTED')]), 'approved')
})

test('the dean acts only after BOTH reviewers accepted; the consultant is never waited for', () => {
  const partial = wf([log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED')])
  assert.equal(canActOnStage('dean', partial), false)
  const both = wf([log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED')])
  assert.equal(canActOnStage('dean', both), true)
  assert.equal(canActOnStage('program-head', both), false, 'a reviewer who already accepted is not asked again')
  assert.equal(canActOnStage('industry-consultant', both), false, 'the consultant never acts')
})

test('old industry consultant entries are ignored', () => {
  const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('INDUSTRY_CONSULTANT', 'RETURNED'), log('INDUSTRY_CONSULTANT', 'ACCEPTED')]
  assert.equal(stage(logs), 'submitted')
})

test('after a return, only the reviewer who returned it decides again; the other acceptance still counts', () => {
  const returned = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'RETURNED')]
  const back = wf(returned)
  assert.equal(back.currentStage, 'returned')
  assert.deepEqual(back.returnedBy, ['director-of-libraries'])
  assert.equal(canActOnStage('instructor', back), true)
  assert.equal(canActOnStage('director-of-libraries', back), false, 'the returner waits for the instructor')

  const resubmitted = wf([...returned, log('INSTRUCTOR', 'SUBMITTED')])
  assert.equal(resubmitted.currentStage, 'parallel_review')
  assert.equal(resubmitted.parallelReview.program_head.status, 'done', 'the program head\'s acceptance still counts')
  assert.equal(resubmitted.parallelReview.library_director.status, 'pending')
  assert.equal(canActOnStage('director-of-libraries', resubmitted), true, 'the returner reviews again')
  assert.equal(canActOnStage('program-head', resubmitted), false, 'the other reviewer is not asked again')
  assert.equal(canActOnStage('dean', resubmitted), false)
  assert.equal(stage([...returned, log('INSTRUCTOR', 'SUBMITTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED')]), 'dean')
})

test('if the dean returned it, it goes back to the dean only', () => {
  const logs = [
    log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED'),
    log('DEAN', 'RETURNED'), log('INSTRUCTOR', 'SUBMITTED')
  ]
  const back = wf(logs)
  assert.equal(back.currentStage, 'dean', 'both reviewer acceptances still count')
  assert.equal(canActOnStage('dean', back), true)
  assert.equal(canActOnStage('program-head', back), false)
  assert.equal(canActOnStage('director-of-libraries', back), false)
})

test('a Dean acceptance is final: approved with the approval date, and nobody can act', () => {
  const logs = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED'), log('DEAN', 'ACCEPTED')]
  const approved = wf(logs)
  const status = consolidatedStatus(approved)
  assert.equal(status.isFullyApproved, true)
  assert.equal(status.dateApproved, logs[3].createdAt)
  for (const role of ['instructor', 'program-head', 'dean']) assert.equal(canActOnStage(role, approved), false, role)
})

test('chain chips: approved / returned / pending per required approver; consultant and VPAA are view-only', () => {
  const steps = Object.fromEntries(consolidatedStatus(wf([
    log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'RETURNED')
  ])).steps.map(s => [s.role, s.status]))
  assert.equal(steps['program-head'], 'approved')
  assert.equal(steps['director-of-libraries'], 'returned')
  assert.equal(steps.dean, 'pending')
  assert.equal(steps['industry-consultant'], 'pending')
})

test('export is allowed once both reviewers accepted, marked pending the Dean until he accepts', () => {
  const both = [log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED'), log('LIBRARY_DIRECTOR', 'ACCEPTED')]
  assert.equal(exportEligibility(wf(both.slice(0, 2))).allowed, false)
  assert.deepEqual(exportEligibility(wf(both)), { allowed: true, approved: false, pendingDean: true })
  assert.deepEqual(exportEligibility(wf([...both, log('DEAN', 'ACCEPTED')])), { allowed: true, approved: true, pendingDean: false })
})

test('an approver\'s signature is rebuilt from the log and verifies; a log without a name has none', () => {
  const signed = wf([log('INSTRUCTOR', 'SUBMITTED'), log('PROGRAM_HEAD', 'ACCEPTED', 'DANILA, JUNAR'), log('LIBRARY_DIRECTOR', 'ACCEPTED')])
  assert.equal(signed.signatures.length, 1)
  assert.equal(signed.signatures[0].name, 'DANILA, JUNAR')
  assert.equal(signed.signatures[0].role, 'program-head')
  assert.equal(verifySignature(signed.signatures[0]), true)
})

test('logs in any order are read chronologically', () => {
  const a = log('INSTRUCTOR', 'SUBMITTED')
  const b = log('PROGRAM_HEAD', 'ACCEPTED')
  assert.equal(workflowFromLogs([b, a], 'X').currentStage, 'parallel_review')
})
