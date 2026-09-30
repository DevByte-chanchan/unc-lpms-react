export const loadReviewAssignments = async (fetchJson, year, semester) => {
  const url = `/api/assignments?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}`
  const response = await fetchJson(url)
  const rows = Array.isArray(response) ? response : response?.data ?? response?.rows
  if (!Array.isArray(rows)) throw new Error('Invalid assignment response')
  return rows
}

export const canReviewLoadedCourse = ({ pcId, revNum, code, details, error }) => {
  if (error || !pcId || !revNum || !code || !details?.code) return false
  return String(details.revision) === String(revNum)
    && String(details.code).trim().toLocaleUpperCase() === String(code).trim().toLocaleUpperCase()
}
