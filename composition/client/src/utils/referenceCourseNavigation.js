import { computeOverallStatus } from './assignmentStatus.js'
import { routes } from './routes.js'

const REVIEWABLE_STATUSES = new Set(['PENDING', 'RETURNED', 'APPROVED'])
const SEMESTERS = new Set(['1st Sem', '2nd Sem'])

export const getAssignmentCourseCode = (row = {}) => {
  const offering = row.ProgramCourseOffering || {}
  const course = offering.Course || {}
  return String(course.course_no || course.code || row.course_no || row.code || '').trim()
}

const assignmentTerm = (dateValue) => {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null

  const month = date.getUTCMonth()
  const year = date.getUTCFullYear()
  if (month >= 5 && month <= 10) return { year, semester: '1st Sem' }
  if (month === 11) return { year, semester: '2nd Sem' }
  if (month <= 3) return { year: year - 1, semester: '2nd Sem' }
  return null
}

const latestAssignment = (rows) => [...rows].sort((left, right) => {
  const dateDifference = new Date(right.date_assigned).getTime() - new Date(left.date_assigned).getTime()
  if (dateDifference) return dateDifference
  const leftRevision = Number(left.ProgramCourseOffering?.revision_number) || 0
  const rightRevision = Number(right.ProgramCourseOffering?.revision_number) || 0
  return rightRevision - leftRevision
})[0]

export const filterAssignmentsByCourse = (rows, courseCode) => {
  const list = Array.isArray(rows) ? rows : []
  const requestedCode = String(courseCode || '').trim().toLowerCase()
  if (!requestedCode) return list
  return list.filter(row => getAssignmentCourseCode(row).toLowerCase() === requestedCode)
}

export const buildReferenceCourseTarget = (courseCode, rows) => {
  const matches = filterAssignmentsByCourse(rows, courseCode)
  if (!matches.length) return { kind: 'missing', message: 'No assigned offering' }

  const row = latestAssignment(matches)
  const status = computeOverallStatus(row).toUpperCase()
  if (!REVIEWABLE_STATUSES.has(status)) {
    return { kind: 'draft', message: 'Not yet submitted for review' }
  }

  const term = assignmentTerm(row.date_assigned)
  if (!term) return { kind: 'missing', message: 'No assigned offering' }

  return {
    kind: 'reviewable',
    href: routes.directorAssignedCourses({
      status: status.toLowerCase(),
      year: term.year,
      semester: term.semester,
      course: getAssignmentCourseCode(row),
    }),
  }
}

export const readAssignedCourseFilters = (searchParams, currentYear) => {
  const requestedStatus = String(searchParams?.get('status') || '').toUpperCase()
  const requestedYear = Number(searchParams?.get('year'))
  const requestedSemester = searchParams?.get('semester') || ''

  return {
    course: String(searchParams?.get('course') || '').trim(),
    year: Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= currentYear
      ? requestedYear
      : currentYear,
    semester: SEMESTERS.has(requestedSemester) ? requestedSemester : '1st Sem',
    status: REVIEWABLE_STATUSES.has(requestedStatus) ? requestedStatus : 'PENDING',
  }
}

export default {
  buildReferenceCourseTarget,
  filterAssignmentsByCourse,
  getAssignmentCourseCode,
  readAssignedCourseFilters,
}
