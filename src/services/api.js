/**
 * API service — period-aware fetch wrapper.
 */

const BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, headers = {}, query } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  const opts = { method, headers: { ...headers } };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url.toString(), opts);
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (payload && payload.message) || 'Request failed (' + res.status + ')';
    const error = new Error(message);
    error.status = res.status;
    error.details = payload;
    throw error;
  }
  return payload;
}

function uploadFile(path, file, periodId) {
  const fd = new FormData();
  fd.append('file', file);
  if (periodId) fd.append('period_id', String(periodId));
  return request(path, { method: 'POST', body: fd });
}

/**
 * Dry-run an upload against the SAME route that commits it (`?preview=1`), so
 * the rows the user reviews are the rows the server would actually write —
 * parsed and validated by the real importer, never re-implemented client-side.
 * Persists nothing. Returns:
 *   { preview, filename, detectedColumns, total, validCount, errorCount,
 *     rows: [{ rowNum, level: 'ok'|'warning'|'error', cells, errors }] }
 */
function uploadPreview(path, file, periodId, extra) {
  const fd = new FormData();
  fd.append('file', file);
  if (periodId) fd.append('period_id', String(periodId));
  Object.entries(extra || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
  });
  return request(path, { method: 'POST', body: fd, query: { preview: 1 } });
}

const idPath = (base, id) => base + '/' + id;

export const PeriodsAPI = {
  list:   () => request('/academic-periods'),
  create: (data) => request('/academic-periods', { method: 'POST', body: data }),
  update: (id, patch) => request(idPath('/academic-periods', id), { method: 'PATCH', body: patch }),
  close:  (id) => request(idPath('/academic-periods', id) + '/close',  { method: 'PATCH' }),
  reopen: (id) => request(idPath('/academic-periods', id) + '/reopen', { method: 'PATCH' }),
  remove: (id) => request(idPath('/academic-periods', id), { method: 'DELETE' }),
};

export const DepartmentsAPI = {
  list:        (periodId) => request('/departments', { query: { period_id: periodId } }),
  get:         (id) => request(idPath('/departments', id)),
  create:      (data, periodId) => request('/departments', { method: 'POST', body: { ...data, period_id: periodId } }),
  update:      (id, patch) => request(idPath('/departments', id), { method: 'PATCH', body: patch }),
  unlistMany:  (ids) => request('/departments/unlist', { method: 'PATCH', body: { ids } }),
  remove:      (id) => request(idPath('/departments', id), { method: 'DELETE' }),
  upload:      (file, periodId) => uploadFile('/departments/upload', file, periodId),
  // Dry run — same route, nothing written. Feeds the Preview & Confirm step.
  uploadPreview: (file, periodId) => uploadPreview('/departments/upload', file, periodId),
};

export const FacultyAPI = {
  list:   (periodId) => request('/faculty', { query: { period_id: periodId } }),
  get:    (id) => request(idPath('/faculty', id)),
  create: (data, periodId) => request('/faculty', { method: 'POST', body: { ...data, period_id: periodId } }),
  update: (id, patch) => request(idPath('/faculty', id), { method: 'PATCH', body: patch }),
  inactivateMany: (ids) => request('/faculty/inactivate', { method: 'PATCH', body: { ids } }),
  remove: (id) => request(idPath('/faculty', id), { method: 'DELETE' }),
  upload: (file, periodId) => uploadFile('/faculty/upload', file, periodId),
  // Dry run — same route, nothing written. Feeds the Preview & Confirm step.
  uploadPreview: (file, periodId) => uploadPreview('/faculty/upload', file, periodId),
};

