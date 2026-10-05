export const DEFAULT_PERFORMANCE_TARGET = 'At least 90% of enrolled students with a rating of at least 60% of the total score'

export const DRAFT_BANNER = 'Draft – not approved'

const formatDate = (iso) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// A COAEP is final only when the learning plan it was built from is fully approved
// (Dean accepted). Anything else, including a payload with no status, is a draft.
// The date shown is the approval date, never the day the page was opened.
export const buildGeneratedCoaepRecord = ({ courseCode, courseName, payload }) => {
  const cos = payload?.cos || []
  if (cos.length === 0) return null

  const title = payload?.course?.title || courseName || ''
  const code = payload?.course?.code || courseCode || ''
  const status = payload?.status || {}
  const approved = status.approved === true
  const revisionNumber = status.revisionNumber ?? null
  const approvalDate = approved && status.approvedAt ? formatDate(status.approvedAt) : ''

  const revisionText = revisionNumber == null ? '' : `Revision ${revisionNumber}`
  const sourceLabel = approved
    ? ['Approved', approvalDate, revisionText].filter(Boolean).join(' · ')
    : [DRAFT_BANNER, `plan is ${String(status.state || 'draft').toLowerCase()}`, revisionText].filter(Boolean).join(' · ')

  return {
    header: {
      course: `${code} - ${title}${revisionText ? ` (${revisionText})` : ''}`,
    },
    cos,
    performanceTarget: DEFAULT_PERFORMANCE_TARGET,
    approved,
    banner: approved ? '' : DRAFT_BANNER,
    approvalDate,
    revisionNumber,
    sourceLabel,
  }
}
