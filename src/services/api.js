/**
 * API service — period-aware fetch wrapper.
 *
 * Every call carries the session cookie (credentials: 'include'). A 401 from
 * anything but /auth/* means the session is gone: we fire ONE `auth:expired`
 * window event (services/currentUser.jsx sends the user to /login?next=…) and
 * stay quiet for the rest of the burst until the next sign-in re-arms it.
 */

const BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:4000/api';

export const AUTH_EXPIRED_EVENT = 'auth:expired';
// Fired by services/currentUser.jsx whenever a session starts (sign-in or a
// restored cookie), so data that 401'd before sign-in can reload.
export const AUTH_SIGNED_IN_EVENT = 'auth:signed-in';
let expiredAnnounced = false;
/** Called after a successful sign-in / session check, so the next expiry is announced. */
export const rearmAuthExpired = () => { expiredAnnounced = false; };

async function request(path, { method = 'GET', body, headers = {}, query } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  const opts = { method, headers: { ...headers }, credentials: 'include' };
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
    if (res.status === 401 && !path.startsWith('/auth/') && !expiredAnnounced) {
      expiredAnnounced = true;
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
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


// University VMGO (OVPAA). Versioned, NOT period-scoped — no period_id here.
// `extract` only parses the PDF and returns fields to review; nothing is saved
// until `save` is called with the reviewed fields. Restore copies an old
// version forward as a new one, so history is never rewritten.
export const UniversityStatementsAPI = {
  // 404 (error.status) when nothing has been saved yet.
  current: () => request('/university-statements/current'),
  history: () => request('/university-statements/history'),
  get:     (id) => request(idPath('/university-statements', id)),
  // Returns { fields, warnings, pages, sha256, sameAsActive, filename }; 422 with
  // a plain message when the PDF can't be read (scanned image, wrong file).
  extract: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/university-statements/extract', { method: 'POST', body: fd });
  },
  // fields: { vision, mission, educational_policy, core_values, graduate_attributes,
  //           source_filename, source_sha256, uploaded_by }
  save:    (fields) => request('/university-statements', { method: 'POST', body: fields }),
  restore: (id, uploadedBy) => request(idPath('/university-statements', id) + '/restore', { method: 'POST', body: { uploaded_by: uploadedBy } }),
};

// Department vision & mission (Dean). The department twin of UniversityStatementsAPI:
// versioned per department_code (e.g. 'SCIS'), not period-scoped. The code
// must name a department in the current term.
export const DepartmentStatementsAPI = {
  // 404 (error.status) when nothing has been saved for this department yet.
  current: (departmentCode) => request('/department-statements', { query: { department_code: departmentCode } }),
  // The Active version of every department that has one.
  all:     () => request('/department-statements/all'),
  history: (departmentCode) => request('/department-statements/history', { query: { department_code: departmentCode } }),
  get:     (id) => request(idPath('/department-statements', id)),
  // Returns { fields, warnings, blockHeader, pages, sha256, sameAsActive, filename,
  // department_code, department_name }. fields: { vision, mission }. A warning
  // with code 'DEPARTMENT_MISMATCH' means the PDF names another department.
  extract: (file, departmentCode) => {
    const fd = new FormData();
    fd.append('department_code', departmentCode);
    fd.append('file', file);
    return request('/department-statements/extract', { method: 'POST', body: fd });
  },
  // fields: { vision, mission,
  //           source_filename, source_sha256, uploaded_by }
  save:    (departmentCode, fields) => request('/department-statements', { method: 'POST', body: { ...fields, department_code: departmentCode } }),
  restore: (id, uploadedBy) => request(idPath('/department-statements', id) + '/restore', { method: 'POST', body: { uploaded_by: uploadedBy } }),
};


// Sign-in. The session lives in an httpOnly cookie the page can't read; these
// calls only ever return the public `user` shape (never a password or hash).
export const AuthAPI = {
  login:  (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  // { user: { id, email, display_name, roles, must_change_password, facultyId, consultantId } }
  me:     (periodId) => request('/auth/me', { query: { period_id: periodId } }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { current_password: currentPassword, new_password: newPassword } }),
  // The emailed links (public). An invalid, used or expired link answers 410.
  // { display_name, email, roles }
  invitation:       (token) => request('/auth/invitation', { query: { token } }),
  // { user } — signs in THIS account, replacing any session the browser had.
  acceptInvitation: (token, password) => request('/auth/accept-invitation', { method: 'POST', body: { token, password } }),
  // Always { message } — never says whether the email exists.
  forgotPassword:   (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  // { display_name, email }
  resetInfo:        (token) => request('/auth/reset-password', { query: { token } }),
  // { user } — signs in THIS account, replacing any session the browser had.
  resetPassword:    (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

// Account management (VPAA). Create and reset return { account, temp_password }:
// the temporary password is shown once and can't be fetched again.
export const UserAccountsAPI = {
  list:          () => request('/user-accounts'),
  create:        (data) => request('/user-accounts', { method: 'POST', body: data }),
  update:        (id, patch) => request(idPath('/user-accounts', id), { method: 'PATCH', body: patch }),
  resetPassword: (id) => request(idPath('/user-accounts', id) + '/reset-password', { method: 'POST' }),
  // { created: [{ email, display_name, roles, temp_password }], skipped: [{ name, email, reason }] }
  fromFaculty:   (periodId) => request('/user-accounts/from-faculty', { method: 'POST', body: { period_id: periodId } }),
  // Email a set-password link now (supersedes earlier links). { message, invitation }
  sendInvitation:    (id) => request(idPath('/user-accounts', id) + '/send-invitation', { method: 'POST' }),
  // Email a 1-hour reset link now. { message }
  sendPasswordReset: (id) => request(idPath('/user-accounts', id) + '/send-password-reset', { method: 'POST' }),
  // Held invitations with no account yet (bad or colliding email).
  heldInvitations:   () => request('/user-accounts/held-invitations'),
};

export const ApiBaseURL = BASE_URL;
