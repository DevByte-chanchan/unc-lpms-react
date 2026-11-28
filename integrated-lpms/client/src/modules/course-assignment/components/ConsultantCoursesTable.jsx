import React from 'react'
import styles from '../styles/CoursesTable.module.sass'
import { ConsultantsAPI } from '../services/api.js'

/**
 * The Industry Consultant's Syllabus page: the courses their Program Head
 * assigned them this term, with each syllabus's status.
 */
const ConsultantCoursesTable = () => {
  const [rows, setRows] = React.useState(null)   // null = loading
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    let cancelled = false
    ConsultantsAPI.myCourses()
      .then((list) => { if (!cancelled) setRows(Array.isArray(list) ? list : []) })
      .catch((err) => { if (!cancelled) { setRows([]); setError(err.message || 'Could not load your courses.') } })
    return () => { cancelled = true }
  }, [])

  const note = (text) => (
    <p style={{ fontSize: 14, color: '#6B7280', padding: '16px 0' }}>{text}</p>
  )

  return (
    <div className={styles['courses-table']}>
      <div className={styles.header}>
        <h2>SYLLABUS</h2>
      </div>

      <div className={styles['table-container']}>
        {rows === null && note('Loading…')}
        {rows !== null && error && note(error)}
        {rows !== null && !error && rows.length === 0 &&
          note('No courses assigned to you yet. Your Program Head assigns courses in the Industry Consultant page.')}
        {rows !== null && rows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th width={150}>COURSE CODE</th>
                <th width={350}>COURSE TITLE</th>
                <th width={180}>YEAR LEVEL</th>
                <th width={200}>SYLLABUS STATUS</th>
                <th className={styles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code}>
                  <td width={150}>{row.code}</td>
                  <td width={350}>{row.title || '—'}</td>
                  <td width={180}>{row.year_level || '—'}</td>
                  {/* TODO(syllabus): the real status, once the syllabus workflow stores submissions. */}
                  <td width={200}>Not yet submitted</td>
                  <td className={styles.fill}></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ConsultantCoursesTable
