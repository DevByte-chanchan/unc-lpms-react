export const describeCourseLoadError = error => {
  const message = typeof error === 'string' ? error : error?.message || ''
  const status = Number(error?.status) || Number(message.match(/^HTTP (\d{3})/)?.[1])

  if (status === 404) return 'This course revision was not found. Return to Assigned Course Offerings and open a current record.'
  if (status === 403) return 'You do not have access to this course.'
  if (status === 401) return 'Your session has expired. Sign in again to view this course.'
  if (error instanceof TypeError || /failed to fetch|networkerror/i.test(message)) {
    return 'Could not connect to the server. Check the service and try again.'
  }
  return 'The course data could not be loaded. Try again shortly.'
}
