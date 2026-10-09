import React from 'react'
import styles from '../styles/CoursesTable.module.sass'
import TableScrollRegion from './TableScrollRegion.jsx'

// The industry consultants the Program Head has assigned to courses. An assignment is ended by
// deactivating it, never by deleting it, so there is no delete action here: the row stays as
// part of the accreditation trail. Re-assigning a deactivated consultant reactivates the row.
const ConsultantsTable = ({ assignments = [], onDeactivate, onReactivate, busyId = null }) => (
  <TableScrollRegion label="Industry consultant assignments" minWidth={760} className={styles['table-container']}>
    <table>
      <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
        <tr>
          <th width={260}>CONSULTANT</th>
          <th width={320}>COURSE</th>
          <th width={140}>STATUS</th>
          <th className={styles.fill}></th>
        </tr>
      </thead>
      <tbody>
        {assignments.map(row => {
          const active = !!row.is_active
          return (
            <tr key={row.course_consultant_id}>
              <td>{row.consultant_name || `User ${row.consultant_user_id}`}</td>
              <td>{row.course_no} — {row.course_title}</td>
              <td>{active ? 'Active' : 'Deactivated'}</td>
              <td className={styles.fill}>
                {active ? (
                  <button type="button" className={styles.actionLink} disabled={busyId === row.course_consultant_id}
                    onClick={() => onDeactivate && onDeactivate(row)}>Deactivate</button>
                ) : (
                  <button type="button" className={styles.actionLink} disabled={busyId === row.course_consultant_id}
                    onClick={() => onReactivate && onReactivate(row)}>Reactivate</button>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </TableScrollRegion>
)

export default ConsultantsTable