// Curriculum catalog (period-scoped — each term owns its own copy, cloned
// forward from the prior term on first use). The detail endpoint returns
// the course with its resolved `prerequisites` and `revisions`.
export const CoursesAPI = {
  list:   (periodId) => request('/courses', { query: { period_id: periodId } }),
  // Archived catalog courses for the "View Archived" view.
  listArchived: (periodId) => request('/courses', { query: { period_id: periodId, archived: 'only' } }),
  // Prerequisite options — last semester's courses (all programs). Returns
  // { period: { id, label } | null, courses: [{ course_no, course_title, year_lvl, term }] }.
  prereqOptions: (periodId) => request('/courses/prereq-options', { query: { period_id: periodId } }),
  get:    (id) => request(idPath('/courses', id)),
  create: (data, periodId) => request('/courses', { method: 'POST', body: { ...data, period_id: periodId } }),
  update: (id, patch) => request(idPath('/courses', id), { method: 'PATCH', body: patch }),
  remove: (id) => request(idPath('/courses', id), { method: 'DELETE' }),
  upload: (file, periodId) => uploadFile('/courses/upload', file, periodId),
  // Preview an upload WITHOUT saving — returns { detectedColumns, total,
  // recognizedCount, inferredYearCount, programColumnPresent, unresolvedPrograms,
  // unassigned[] } so the UI can resolve unrecognized year levels before
  // committing. `programId` is the program the uploader is viewing — used as the
  // default for rows whose sheet has no Program column. Persists nothing.
  uploadPreview: (file, periodId, programId) => {
    const fd = new FormData();
    fd.append('file', file);
    if (periodId) fd.append('period_id', String(periodId));
    if (programId) fd.append('programId', String(programId));
    return request('/courses/upload', { method: 'POST', body: fd, query: { preview: 1 } });
  },
  // Commit an upload, applying the year-level resolutions chosen in the popup:
  //   yearLevelOverrides — { "<course_no>": "FIRST YEAR" | … } for resolved rows
  //   skipCodes          — ["<course_no>", …] rows to NOT import
  //   programId          — default program for rows with no Program column
  uploadCommit: (file, periodId, { yearLevelOverrides, skipCodes, programId } = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (periodId) fd.append('period_id', String(periodId));
    if (programId) fd.append('programId', String(programId));
    if (yearLevelOverrides && Object.keys(yearLevelOverrides).length) fd.append('yearLevelOverrides', JSON.stringify(yearLevelOverrides));
    if (skipCodes && skipCodes.length) fd.append('skipCodes', JSON.stringify(skipCodes));
    return request('/courses/upload', { method: 'POST', body: fd });
  },
};

export const ProgramsAPI = {
  list:   (periodId) => request('/programs', { query: { period_id: periodId } }),
  // "My program(s)" for a Program Head — filter by resolved faculty id and/or
  // head name (the backend ORs them, so either alone resolves a match).
  listForHead: (periodId, { headId, headName } = {}) =>
    request('/programs', { query: { period_id: periodId, head_id: headId, head_name: headName } }),
  get:    (id) => request(idPath('/programs', id)),
  create: (data, periodId) => request('/programs', { method: 'POST', body: { ...data, period_id: periodId } }),
  update: (id, patch) => request(idPath('/programs', id), { method: 'PATCH', body: patch }),
  remove: (id) => request(idPath('/programs', id), { method: 'DELETE' }),
  upload: (file, periodId) => uploadFile('/programs/upload', file, periodId),
  // Dry run — same route, nothing written. Feeds the Preview & Confirm step.
  uploadPreview: (file, periodId) => uploadPreview('/programs/upload', file, periodId),
};

// NOTE: there is no CourseOfferingsAPI. The `course_offerings` table was
// dissolved into the catalog — the Course Offerings page reads CoursesAPI,
// and a consultant's assigned courses resolve against the catalog too.

