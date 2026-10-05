// A plan's approval state, derived from its server workflow log and from nothing else.
// The shape matches what the approval screens already read (`currentStage`,
// `parallelReview`, `dean`, `signatures`), so `consolidatedStatus` and `canActOnStage` in
// reviewGate.js are unchanged. It mirrors the server's transition rules
// (assignmentController.validateWorkflowTransition): only events after the instructor's
// latest submission belong to the current round, and any return reopens the plan.
//
// Stages: draft (never submitted) -> submitted -> parallel_review -> dean -> approved,
// or returned.
import { buildSignature } from './reviewGate.js'

const ROLE_KEY = {
  PROGRAM_HEAD: 'program-head',
  LIBRARY_DIRECTOR: 'director-of-libraries',
  INDUSTRY_CONSULTANT: 'industry-consultant',
  DEAN: 'dean'
}
const PARALLEL = ['PROGRAM_HEAD', 'LIBRARY_DIRECTOR', 'INDUSTRY_CONSULTANT']

const time = (log) => new Date(log.createdAt).getTime()
const pending = () => ({ status: 'pending', completedAt: null })

export const workflowFromLogs = (logs = [], courseCode = '') => {
  // Stable chronological order; logs from the API already arrive sorted.
  const history = [...(Array.isArray(logs) ? logs : [])]
    .map((log, index) => ({ log, index }))
    .sort((a, b) => (time(a.log) - time(b.log)) || (a.index - b.index))
    .map(entry => entry.log)

  const deanAccepted = [...history].reverse().find(log =>
    log.actor_role === 'DEAN' && ['ACCEPTED', 'APPROVED'].includes(log.action_type))

  let lastSubmission = -1
  history.forEach((log, index) => {
    if (log.actor_role === 'INSTRUCTOR' && log.action_type === 'SUBMITTED') lastSubmission = index
  })
  const submitted = lastSubmission >= 0
  const round = submitted ? history.slice(lastSubmission + 1) : history
  const hasReturn = round.some(log => log.action_type === 'RETURNED')

  const decisionOf = (role) => {
    const latest = round.filter(log => log.actor_role === role).at(-1)
    return latest?.action_type === 'ACCEPTED' ? { status: 'done', completedAt: latest.createdAt, log: latest } : pending()
  }
  const parallel = Object.fromEntries(PARALLEL.map(role => [role, decisionOf(role)]))
  const allParallelDone = PARALLEL.every(role => parallel[role].status === 'done')
  const anyParallelDone = PARALLEL.some(role => parallel[role].status === 'done')

  let currentStage = 'draft'
  if (deanAccepted) currentStage = 'approved'
  else if (hasReturn) currentStage = 'returned'
  else if (submitted && allParallelDone) currentStage = 'dean'
  else if (submitted && anyParallelDone) currentStage = 'parallel_review'
  else if (submitted) currentStage = 'submitted'
  else if (history.some(log => log.action_type === 'RETURNED')) currentStage = 'returned'

  const strip = ({ status, completedAt }) => ({ status, completedAt })
  const dean = deanAccepted ? { status: 'done', completedAt: deanAccepted.createdAt } : pending()

  // A signature is rebuilt from the log (who, role, when); logs without a name carry none.
  const signedBy = [...PARALLEL.map(role => parallel[role].log), deanAccepted]
    .filter(log => log?.actor_name)
    .map(log => buildSignature({ name: log.actor_name }, ROLE_KEY[log.actor_role], courseCode, new Date(log.createdAt)))
    .filter(Boolean)

  return {
    courseCode,
    currentStage,
    submittedAt: submitted ? history[lastSubmission].createdAt : null,
    parallelReview: {
      library_director: strip(parallel.LIBRARY_DIRECTOR),
      industry_consultant: strip(parallel.INDUSTRY_CONSULTANT),
      program_head: strip(parallel.PROGRAM_HEAD)
    },
    // Retained for older consumers that still read the duplicated PH field.
    programHead: strip(parallel.PROGRAM_HEAD),
    dean,
    signatures: signedBy
  }
}

export default { workflowFromLogs }
