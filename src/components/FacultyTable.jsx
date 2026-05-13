
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight } from 'react-feather';
import { Link } from 'react-router-dom';

const mockFaculty = [
  { name: 'Agnes R. Trillanes', department: 'SCIS', role: 'Dean' },
  { name: 'June Arreb Danila', department: 'SCIS', role: 'Program Head' },
  { name: 'Dennis Ignacio', department: 'SCIS', role: 'Program Head' },
  { name: 'Danny B. Casimero', department: 'SCIS', role: 'Instructor' },
]

const FacultyTable = ({ faculty = mockFaculty, onView, hideDepartment = false }) => {
  return (
    <div className={styles['table-container']}>
      <table>
        <thead>
          <tr>
            <th width={hideDepartment ? 700 : 500}>NAME</th>
            {!hideDepartment && <th width={200}>DEPARTMENT</th>}
            <th width={200}>ROLE</th>
            <th className={styles.fill}></th>
          </tr>
        </thead>
        <tbody>
          {faculty.map((f, idx) => (
            <tr key={idx}>
              <td width={hideDepartment ? 700 : 500}>{f.name}</td>
              {!hideDepartment && <td width={200}>{f.department}</td>}
              <td width={200}>{f.role}</td>
              <td className={styles.fill}>
                <Link
                  to="#"
                  className={'actionLink'}
                  onClick={(e) => { e.preventDefault(); if (onView) onView(f); }}
                  style={{ background: 'transparent' }}
                >
                  View
                  <ChevronRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FacultyTable
