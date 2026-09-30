export const getVisibleCourseOfferings = (rows = [], { query = '', yearLevel = '', sortOrder = '' } = {}) => {
  const term = query.trim().toLocaleLowerCase()
  const visible = rows.filter(row => {
    const matchesYear = !yearLevel || row.year === yearLevel
    const searchable = [row.code, row.title, row.instructor].join(' ').toLocaleLowerCase()
    return matchesYear && (!term || searchable.includes(term))
  })

  if (sortOrder === 'title-asc' || sortOrder === 'title-desc') {
    const direction = sortOrder === 'title-asc' ? 1 : -1
    visible.sort((left, right) => direction * (
      left.title.localeCompare(right.title) || left.code.localeCompare(right.code)
    ))
  }

  return visible
}
