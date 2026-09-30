import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildReferenceCourseTarget,
  filterAssignmentsByCourse,
  readAssignedCourseFilters,
} from './referenceCourseNavigation.js'

const assignment = ({
  code,
  assignedAt,
  revision = 1,
  submittedAt = null,
  logs = [],
  pcId = 1,
}) => ({
  date_assigned: assignedAt,
  date_submitted: submittedAt,
  ProgramCourseOffering: {
    pc_offering_id: pcId,
    revision_number: revision,
    Course: { course_no: code, course_title: `${code} title` },
  },
  logs,
})

test('a returned connected course opens its exact Assigned Course Offerings view', () => {
  const row = assignment({
    code: 'BIT321L',
    assignedAt: '2026-06-01T00:00:00.000Z',
    submittedAt: '2026-07-10T00:00:00.000Z',
    pcId: 9,
    logs: [
      { actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: '2026-07-10T00:00:00.000Z' },
      { actor_role: 'LIBRARY_DIRECTOR', action_type: 'RETURNED', createdAt: '2026-07-16T00:00:00.000Z' },
    ],
  })

  assert.deepEqual(buildReferenceCourseTarget('BIT321L', [row]), {
    kind: 'reviewable',
    href: '/role/director-of-libraries?status=returned&year=2026&semester=1st%20Sem&course=BIT321L',
  })
})

test('a January assignment opens the second semester of the preceding academic year', () => {
  const row = assignment({
    code: 'BIT213L',
    assignedAt: '2026-01-15T00:00:00.000Z',
    submittedAt: '2026-01-18T00:00:00.000Z',
    pcId: 14,
    logs: [
      { actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: '2026-01-18T00:00:00.000Z' },
    ],
  })

  assert.equal(
    buildReferenceCourseTarget('BIT213L', [row]).href,
    '/role/director-of-libraries?status=pending&year=2025&semester=2nd%20Sem&course=BIT213L',
  )
})

test('a connected draft is labelled instead of linking to an empty approval list', () => {
  const row = assignment({
    code: 'BIT313L',
    assignedAt: '2026-07-15T00:00:00.000Z',
    logs: [{ actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', createdAt: '2026-07-15T00:00:00.000Z' }],
  })

  assert.deepEqual(buildReferenceCourseTarget('BIT313L', [row]), {
    kind: 'draft',
    message: 'Not yet submitted for review',
  })
})

test('a course without an assigned offering is labelled as unavailable', () => {
  assert.deepEqual(buildReferenceCourseTarget('MISSING101', []), {
    kind: 'missing',
    message: 'No assigned offering',
  })
})

test('the destination reads the course, term, and status carried by the link', () => {
  const params = new URLSearchParams('status=approved&year=2025&semester=2nd%20Sem&course=BIT213L')

  assert.deepEqual(readAssignedCourseFilters(params, 2026), {
    course: 'BIT213L',
    year: 2025,
    semester: '2nd Sem',
    status: 'APPROVED',
  })
})

test('the destination shows only the requested course code', () => {
  const rows = [
    assignment({ code: 'BIT321L', assignedAt: '2026-06-01T00:00:00.000Z' }),
    assignment({ code: 'BIT313L', assignedAt: '2026-07-15T00:00:00.000Z' }),
  ]

  assert.deepEqual(filterAssignmentsByCourse(rows, 'bit321l'), [rows[0]])
  assert.deepEqual(filterAssignmentsByCourse(rows, ''), rows)
})
