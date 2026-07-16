import styles from '../styles/CoursesTable.module.sass';
import { statusPillStyle } from '../services/statusPolicy.js';
import RowActions from './RowActions.jsx';

const DepartmentsTable = ({ departments = [], onView, onEdit }) => {
  return (
    <div className={styles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'hidden' }}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            <th width={420}>NAME</th>
            <th width={180} style={{ paddingLeft: 28 }}>CODE</th>
            <th width={220}>DEAN</th>
            <th width={120} style={{ paddingLeft: 28 }}>STATUS</th>
            <th className={styles.fill}></th>




















            
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => {
            const status = d.status || 'Active';
            return (
              <tr key={d.id || (d.code + '-' + d.name)}>
                <td width={420}>{d.name}</td>
                <td width={180} style={{ paddingLeft: 28 }}>{d.code}</td>
                <td width={220}>{d.dean || ''}</td>
                <td width={120} style={{ paddingLeft: 28 }}>
                  <span style={{ ...statusPillStyle('department', status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                    {status}
                  </span>
                </td>
                <td className={styles.fill} style={{ paddingRight: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <RowActions row={d} onView={onView} onEdit={onEdit} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DepartmentsTable;
