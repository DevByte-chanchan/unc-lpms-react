// node src/utils/routes.test.js
//
// The point of this file is the one thing neither list can check alone: that
// the BUILDERS and the ROUTE PATTERNS still agree. A link that points at a
// path no route serves is a blank screen, and it is invisible until somebody
// clicks it — the build passes, eslint passes, and nothing in the module knows
// the two halves have drifted.

import { PATTERNS, routes, LEGACY_REDIRECTS } from './routes.js'

let passed = 0
const test = (name, fn) => {
    try { fn(); passed++; console.log(`✓ ${name}`) }
    catch (error) { console.error(`✗ ${name}\n  ${error.message}`); process.exitCode = 1 }
}
const assert = (condition, message) => { if (!condition) throw new Error(message) }

/**
 * Does `path` match `pattern`? A small stand-in for react-router's matcher —
 * enough for `/a/:b/c`, which is all this module uses.
 */
const matches = (pattern, path) => {
    const p = path.split('?')[0].split('/').filter(Boolean)
    const q = pattern.split('/').filter(Boolean)
    if (p.length !== q.length) return false
    return q.every((seg, i) => seg.startsWith(':') ? p[i].length > 0 : seg === p[i])
}
const anyPatternMatches = (path) => Object.values(PATTERNS).some(pattern => matches(pattern, path))

// One sample argument per parameter name, so a builder can be exercised
// without knowing which parameters it takes.
const SAMPLE = ['BSCS511', '12', '1', 'pending', '7', '3', 'instructor']

test('every builder produces a path some route actually serves', () => {
    for (const [name, build] of Object.entries(routes)) {
        // Builders take between zero and three arguments; feeding extras is
        // harmless and means this needs no per-route bookkeeping.
        const path = build(...SAMPLE.slice(0, build.length))
        assert(typeof path === 'string' && path.startsWith('/'), `${name} produced ${JSON.stringify(path)}`)
        assert(anyPatternMatches(path), `${name} produced "${path}", which no route in PATTERNS matches`)
    }
})

test('every legacy path still resolves to a route that exists', () => {
    assert(LEGACY_REDIRECTS.length > 0, 'there should be redirects for the renamed paths')
    for (const { from, to } of LEGACY_REDIRECTS) {
        assert(from.startsWith('/'), `legacy path ${from} should be absolute`)
        const target = to({})
        assert(anyPatternMatches(target), `${from} redirects to "${target}", which no route matches`)
        assert(target !== from, `${from} redirects to itself`)
    }
})

test('the retained renamed paths are the ones still supported', () => {
    const from = LEGACY_REDIRECTS.map(r => r.from)
    assert(!from.includes('/assignedtos'), 'the removed TOS route must not remain as a redirect')
    assert(from.includes('/role/program-head/upload-documents'), 'the old COAEP uploader path must still work')
    assert(from.includes('/role/program-head/coaep-upload'), 'the renamed COAEP path must still work')
    assert(from.includes('/role/director-of-libraries/upload-documents'), 'the duplicate library path must still work')
})

test('every path is kebab-case — no camelCase, no runtogetherwords', () => {
    for (const pattern of Object.values(PATTERNS)) {
        for (const segment of pattern.split('/').filter(Boolean)) {
            if (segment.startsWith(':')) continue
            assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(segment),
                `"${segment}" in "${pattern}" is not kebab-case`)
        }
    }
})

test('one parameter name per concept', () => {
    // `:courseName` held a course CODE — BSCS511 — in every route that used
    // it, alongside `:code` doing the same job elsewhere. Two names for one
    // thing is how a caller passes the wrong one.
    const params = new Set()
    for (const pattern of Object.values(PATTERNS)) {
        for (const segment of pattern.split('/')) {
            if (segment.startsWith(':')) params.add(segment.slice(1))
        }
    }
    assert(!params.has('courseName'), 'courseName is gone — a course code is :code')
    assert(!params.has('id'), 'bare :id is gone — say which id (:refId, :topicId, …)')
    const allowed = new Set(['code', 'status', 'pcId', 'revNum', 'iloId', 'refId', 'topicId', 'assessmentId', 'role'])
    for (const p of params) assert(allowed.has(p), `unexpected parameter name :${p}`)
})

test('a role page lives under /role, and nothing else does', () => {
    for (const [name, pattern] of Object.entries(PATTERNS)) {
        const roleScoped = pattern.startsWith('/role/')
        const mentionsRole = /program-head|director-of-libraries|superuser|:role/.test(pattern)
        assert(roleScoped === mentionsRole,
            `${name} ("${pattern}") is inconsistent about being role-scoped`)
    }
})

test('values are escaped, so a code with a space cannot break the URL', () => {
    const path = routes.syllabusByCode('IT 321')
    assert(path === '/courses/IT%20321', path)
    assert(routes.approvalSyllabus('dean', 'IT 321') === '/role/dean/courses/IT%20321')
})

test('query strings are built the same way everywhere', () => {
    assert(routes.approvalCourseTable('dean') === '/role/dean/approval-course-table',
        'no query means no question mark')
    assert(routes.approvalCourseTable('dean', { status: 'pending' }) === '/role/dean/approval-course-table?status=pending')
    // Empty values are dropped rather than sent as `&pcId=`.
    assert(routes.approvalSyllabus('dean', 'IT 321', { status: 'pending', pcId: '', revNum: 2 }) ===
        '/role/dean/courses/IT%20321?status=pending&revNum=2',
        routes.approvalSyllabus('dean', 'IT 321', { status: 'pending', pcId: '', revNum: 2 }))
    assert(routes.directorAssignedCourses({ status: 'returned', year: 2026, semester: '1st Sem', course: 'BIT321L' }) ===
        '/role/director-of-libraries?status=returned&year=2026&semester=1st%20Sem&course=BIT321L',
        routes.directorAssignedCourses({ status: 'returned', year: 2026, semester: '1st Sem', course: 'BIT321L' }))
})

console.log(`\n${passed} route checks passed.`)