export const ConsultantsAPI = {
  list:   (periodId) => request('/industry-consultants', { query: { period_id: periodId } }),
  get:    (id) => request(idPath('/industry-consultants', id)),
  create: (data, periodId) => request('/industry-consultants', { method: 'POST', body: { ...data, period_id: periodId } }),
  update: (id, patch) => request(idPath('/industry-consultants', id), { method: 'PATCH', body: patch }),
  assign: (id, payload) => request(idPath('/industry-consultants', id) + '/assign', { method: 'PATCH', body: payload }),
  remove: (id) => request(idPath('/industry-consultants', id), { method: 'DELETE' }),
  upload: (file, periodId) => uploadFile('/industry-consultants/upload', file, periodId),
  // Dry run — same route, nothing written. Feeds the Preview & Confirm step.
  uploadPreview: (file, periodId) => uploadPreview('/industry-consultants/upload', file, periodId),
};

// An assignment fills a course OFFERING — a (course × program) pairing — so
// every write carries the program the Program Head is working in. Without it a
// course code can't identify a single offering (GE 101 is offered by several
// programs, each with its own syllabus and its own assigned faculty).
export const CourseOfferingAssignmentsAPI = {
  list:   (periodId) => request('/course-offering-assignments', { query: { period_id: periodId } }),
  get:    (id) => request(idPath('/course-offering-assignments', id)),
  create: (data, periodId, programId) => request('/course-offering-assignments', {
    method: 'POST',
    body: { ...data, period_id: periodId, program_id: programId ?? null },
  }),
  update: (id, patch) => request(idPath('/course-offering-assignments', id), { method: 'PATCH', body: patch }),
  remove: (id) => request(idPath('/course-offering-assignments', id), { method: 'DELETE' }),
  upload: (file, periodId, programId) => {
    const fd = new FormData();
    fd.append('file', file);
    if (periodId)  fd.append('period_id', String(periodId));
    if (programId) fd.append('program_id', String(programId));
    return request('/course-offering-assignments/upload', { method: 'POST', body: fd });
  },
  // Dry run — same route, nothing written.
  //
  // `program_id` (snake) is NOT optional and NOT a typo: the controller reads
  // req.body.program_id, and an assignment resolves against a (course × program)
  // offering. Send a different program than the commit — or none — and every row
  // comes back "Unassigned" in the preview and then imports cleanly anyway. The
  // preview would be warning about problems the real import doesn't have, which
  // is the one kind of wrong that teaches users to ignore it.
  //
  // (Courses spells the same idea `programId` (camel). They are different routes
  // reading different fields; do not "tidy" one into the other.)
  uploadPreview: (file, periodId, programId) =>
    uploadPreview('/course-offering-assignments/upload', file, periodId, { program_id: programId }),
  revalidate: (periodId) => request('/course-offering-assignments/revalidate', { method: 'POST', query: { period_id: periodId } }),
};

// Undo for the bulk-upload buttons. The backend snapshots the affected tables
// before each upload and keeps them restorable for 30 SECONDS; `latest` returns
// null once that window closes, so the UI can go quiet on its own.
//
// The deadline lives on the server (UNDO_WINDOW_MS in server/utils/importUndo.js)
// and reaches the client as `batch.ms_remaining`. Count down from that — never
// from a hardcoded 30 — or the toast and the server will disagree the moment
// the constant moves.
//
// entity: 'departments' | 'faculty' | 'programs' | 'courses'
//         | 'course_offering_assignments' | 'industry_consultants'
export const ImportsAPI = {
  latest: (entity, periodId) => request('/imports/latest', { query: { entity, period_id: periodId } }),
  undo:   (batchId) => request(idPath('/imports', batchId) + '/undo', { method: 'POST' }),
};

export const ArchiveAPI = {
  // Period-scoped list of archived records for one module. moduleType:
  //   'academic_terms' | 'departments' | 'faculty' | 'programs'
  //   | 'consultants' | 'course_offering_assignments'.
  // periodId is the dashboard's active term; required for every module
  // except 'academic_terms' (which is the period itself).
  // Returns { rows: [...] }.
  list: (moduleType, periodId) =>
    request('/archive', { query: { module: moduleType, period_id: periodId } }),
};

export const ApiBaseURL = BASE_URL;
