import React from 'react'
import styles from '../styles/CoursesTable.module.sass'
import { User, Archive } from 'react-feather'
import { statusPillStyle } from '../services/statusPolicy.js'
import { sortRows, nextSort } from '../services/tableSort.js'
import RowActionsMenu from './RowActionsMenu.jsx'
import SortableTh from './SortableTh.jsx'

// An assigned course is either a plain code string (legacy) or { code, title }.
const courseCodeOf = (x) => (x && typeof x === 'object') ? (x.code || '') : (x || '');
const courseTitleOf = (x) => (x && typeof x === 'object') ? (x.title || '') : '';
const firstCourse = (c) => (Array.isArray(c.assignedCourse) ? courseCodeOf(c.assignedCourse[0]) : courseCodeOf(c.assignedCourse));

const ConsultantsTable = ({ consultants = [], onAssign, hideDepartment = false, readOnly = false }) => {
  const columns = React.useMemo(() => [
    { key: 'name', label: 'NAME', width: 260, type: 'text', thStyle: { flex: '1 1 auto', minWidth: 200 } },
    ...(!hideDepartment ? [{ key: 'department', label: 'DEPARTMENT', width: 400, type: 'text' }] : []),
    // Wider so "CODE — Course Name" fits on one line before the Status column.
    { key: 'assignedCourse', label: 'ASSIGNED COURSE OFFERING', width: 440, type: 'text', sortValue: firstCourse, thStyle: { flex: '1 1 auto', minWidth: 280 } },
    { key: 'status', label: 'STATUS', width: 130, type: 'number', thStyle: { paddingLeft: 0 }, sortable: false },
  ], [hideDepartment]);

  const [sort, setSort] = React.useState({ sortKey: 'name', sortDir: 'asc' });
  const onSort = (key) => setSort((s) => nextSort(s, key));
  const rows = sortRows(consultants, columns, sort.sortKey, sort.sortDir);

  return (
    <div className={styles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'hidden' }}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            {columns.map((col) => (
              <SortableTh key={col.key} col={col} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={onSort} />
            ))}
            <th className={styles.fill} style={{ flex: '0 0 130px', minWidth: 130, marginLeft: 56 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, idx) => {
            // No default — blank status means the user hasn't picked one
            // in the Manage popup yet.
            const status = c.status || '';
            return (
              <tr key={c.id || idx}>
                <td width={260} style={{ flex: '1 1 auto', minWidth: 200 }}>{c.name}</td>
                {!hideDepartment && <td width={400}>{c.department}</td>}
                <td width={440} style={{ flex: '1 1 auto', minWidth: 280 }}>
                  {Array.isArray(c.assignedCourse) ? (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {c.assignedCourse.map((course, i) => {
                        const code = courseCodeOf(course);
                        const title = courseTitleOf(course);
                        return (
                          <li key={i} style={{ fontSize: 14, lineHeight: '1.35', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600 }}>{code}</span>{title ? ' — ' + title : ''}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    (c.assignedCourse || '')
                  )}
                </td>
                <td width={130} style={{ paddingLeft: 0 }}>
                  {status ? (
                    <span style={{ ...statusPillStyle('consultant', status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                      {status}
                    </span>
                  ) : (
                    <span style={{ color: '#9CA3AF', fontSize: 12, fontStyle: 'italic' }}>—</span>
                  )}
                </td>
                <td className={styles.fill} style={{ flex: '0 0 130px', minWidth: 130, marginLeft: 56, paddingRight: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {/* Manage opens the popup for both status and course
                      assignment in one place; Archive removes the row. */}
                  {!readOnly && (
                    <RowActionsMenu
                      row={c}
                      inline={[
                        onAssign && { key: 'manage', label: 'Manage', icon: <User size={16} />, onClick: (r) => onAssign(r) },
                      ].filter(Boolean)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ConsultantsTable
