import test from 'node:test'
import assert from 'node:assert/strict'

let describeCourseLoadError
try {
  ({ describeCourseLoadError } = await import('./courseLoadError.js'))
} catch {
  // The first run must fail until the shared error presenter exists.
}

test('a missing course is not described as an offline backend', () => {
  assert.equal(typeof describeCourseLoadError, 'function')
  const error = Object.assign(new Error('HTTP 404: {"error":"Course resource not found."}'), { status: 404 })
  assert.equal(
    describeCourseLoadError(error),
    'This course revision was not found. Return to Assigned Course Offerings and open a current record.'
  )
})

test('permission and connectivity failures have distinct, readable guidance', () => {
  assert.equal(typeof describeCourseLoadError, 'function')
  assert.equal(describeCourseLoadError(Object.assign(new Error('HTTP 403'), { status: 403 })), 'You do not have access to this course.')
  assert.equal(describeCourseLoadError(new TypeError('Failed to fetch')), 'Could not connect to the server. Check the service and try again.')
})
