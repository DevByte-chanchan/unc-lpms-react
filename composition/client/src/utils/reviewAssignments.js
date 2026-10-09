export const loadReviewAssignments = async (fetchJson, year, semester) => {
  const url = `/api/assignments?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}`
  const response = await fetchJson(url)
  const rows = Array.isArray(response) ? response : response?.data ?? response?.rows
  if (!Array.isArray(rows)) throw new Error('Invalid assignment response')
  return rows
}

export const canReviewLoadedCourse = ({ pcId, revNum, code, details, error }) => {
  if (error || !pcId || !code || !details?.code) return false
  // An approved revision must match its number; a working copy has none (null) and is addressed by id.
  const revisionMatches = revNum ? String(details.revision) === String(revNum) : details.revision == null
  return revisionMatches
    && String(details.code).trim().toLocaleUpperCase() === String(code).trim().toLocaleUpperCase()
}
