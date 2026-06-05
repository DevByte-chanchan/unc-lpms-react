import React from 'react';
import { Eye, Edit3, Archive } from 'react-feather';
import styles from '../styles/CoursesTable.module.sass';
import { statusPillStyle, archiveStatusList } from '../services/statusPolicy.js';
import { sortRows, statusRank, nextSort } from '../services/tableSort.js';
import RowActionsMenu from './RowActionsMenu.jsx';
import SortableTh from './SortableTh.jsx';

const FacultyTable = ({ faculty = [], onView, onEdit, onArchive, hideDepartment = false }) => {
  const columns = React.useMemo(() => [
    { key: 'name', label: 'NAME', width: hideDepartment ? 500 : 380, type: 'text' },
    ...(!hideDepartment ? [{ key: 'department', label: 'DEPARTMENT', width: 180, type: 'text' }] : []),
    { key: 'role', label: 'ROLE', width: 180, type: 'text' },
    { key: 'status', label: 'STATUS', width: 120, type: 'number', sortValue: (r) => statusRank('faculty', r.status || 'Active') },
  ], [hideDepartment]);

  const [sort, setSort] = React.useState({ sortKey: 'name', sortDir: 'asc' });
  const onSort = (key) => setSort((s) => nextSort(s, key));
  const rows = sortRows(faculty, columns, sort.sortKey, sort.sortDir);

  return (
    <div className={styles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'hidden' }}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            {columns.map((col) => (
              <SortableTh key={col.key} col={col} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={onSort} />
            ))}
            <th className={styles.fill}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, idx) => {
            const status = f.status || 'Active';
            return (
              <tr key={f.id || idx}>
                <td width={hideDepartment ? 500 : 380}>{f.name}</td>
                {!hideDepartment && <td width={180}>{f.department}</td>}
                <td width={180}>{f.role}</td>
                <td width={120}>
                  <span style={{ ...statusPillStyle('faculty', status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                    {status}
                  </span>
                </td>
                <td className={styles.fill} style={{ paddingRight: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <RowActionsMenu
                    row={f}
                    inline={[
                      onView && { key: 'view', label: 'View', icon: <Eye size={16} />, onClick: onView },
                      onEdit && { key: 'edit', label: 'Edit', icon: <Edit3 size={16} />, onClick: onEdit },
                    ].filter(Boolean)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )
}

export default FacultyTable
