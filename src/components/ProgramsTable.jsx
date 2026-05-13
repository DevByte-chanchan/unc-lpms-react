import { Link } from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass'
import { ChevronRight } from 'react-feather'
import { UserPlus } from 'react-feather'

const mockPrograms = [
  { code: 'BSIT', name: 'Bachelor of Science in Information Technology', head: '' },
  { code: 'BSCS', name: 'Bachelor of Science in Computer Science', head: '' },
  { code: 'BSEMC', name: 'BS in Entertainment and Multimedia Computing', head: '' },
]

const ProgramsTable = ({ programs = mockPrograms, onAssign }) => {
  return (
    <div className={styles['table-container']}>
      <table>
        <thead>
          <tr>
            <th width={120}>CODE</th>
            <th width={520}>NAME</th>
            <th width={260}>PROGRAM HEAD</th>
            <th className={styles.fill}></th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p, idx) => (
            <tr key={idx}>
              <td width={120}>{p.code}</td>
              <td width={520}>{p.name}</td>
              <td width={260}>{p.head || ''}</td>
              <td className={styles.fill}>
                  <a
                    href="#"
                    className={styles.actionLink}
                    onClick={(e) => { e.preventDefault(); onAssign && onAssign(p, idx); }}
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

export default ProgramsTable
