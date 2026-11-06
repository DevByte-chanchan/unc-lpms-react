// A plan's approval state, derived from its server workflow log and from nothing else.
// The shape matches what the approval screens read (`currentStage`, `parallelReview`,
// `dean`, `returnedBy`, `signatures`), so `consolidatedStatus` and `canActOnStage` in
// reviewGate.js take it directly. It mirrors server/utils/workflowRules.js:
//
//   instructor submits -> Library Director and Program Head review in parallel
//                      -> the Dean acts only after BOTH have accepted.
//
// The Industry Consultant is not in the chain (read and comment only); old log entries by
// them are ignored. A return goes back to the instructor. A return by the Library Director
// or the Program Head clears every acceptance, so both accept again after the resubmission;
// if the Dean returned it, the reviewers' acceptances stay and it goes back to the Dean only.
//
// Stages: draft (never submitted) -> submitted -> parallel_review -> dean -> approved,
// or returned.
import { buildSignature } from './reviewGate.js'

const ROLE_KEY = {
  PROGRAM_HEAD: 'program-head',
  LIBRARY_DIRECTOR: 'director-of-libraries',
  DEAN: 'dean'
}
const REQUIRED = ['LIBRARY_DIRECTOR', 'PROGRAM_HEAD']
const DECIDING = new Set([...REQUIRED, 'DEAN'])

const time = (log) => new Date(log.createdAt).getTime()
const pending = () => ({ status: 'pending', completedAt: null })

export const workflowFromLogs = (logs = [], courseCode = '') => {
  // Stable chronological order; logs from the API already arrive sorted.
  const history = [...(Array.isArray(logs) ? logs : [])]
    .map((log, index) => ({ log, index }))
    .sort((a, b) => (time(a.log) - time(b.log)) || (a.index - b.index))
    .map(entry => entry.log)

  const accepted = new Map()   // role -> the ACCEPTED log
  const returned = new Set()
  let submitted = false
  let lastSubmission = null

  for (const log of history) {
    if (log.actor_role === 'INSTRUCTOR' && log.action_type === 'SUBMITTED') {
      if (!submitted) { submitted = true; accepted.clear() }
      returned.clear()           // the returning reviewer(s) decide again; see the RETURNED rule below
      lastSubmission = log
    } else if (DECIDING.has(log.actor_role)) {
      if (['ACCEPTED', 'APPROVED'].includes(log.action_type)) {
        if (returned.size > 0) continue   // an old acceptance given while the plan waited on the instructor never counts
        accepted.set(log.actor_role, log)
        returned.delete(log.actor_role)
      } else if (log.action_type === 'RETURNED') {
        returned.add(log.actor_role)
        // Same rule as the server: a reviewer's return clears every acceptance; a Dean return keeps the reviewers'.
        if (log.actor_role === 'DEAN') accepted.delete('DEAN')
        else accepted.clear()
      }
    }
  }

  const done = (role) => accepted.has(role)
  const node = (role) => (done(role)
    ? { status: 'done', completedAt: accepted.get(role).createdAt }
    : pending())
  const reviewersDone = REQUIRED.every(done)

  let currentStage = 'draft'
  if (done('DEAN')) currentStage = 'approved'
  else if (returned.size > 0) currentStage = 'returned'
  else if (submitted && reviewersDone) currentStage = 'dean'
  else if (submitted && REQUIRED.some(done)) currentStage = 'parallel_review'
  else if (submitted) currentStage = 'submitted'

  // A signature is rebuilt from the log (who, role, when); logs without a name carry none.
  const signatures = [...accepted.entries()]
    .filter(([, log]) => log.actor_name)
    .map(([role, log]) => buildSignature({ name: log.actor_name }, ROLE_KEY[role], courseCode, new Date(log.createdAt)))
    .filter(Boolean)

  return {
    courseCode,
    currentStage,
    submittedAt: lastSubmission ? lastSubmission.createdAt : null,
    // Which roles returned the plan and have not yet decided again (account role keys).
    returnedBy: [...returned].map(role => ROLE_KEY[role]),
    parallelReview: {
      library_director: node('LIBRARY_DIRECTOR'),
      program_head: node('PROGRAM_HEAD')
    },
    // Retained for older consumers that still read the duplicated PH field.
    programHead: node('PROGRAM_HEAD'),
    dean: node('DEAN'),
    signatures
  }
}

export default { workflowFromLogs }
