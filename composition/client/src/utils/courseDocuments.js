import { API_BASE } from './api.js'
import { getSession } from './session.js'

// The Program Head's uploaded CO-PO / COAEP file of a course offering (server: /api/course-documents).

const roleHeaders = () => {
  const role = getSession()?.role
  return role ? { 'X-LPMS-Role': role } : {}
}

// Opens a PDF in a new tab, downloads a spreadsheet.
export const openCourseDocument = async (pcId, kind, doc) => {
  const res = await fetch(`${API_BASE}/api/course-documents/${pcId}/${kind}`, { credentials: 'include', headers: roleHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const url = URL.createObjectURL(new Blob([await res.arrayBuffer()], { type: doc.contentType }))
  if (doc.contentType === 'application/pdf') {
    window.open(url, '_blank', 'noopener')
  } else {
    const link = document.createElement('a')
    link.href = url
    link.download = doc.fileName
    link.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
