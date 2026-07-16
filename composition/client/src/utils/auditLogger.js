const ACTIVITY_KEY = 'lpsm_audit_activity_v1'

const getTimestamp = () => new Date().toISOString()

export const getUserInfo = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return {
      userId: parseInt(localStorage.getItem('userId') || '0'),
      userName: user.name || 'Unknown',
      userRole: user.role || 'unknown'
    }
  } catch {
    return { userId: 0, userName: 'Unknown', userRole: 'unknown' }
  }
}

export const logActivity = (action, details = {}) => {
  try {
    const user = getUserInfo()
    const entry = {
      id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: getTimestamp(),
      action,
      user,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 200) : 'server'
    }

    const raw = localStorage.getItem(ACTIVITY_KEY)
    const activities = raw ? JSON.parse(raw) : []
    activities.push(entry)

    // Keep only last 200 entries
    const trimmed = activities.slice(-200)
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(trimmed))

    return entry
  } catch (e) {
    console.warn('Audit log write failed:', e)
    return null
  }
}

export const logPageView = (page, params = {}) => {
  return logActivity('page_view', { page, params })
}

export const logExport = (type, details = {}) => {
  return logActivity('export', { exportType: type, ...details })
}

export const logApprovalAction = (action, courseCode, details = {}) => {
  return logActivity(`approval_${action}`, { courseCode, ...details })
}

export const logFormSubmission = (formName, courseCode, status = 'submitted') => {
  return logActivity('form_submission', { formName, courseCode, status })
}

export const logError = (source, error, context = {}) => {
  try {
    const entry = {
      id: `ERR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: getTimestamp(),
      type: 'error',
      source,
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 500),
      context
    }

    const raw = localStorage.getItem('lpsm_audit_errors_v1')
    const errors = raw ? JSON.parse(raw) : []
    errors.push(entry)

    const trimmed = errors.slice(-100)
    localStorage.setItem('lpsm_audit_errors_v1', JSON.stringify(trimmed))

    return entry
  } catch {
    return null
  }
}

export const getActivityLog = (limit = 50) => {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    const activities = raw ? JSON.parse(raw) : []
    return Array.isArray(activities)
      ? activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit)
      : []
  } catch { return [] }
}

export const getErrorLog = (limit = 50) => {
  try {
    const raw = localStorage.getItem('lpsm_audit_errors_v1')
    const errors = raw ? JSON.parse(raw) : []
    return Array.isArray(errors)
      ? errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit)
      : []
  } catch { return [] }
}

export const clearActivityLog = () => {
  try { localStorage.removeItem(ACTIVITY_KEY) } catch { console.warn('Failed to clear activity log') }
}

export const clearErrorLog = () => {
  try { localStorage.removeItem('lpsm_audit_errors_v1') } catch { console.warn('Failed to clear error log') }
}

export const logDocumentAction = (action, documentId, details = {}) => {
  return logActivity(`document_${action}`, { documentId, ...details })
}
