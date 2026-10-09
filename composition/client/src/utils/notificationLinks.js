// Pure helpers for the notification bell and the poke button (no imports, so they test under plain node).

// Where clicking a notification should go. Instructors open their learning-plan editor; approvers
// open the approval view of the same course. null when the course is unknown.
const APPROVER_ROLES = ['program-head', 'dean', 'director-of-libraries', 'industry-consultant']

export const notificationPath = (role, notification = {}) => {
  const { offeringId, courseCode, revisionNumber, state } = notification
  if (!offeringId || !courseCode) return null
  const status = String(state || 'pending').toLowerCase()
  if (role === 'instructor') {
    return revisionNumber
      ? `/courses/${offeringId}/${revisionNumber}/${status}`
      : `/offerings/${offeringId}/${status}`
  }
  if (APPROVER_ROLES.includes(role)) {
    const rev = revisionNumber ? `&revNum=${revisionNumber}` : ''
    return `/role/${role}/courses/${encodeURIComponent(courseCode)}?status=${status}&fromStatus=${status}&pcId=${offeringId}${rev}`
  }
  return null
}

// A poke target can be poked when the server has not given a "next allowed" time in the future.
export const canPoke = (target, now = Date.now()) =>
  !target?.nextPokeAt || new Date(target.nextPokeAt).getTime() <= now

// "in 3 h 20 min" / "in 12 min", for the disabled button's tooltip.
export const waitLabel = (nextPokeAt, now = Date.now()) => {
  const minutes = Math.max(1, Math.ceil((new Date(nextPokeAt).getTime() - now) / 60000))
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `in ${hours} h ${minutes % 60} min` : `in ${minutes} min`
}

// "just now", "5 min ago", "3 h ago", "2 d ago"
export const timeAgo = (iso, now = Date.now()) => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.floor((now - then) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}
