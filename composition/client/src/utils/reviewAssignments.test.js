import test from 'node:test'
import assert from 'node:assert/strict'

let loadReviewAssignments
let canReviewLoadedCourse
try {
  ({ loadReviewAssignments, canReviewLoadedCourse } = await import('./reviewAssignments.js'))
} catch {
  // The first run must fail until the live-data loader exists.
}

const realAssignment = {
  co_assign_id: 7,
  date_assigned: '2026-09-01T00:00:00.000Z',
  date_submitted: '2026-09-02T00:00:00.000Z',
  ProgramCourseOffering: {
    pc_offering_id: 4,
    revision_number: 1,
    Course: { course_no: 'BIT202', course_title: 'Software Engineering' }
  },
  logs: [{ actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: '2026-09-02T00:00:00.000Z' }]
}

test('an empty live assignment response stays empty rather than becoming fake review links', async () => {
  assert.equal(typeof loadReviewAssignments, 'function')
  const rows = await loadReviewAssignments(async () => ({ total: 0, page: 1, perPage: 25, data: [] }), 2026, '1st Sem')
  assert.deepEqual(rows, [])
})

test('the loader keeps real offering ids and requests the selected academic term', async () => {
  assert.equal(typeof loadReviewAssignments, 'function')
  let requestedUrl
  const rows = await loadReviewAssignments(async url => {
    requestedUrl = url
    return { total: 1, page: 1, perPage: 25, data: [realAssignment] }
  }, 2026, '1st Sem')
  assert.equal(requestedUrl, '/api/assignments?year=2026&semester=1st%20Sem')
  assert.equal(rows[0].ProgramCourseOffering.pc_offering_id, 4)
  assert.equal(rows[0].ProgramCourseOffering.Course.course_title, 'Software Engineering')
})

test('a failed request remains an error instead of silently showing demo records', async () => {
  assert.equal(typeof loadReviewAssignments, 'function')
  await assert.rejects(
    () => loadReviewAssignments(async () => { throw new Error('HTTP 503') }, 2026, '1st Sem'),
    /HTTP 503/
  )
})

test('review actions require a loaded revision matching the opened course', () => {
  assert.equal(typeof canReviewLoadedCourse, 'function')
  const context = { pcId: '4', revNum: '1', code: 'BIT202', details: { code: 'BIT202', revision: 1 }, error: '' }
  assert.equal(canReviewLoadedCourse(context), true)
  assert.equal(canReviewLoadedCourse({ ...context, details: null }), false)
  assert.equal(canReviewLoadedCourse({ ...context, error: 'Course not found' }), false)
  assert.equal(canReviewLoadedCourse({ ...context, revNum: '2' }), false)
  assert.equal(canReviewLoadedCourse({ ...context, code: 'BIT203' }), false)
})

test('a working copy has no revision number and is reviewed by its offering id alone', () => {
  const working = { pcId: '16', revNum: null, code: 'BIT213L', details: { code: 'BIT213L', revision: null }, error: '' }
  assert.equal(canReviewLoadedCourse(working), true)
  assert.equal(canReviewLoadedCourse({ ...working, details: { code: 'BIT213L', revision: 2 } }), false, 'an approved revision must be opened with its number')
})
