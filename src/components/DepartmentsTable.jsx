import React from 'react';
import { Eye, Edit3, Archive } from 'react-feather';
import styles from '../styles/CoursesTable.module.sass';
import { statusPillStyle, archiveStatusList } from '../services/statusPolicy.js';
import { sortRows, statusRank, nextSort } from '../services/tableSort.js';
import RowActionsMenu from './RowActionsMenu.jsx';
import SortableTh from './SortableTh.jsx';

const COLUMNS = [
  { key: 'name',   label: 'NAME',   width: 420, type: 'text' },
  { key: 'code',   label: 'CODE',   width: 180, type: 'text', thStyle: { paddingLeft: 28 } },
  { key: 'dean',   label: 'DEAN',   width: 220, type: 'text' },
  { key: 'status', label: 'STATUS', width: 120, type: 'number', sortValue: (r) => statusRank('department', r.status || 'Active') },
];

const DepartmentsTable = ({ departments = [], onView, onEdit, onArchive }) => {
  const [sort, setSort] = React.useState({ sortKey: COLUMNS[0].key, sortDir: 'asc' });
  const onSort = (key) => setSort((s) => nextSort(s, key));
  const rows = sortRows(departments, COLUMNS, sort.sortKey, sort.sortDir);

  return (
    <div className={styles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'hidden' }}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            {COLUMNS.map((col) => (
              <SortableTh key={col.key} col={col} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={onSort} />
            ))}
            <th className={styles.fill}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const status = d.status || 'Active';
            return (
              <tr key={d.id || (d.code + '-' + d.name)}>
                <td width={420}>{d.name}</td>
                <td width={180} style={{ paddingLeft: 28 }}>{d.code}</td>
                <td width={220}>{d.dean || ''}</td>
                <td width={120}>
                  <span style={{ ...statusPillStyle('department', status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                    {status}
                  </span>
                </td>
                <td className={styles.fill} style={{ paddingRight: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <RowActionsMenu
                    row={d}
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
  );
};

export default DepartmentsTable;
