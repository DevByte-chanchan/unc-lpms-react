import styles from '../styles/CoursesTable.module.sass';

const mockDepartments = [
  { name: 'College of Education', code: 'COE', dean: 'Dr. Maria Santos' },
  { name: 'College of Engineering and Architecture', code: 'CEA', dean: 'Prof. Juan Dela Cruz' },
  { name: 'Criminal Justice Education', code: 'CJE', dean: 'Dr. Ana Reyes' },
  { name: 'School of Business and Accountancy', code: 'SBA', dean: 'Prof. Mark Tan' },
  { name: 'School of Computer and Information Sciences', code: 'SCIS', dean: 'Agnes Reyes' },
  { name: 'School of Nursing and Allied Health Sciences', code: 'SNAHS', dean: 'Prof. Rosa Garcia' },
  { name: 'School of Social and Natural Sciences', code: 'SSNS', dean: 'Dr. Miguel Santos' },
]

const DepartmentsTable = ({ departments = mockDepartments }) => {
  return (
    <div className={styles['table-container']}>
      <table>
        <thead>
          <tr>
            <th width={400}>NAME</th>
            <th width={200}>CODE</th>
            <th width={250}>DEAN</th>
            <th className={styles.fill}></th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept, idx) => (
            <tr key={idx}>
              <td width={400}>{dept.name}</td>
              <td width={200}>{dept.code}</td>
              <td width={250}>{dept.dean}</td>
              <td className={styles.fill}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DepartmentsTable
