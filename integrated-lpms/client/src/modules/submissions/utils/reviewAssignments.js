export const loadReviewAssignments = async (fetchJson, year, semester) => {
  const url = `/api/assignments?year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}`;
  const response = await fetchJson(url);
  const rows = Array.isArray(response) ? response : response?.data ?? response?.rows;
  if (!Array.isArray(rows)) throw new Error('Invalid assignment response');
  return rows;
};

export const canReviewLoadedCourse = ({ pcId, revNum, code, details, error }) => {
  if (error || !pcId || !code || !details?.code) return false;
  // In integrated-lpms, offerings always carry revision_number >= 1 even while pending;
  // when a deep link (e.g. DirectorDashboard) omits revNum, matching pcId + course code is authoritative.
  const revisionMatches = !revNum || details.revision == null || String(details.revision) === String(revNum);
  return revisionMatches
    && String(details.code).trim().toLocaleUpperCase() === String(code).trim().toLocaleUpperCase();
};
