// Demo rows for the approvers' course table.
//
// `ApprovalCoursesTable` reads `/api/assignments`. With the backend down — or
// on a machine where nobody has seeded it — every tab renders as a blank page,
// which reads as a broken screen rather than "there is nothing here". These
// rows fill the tabs so the approver flow can be walked and demoed offline.
//
// The codes and their statuses come from `demoCourses.DEMO_COURSES_BY_STATUS`,
// the module's existing single source of truth for which course sits in which
// tab, so the table, the workflow store and the syllabus detail page all agree.
//
// The rows are in the SERVER's shape, not a shape of their own: the table's
// `getCode`/`getName`/`computeOverallStatus`/`buildApproverStatus` read them
// with no special-casing, so nothing downstream knows whether a row came from
// the API or from here.
//
// Pure — no fetch, no storage — so `demoAssignments.test.js` drives it under
// plain node.

import { DEMO_COURSES_BY_STATUS } from './demoCourses.js'

// Titles as they appear in `data/syllabiData.js`, so a demo row and the
// syllabus it opens do not disagree about the course name.
const COURSE_TITLES = {
    BSCS511: 'Mobile Game Development',
    BIT202: 'Object-Oriented Programming',
    BSCS502: 'Software Engineering',
    'IT 321': 'Network Administration',
    BSCS515: 'Cloud Computing',
    BIT304: 'Information Assurance and Security',
    BSCS508: 'Computer Graphics',
    'IT 402': 'Capstone Project 1',
    'IT 411': 'Information Management',
    BIT203: 'Database Management Systems',
    BSCS504: 'Operating Systems',
    'IT 305': 'Human Computer Interaction'
}

const DAY = 86400000

// Deterministic offering ids so a demo row keeps the same link across reloads.
const offeringIdFor = (code) => {
    let hash = 0
    for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0
    return 9000 + (hash % 900)
}

const log = (action_type, actor_role, at) => ({ action_type, actor_role, createdAt: at })

/**
 * One row per demo course, in the shape `/api/assignments` returns.
 *
 * @param {Date} now anchor for the relative dates (injected so the test is
 *                   not time-dependent)
 */
export const buildDemoAssignments = (now = new Date()) => {
    const at = (days) => new Date(now.getTime() - days * DAY).toISOString()

    const row = (code, status, index) => {
        const assigned = at(40 - index)
        const base = {
            demo: true,                       // so a caller can tell these apart
            assignment_id: `demo-${code}`,
            date_assigned: assigned,
            date_submitted: null,
            date_approved: null,
            instructor: 'CASIMERO, DANNY',
            // The approvals table reads the code out of `ProgramCourseOffering`,
            // the status dashboard reads it off the top level. Both shapes are
            // carried so one set of rows serves both screens.
            course_no: code,
            code,
            course_name: COURSE_TITLES[code] || code,
            name: COURSE_TITLES[code] || code,
            ProgramCourseOffering: {
                pc_offering_id: offeringIdFor(code),
                revision_number: 1,
                Course: {
                    course_no: code,
                    course_title: COURSE_TITLES[code] || code
                }
            },
            logs: []
        }

        if (status === 'pending') {
            // Submitted and waiting. One parallel reviewer has already accepted
            // on some rows so the chain popup is not uniformly empty — but never
            // the Dean, whose acceptance is what marks a plan approved.
            const submitted = at(10 - index)
            base.date_submitted = submitted
            base.logs = [log('SUBMITTED', 'INSTRUCTOR', submitted)]
            if (index % 2 === 1) {
                base.logs.push(log('ACCEPTED', 'LIBRARY_DIRECTOR', at(8 - index)))
            }
            return base
        }

        if (status === 'returned') {
            // Sent back: the newest log is the return, which is what
            // `computeOverallStatus` keys on.
            const submitted = at(14 - index)
            base.date_submitted = submitted
            base.logs = [
                log('SUBMITTED', 'INSTRUCTOR', submitted),
                log('ACCEPTED', 'LIBRARY_DIRECTOR', at(12 - index)),
                log('RETURNED', 'PROGRAM_HEAD', at(6 - index))
            ]
            return base
        }

        // approved — the Dean is last, and their acceptance carries the date.
        const submitted = at(30 - index)
        const deanAt = at(5 - index)
        base.date_submitted = submitted
        base.date_approved = deanAt
        base.logs = [
            log('SUBMITTED', 'INSTRUCTOR', submitted),
            log('ACCEPTED', 'LIBRARY_DIRECTOR', at(22 - index)),
            log('ACCEPTED', 'INDUSTRY_CONSULTANT', at(20 - index)),
            log('ACCEPTED', 'PROGRAM_HEAD', at(18 - index)),
            log('ACCEPTED', 'DEAN', deanAt)
        ]
        return base
    }

    return ['pending', 'returned', 'approved'].flatMap(status =>
        (DEMO_COURSES_BY_STATUS[status] || []).map((code, i) => row(code, status, i))
    )
}

/**
 * What the table should render: whatever the API returned, or the demo rows
 * when it returned nothing. Real data always wins — this never mixes the two,
 * so a live server with one assignment shows that one assignment, not one plus
 * twelve fakes.
 */
export const withDemoFallback = (rows, now = new Date()) => {
    const list = Array.isArray(rows) ? rows : []
    return list.length > 0 ? list : buildDemoAssignments(now)
}

export const isDemoRow = (row) => !!row?.demo

export default { buildDemoAssignments, withDemoFallback, isDemoRow, COURSE_TITLES }
