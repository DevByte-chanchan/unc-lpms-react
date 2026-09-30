const REVIEWERS = [
  { label: 'Industry Consultant', roleKey: 'INDUSTRY_CONSULTANT' },
  { label: 'Library Director', roleKey: 'LIBRARY_DIRECTOR' },
  { label: 'Program Head', roleKey: 'PROGRAM_HEAD' },
  { label: 'Dean', roleKey: 'DEAN' }
]

const chronologicalLogs = (row = {}) => [...(Array.isArray(row.logs) ? row.logs : [])]
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

const currentRoundLogs = (row = {}) => {
  const logs = chronologicalLogs(row)
  let latestSubmissionIndex = -1
  logs.forEach((entry, index) => {
    if (entry.actor_role === 'INSTRUCTOR' && entry.action_type === 'SUBMITTED') {
      latestSubmissionIndex = index
    }
  })
  return latestSubmissionIndex < 0 ? logs : logs.slice(latestSubmissionIndex + 1)
}

export const latestSubmissionAt = (row = {}) => {
  const submissions = chronologicalLogs(row).filter(entry =>
    entry.actor_role === 'INSTRUCTOR' && entry.action_type === 'SUBMITTED'
  )
  return submissions.at(-1)?.createdAt || row.date_submitted || null
}

export const computeOverallStatus = (row = {}) => {
  const logs = chronologicalLogs(row)
  const latest = logs.at(-1)

  if (latest?.action_type === 'RETURNED') return 'Returned'
  if (latest?.action_type === 'ACCEPTED' && latest.actor_role === 'DEAN') return 'Approved'
  if (row.date_submitted || logs.some(entry =>
    entry.action_type === 'SUBMITTED' || entry.action_type === 'ACCEPTED'
  )) return 'Pending'
  return 'Draft'
}

export const buildApproverStatus = (row = {}) => {
  const round = currentRoundLogs(row)

  return REVIEWERS.map(reviewer => {
    const latest = round.filter(entry => entry.actor_role === reviewer.roleKey).at(-1)
    if (!latest) return { title: reviewer.label, status: 'Pending' }
    if (latest.action_type === 'ACCEPTED') {
      return { title: reviewer.label, status: 'Accepted', acceptedAt: latest.createdAt }
    }
    if (latest.action_type === 'RETURNED') {
      return { title: reviewer.label, status: 'Returned', returnedAt: latest.createdAt }
    }
    return { title: reviewer.label, status: 'Pending' }
  })
}

export default {
  computeOverallStatus,
  latestSubmissionAt,
  buildApproverStatus
}
