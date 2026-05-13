import React from 'react'
import styles from '../styles/CoursesTable.module.sass'
import { UserPlus } from 'react-feather'

const mockConsultants = [
  { name: 'Dennis Ignacio', department: 'School of Computer and Information Sciences' },
  { name: 'Maria Santos', department: 'College of Engineering' },
]

const ConsultantsTable = ({ consultants = mockConsultants, onAssign, hideDepartment = false }) => {
  return (
    <div className={styles['table-container']}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            <th width={260}>NAME</th>
            {!hideDepartment && <th width={500}>DEPARTMENT</th>}
            <th width={260}>ASSIGNED COURSE</th>
            <th className={styles.fill}></th>
          </tr>
        </thead>
        <tbody>
          {consultants.map((c, idx) => (
            <tr key={idx}>
              <td width={260}>{c.name}</td>
              {!hideDepartment && <td width={500}>{c.department}</td>}
              <td width={260}>
                {Array.isArray(c.assignedCourse) ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {c.assignedCourse.map((course, i) => (
                      <li key={i} style={{ fontSize: 14, lineHeight: '1.3', marginBottom: 4 }}>{course}</li>
                    ))}
                  </ul>
                ) : (
                  (c.assignedCourse || '')
                )}
              </td>
              <td className={styles.fill} style={{ minWidth: 160, paddingRight: 10 }}>
                <a
                  href="#"
                  className={styles.actionLink}
                  onClick={(e) => { e.preventDefault(); onAssign && onAssign(c, idx); }}
                  style={{ color: '#111827', display: 'inline-flex', alignItems: 'center' }}
                >
                  <span style={{ marginRight: 8 }}>Assign</span>
                  <span className={styles.actionIcon} style={{ color: '#111827' }}><UserPlus size={18} /></span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ConsultantsTable
