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
};

export const FacultyAPI = {
  list:   (periodId) => request('/faculty', { query: { period_id: periodId } }),
  get:    (id) => request(idPath('/faculty', id)),
  create: (data, periodId) => request('/faculty', { method: 'POST', body: { ...data, period_id: periodId } }),
  update: (id, patch) => request(idPath('/faculty', id), { method: 'PATCH', body: patch }),
  inactivateMany: (ids) => request('/faculty/inactivate', { method: 'PATCH', body: { ids } }),
  remove: (id) => request(idPath('/faculty', id), { method: 'DELETE' }),
  upload: (file, periodId) => uploadFile('/faculty/upload', file, periodId),
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
  // recognizedCount, unassigned[] } so the UI can resolve unrecognized year
  // levels before committing. Persists nothing.
  uploadPreview: (file, periodId) => {
    const fd = new FormData();
    fd.append('file', file);
    if (periodId) fd.append('period_id', String(periodId));
    return request('/courses/upload', { method: 'POST', body: fd, query: { preview: 1 } });
  },
  // Commit an upload, applying the year-level resolutions chosen in the popup:
  //   yearLevelOverrides — { "<course_no>": "FIRST YEAR" | … } for resolved rows
  //   skipCodes          — ["<course_no>", …] rows to NOT import
  uploadCommit: (file, periodId, { yearLevelOverrides, skipCodes } = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    if (periodId) fd.append('period_id', String(periodId));
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
};

export const CourseOfferingsAPI = {
  list:   (periodId) => request('/course-offerings', { query: { period_id: periodId } }),
  get:    (id) => request(idPath('/course-offerings', id)),
  create: (data, periodId) => request('/course-offerings', { method: 'POST', body: { ...data, period_id: periodId } }),
  update: (id, patch) => request(idPath('/course-offerings', id), { method: 'PATCH', body: patch }),
  assign: (id, instructor_name) => request(idPath('/course-offerings', id) + '/assign', { method: 'PATCH', body: { instructor_name } }),
  remove: (id) => request(idPath('/course-offerings', id), { method: 'DELETE' }),
  upload: (file, periodId) => uploadFile('/course-offerings/upload', file, periodId),
};

export const ConsultantsAPI = {
  list:   (periodId) => request('/industry-consultants', { query: { period_id: periodId } }),
  get:    (id) => request(idPath('/industry-consultants', id)),
  create: (data, periodId) => request('/industry-consultants', { method: 'POST', body: { ...data, period_id: periodId } }),
  update: (id, patch) => request(idPath('/industry-consultants', id), { method: 'PATCH', body: patch }),
  assign: (id, payload) => request(idPath('/industry-consultants', id) + '/assign', { method: 'PATCH', body: payload }),
  remove: (id) => request(idPath('/industry-consultants', id), { method: 'DELETE' }),
  upload: (file, periodId) => uploadFile('/industry-consultants/upload', file, periodId),
};

export const CourseAssignmentsAPI = {
  list:   (periodId) => request('/course-assignments', { query: { period_id: periodId } }),
  get:    (id) => request(idPath('/course-assignments', id)),
  create: (data, periodId) => request('/course-assignments', { method: 'POST', body: { ...data, period_id: periodId } }),
  update: (id, patch) => request(idPath('/course-assignments', id), { method: 'PATCH', body: patch }),
  remove: (id) => request(idPath('/course-assignments', id), { method: 'DELETE' }),
  upload: (file, periodId) => uploadFile('/course-assignments/upload', file, periodId),
  revalidate: (periodId) => request('/course-assignments/revalidate', { method: 'POST', query: { period_id: periodId } }),
};

export const ArchiveAPI = {
  // Period-scoped list of archived records for one module. moduleType:
  //   'academic_terms' | 'departments' | 'faculty' | 'programs'
  //   | 'course_offerings' | 'consultants' | 'course_assignments'.
  // periodId is the dashboard's active term; required for every module
  // except 'academic_terms' (which is the period itself).
  // Returns { rows: [...] }.
  list: (moduleType, periodId) =>
    request('/archive', { query: { module: moduleType, period_id: periodId } }),
};

export const ApiBaseURL = BASE_URL;
