import test from 'node:test'
import assert from 'node:assert/strict'

let getVisibleCourseOfferings
try {
  ({ getVisibleCourseOfferings } = await import('./courseOfferingView.js'))
} catch {
  // The first run should fail until the view model is implemented.
}

const offerings = [
  { code: 'BIT313L', title: 'Human Computer Interaction', year: 'Third Year', instructor: 'Santos' },
  { code: 'BIT111', title: 'Algorithms', year: 'First Year', instructor: 'Cruz' },
  { code: 'BIT220', title: 'Database Systems', year: 'Second Year', instructor: 'Reyes' }
]

test('course search matches code, title, and instructor without changing the source list', () => {
  assert.equal(typeof getVisibleCourseOfferings, 'function')
  assert.deepEqual(getVisibleCourseOfferings(offerings, { query: 'sAnToS' }).map(row => row.code), ['BIT313L'])
  assert.deepEqual(getVisibleCourseOfferings(offerings, { query: 'bit220' }).map(row => row.code), ['BIT220'])
  assert.deepEqual(offerings.map(row => row.code), ['BIT313L', 'BIT111', 'BIT220'])
})

test('course filters and title sort work together', () => {
  assert.equal(typeof getVisibleCourseOfferings, 'function')
  assert.deepEqual(
    getVisibleCourseOfferings(offerings, { yearLevel: 'Third Year', sortOrder: 'title-desc' }).map(row => row.code),
    ['BIT313L']
  )
  assert.deepEqual(
    getVisibleCourseOfferings(offerings, { sortOrder: 'title-asc' }).map(row => row.code),
    ['BIT111', 'BIT220', 'BIT313L']
  )
  assert.deepEqual(
    getVisibleCourseOfferings(offerings, { sortOrder: 'title-desc' }).map(row => row.code),
    ['BIT313L', 'BIT220', 'BIT111']
  )
})
