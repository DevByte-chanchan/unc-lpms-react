// Course-table status for one assignment row, derived from its workflow log.
// The rules (who must approve, what a return does) live in workflowFromLogs.js.
import { workflowFromLogs } from './workflowFromLogs.js'
import { exportEligibility } from './reviewGate.js'

// Display label and workflow-log role for each REQUIRED approver, in review order. The
// Industry Consultant is not listed: they are not part of the approval chain.
const REVIEWERS = [
  { label: 'Library Director', roleKey: 'LIBRARY_DIRECTOR', node: ['parallelReview', 'library_director'], accountRole: 'director-of-libraries' },
  { label: 'Program Head', roleKey: 'PROGRAM_HEAD', node: ['parallelReview', 'program_head'], accountRole: 'program-head' },
  { label: 'Dean', roleKey: 'DEAN', node: ['dean'], accountRole: 'dean' }
]

const chronologicalLogs = (row = {}) => [...(Array.isArray(row.logs) ? row.logs : [])]
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

export const latestSubmissionAt = (row = {}) => {
  const submissions = chronologicalLogs(row).filter(entry =>
    entry.actor_role === 'INSTRUCTOR' && entry.action_type === 'SUBMITTED'
  )
  return submissions.at(-1)?.createdAt || row.date_submitted || null
}

export const computeOverallStatus = (row = {}) => {
  const { currentStage } = workflowFromLogs(row.logs || [])
  if (currentStage === 'approved') return 'Approved'
  if (currentStage === 'returned') return 'Returned'
  if (currentStage === 'draft') return 'Draft'
  return 'Pending'
}

export const buildApproverStatus = (row = {}) => {
  const workflow = workflowFromLogs(row.logs || [])
  return REVIEWERS.map(reviewer => {
    const node = reviewer.node.reduce((acc, key) => acc?.[key], workflow)
    if (node?.status === 'done') return { title: reviewer.label, status: 'Accepted', acceptedAt: node.completedAt }
    if (workflow.returnedBy.includes(reviewer.accountRole)) {
      const returnedAt = chronologicalLogs(row)
        .filter(entry => entry.actor_role === reviewer.roleKey && entry.action_type === 'RETURNED')
        .at(-1)?.createdAt
      return { title: reviewer.label, status: 'Returned', returnedAt }
    }
    return { title: reviewer.label, status: 'Pending' }
  })
}

// A row's syllabus can be exported once the Director of Libraries and the Program Head have
// accepted it, even before the Dean (the export is then marked "Pending Dean approval").
export const canExportRow = (row = {}) => exportEligibility(workflowFromLogs(row.logs || [])).allowed

export default {
  canExportRow,
  computeOverallStatus,
  latestSubmissionAt,
  buildApproverStatus
}
