// Every URL in the module, in one place.
//
// WHY THIS FILE. The route table and the 37 places that build links were
// independent, and they had drifted:
//
//   * `:courseName` and `:code` named the same thing — a course CODE, like
//     BSCS511 — in different routes. `:courseName` is also simply wrong: no
//     course name has ever been in it.
//   * `/role/program-head/upload-documents` opened the COAEP uploader and
//     `/role/director-of-libraries/upload-documents` opened the reference
//     library. Same segment, two unrelated screens, and the second was a
//     duplicate of `/role/director-of-libraries/reference-library`.
//
// THE RULE, so the next path does not have to be argued about:
//
//     /<collection>/<id-or-action>      kebab-case, collections plural
//     /role/<role>/<page>               anything scoped to one role
//
// NOTHING BREAKS. Every renamed path is still served, as a redirect to its
// replacement — see LEGACY_REDIRECTS. Old bookmarks work, a link I failed to
// update works, and a teammate's branch pointing at the old path works. The
// redirects are cheap to keep and expensive to have needed and not had.
//
// routes.test.js checks the two halves against each other: every builder here
// produces a path that some declared route matches, and every legacy path
// resolves to a declared route. That is the drift this file exists to stop,
// and it cannot be checked by reading either list alone.

/** Path patterns, exactly as they are declared to react-router. */
export const PATTERNS = {
    instructorHome: '/',
    recordComments: '/record-comments',

    syllabusByRevision: '/courses/:pcId/:revNum/:status',
    syllabusByOffering: '/offerings/:pcId/:status',
    syllabusByCode: '/courses/:code',
    syllabusByCodeStatus: '/courses/:code/:status',
    revisions: '/revisions/:code',

    referenceFormByIlo: '/references/form/:iloId/:status',
    referenceFormById: '/references/form/:refId',
    referenceFormByCode: '/references/form/:code/:refId',
    topicFormByIlo: '/topics/form/:iloId/:status',
    topicFormById: '/topics/form/:topicId',
    topicFormByCode: '/topics/form/:code/:topicId',
    tlaFormByIlo: '/tlas/form/:iloId/:status',
    tlaFormByCode: '/tlas/form/:code/:iloId/:status',
    iloForm: '/ilos/form/:code/:iloId',
    roleHome: '/role/:role',
    approvalCourseTable: '/role/:role/approval-course-table',
    approvalSyllabus: '/role/:role/courses/:code',

    coaepView: '/role/program-head/coaep',
    coPoAlignment: '/role/program-head/co-po-alignment',
    poPeoAlignment: '/role/program-head/po-peo-alignment',
    industryConsultants: '/role/program-head/industry-consultant',
    courseOfferings: '/role/program-head/course-offerings',
    userManagement: '/role/superuser',

    referenceLibrary: '/role/director-of-libraries/reference-library',
    courseCatalog: '/role/director-of-libraries/course-catalog',
    addReference: '/role/director-of-libraries/add-reference',
    viewReference: '/role/director-of-libraries/view-reference/:refId',
    editReference: '/role/director-of-libraries/edit-reference/:refId'
}

const enc = (v) => encodeURIComponent(String(v ?? ''))

// Query strings are built here too, so `?status=pending&pcId=…` is assembled
// one way rather than by hand at each call site.
const withQuery = (path, query) => {
    const entries = Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
    if (!entries.length) return path
    return `${path}?${entries.map(([k, v]) => `${k}=${enc(v)}`).join('&')}`
}

/** Builders. Use these instead of writing a path literal. */
export const routes = {
    instructorHome: () => '/',
    recordComments: () => '/record-comments',

    syllabusByRevision: (pcId, revNum, status) => `/courses/${enc(pcId)}/${enc(revNum)}/${enc(status)}`,
    // A working copy (no revision number yet) is addressed by its offering id alone.
    syllabusByOffering: (pcId, status) => `/offerings/${enc(pcId)}/${enc(status)}`,
    syllabusByCode: (code, status) => (status ? `/courses/${enc(code)}/${enc(status)}` : `/courses/${enc(code)}`),
    revisions: (code) => `/revisions/${enc(code)}`,

    referenceFormByIlo: (iloId, status) => `/references/form/${enc(iloId)}/${enc(status)}`,
    referenceFormById: (refId) => `/references/form/${enc(refId)}`,
    referenceFormByCode: (code, refId) => `/references/form/${enc(code)}/${enc(refId)}`,
    topicFormByIlo: (iloId, status) => `/topics/form/${enc(iloId)}/${enc(status)}`,
    topicFormById: (topicId) => `/topics/form/${enc(topicId)}`,
    topicFormByCode: (code, topicId) => `/topics/form/${enc(code)}/${enc(topicId)}`,
    tlaFormByIlo: (iloId, status) => `/tlas/form/${enc(iloId)}/${enc(status)}`,
    tlaFormByCode: (code, iloId, status) => `/tlas/form/${enc(code)}/${enc(iloId)}/${enc(status)}`,
    iloForm: (code, iloId) => `/ilos/form/${enc(code)}/${enc(iloId)}`,
    roleHome: (role) => `/role/${enc(role)}`,
    approvalCourseTable: (role, query) => withQuery(`/role/${enc(role)}/approval-course-table`, query),
    approvalSyllabus: (role, code, query) => withQuery(`/role/${enc(role)}/courses/${enc(code)}`, query),

    coaepView: () => '/role/program-head/coaep',
    coPoAlignment: () => '/role/program-head/co-po-alignment',
    poPeoAlignment: () => '/role/program-head/po-peo-alignment',
    industryConsultants: () => '/role/program-head/industry-consultant',
    courseOfferings: () => '/role/program-head/course-offerings',
    userManagement: () => '/role/superuser',

    referenceLibrary: () => '/role/director-of-libraries/reference-library',
    directorAssignedCourses: (query) => withQuery('/role/director-of-libraries', query),
    courseCatalog: (query) => withQuery('/role/director-of-libraries/course-catalog', query),
    addReference: () => '/role/director-of-libraries/add-reference',
    viewReference: (refId) => `/role/director-of-libraries/view-reference/${enc(refId)}`,
    editReference: (refId) => `/role/director-of-libraries/edit-reference/${enc(refId)}`
}

/**
 * Paths that used to work and still must.
 *
 * `from` is a react-router pattern; `to` maps the matched params to the new
 * path. A rename that forgets one of these is a blank screen for anybody
 * holding the old link, which is the entire reason renaming routes is usually
 * not worth doing — so it is done once, here, with the old ones kept.
 */
export const LEGACY_REDIRECTS = [
    // Same segment, two unrelated screens. The Program Head's is now the COAEP view.
    { from: '/role/program-head/upload-documents', to: () => routes.coaepView() },

    // The COAEP page never uploaded anything (it shows the plan generated from the syllabus),
    // so it was renamed from coaep-upload to coaep.
    { from: '/role/program-head/coaep-upload', to: () => routes.coaepView() },

    // An exact duplicate of the reference library, reachable under a name that
    // described neither it nor the Program Head screen of the same name.
    { from: '/role/director-of-libraries/upload-documents', to: () => routes.referenceLibrary() }
]

export default { PATTERNS, routes, LEGACY_REDIRECTS }
