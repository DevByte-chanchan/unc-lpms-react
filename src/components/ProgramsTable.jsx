import React from 'react'
import { Eye, Edit3, Archive } from 'react-feather'
import styles from '../styles/CoursesTable.module.sass'
import { statusPillStyle } from '../services/statusPolicy.js'
import { sortRows, statusRank, nextSort } from '../services/tableSort.js'
import RowActionsMenu from './RowActionsMenu.jsx'
import SortableTh from './SortableTh.jsx'

/**
 * Programs table.
 * Columns: CODE | NAME | FACULTY NAME | STATUS | (actions).
 *
 * Headers are click-to-sort (default: CODE ascending). FACULTY NAME sorts by
 * the head's name; STATUS sorts by the attention-first status order.
 *
 * If a `facultyNameSet` (Set of normalized names) is provided, any
 * program_head that isn't in the set gets a red "Unmatched" tag rendered
 * directly above the name in the cell.
 */
const headOf = (p) => p.program_head || p.head || p.faculty_name || '';

const COLUMNS = [
  { key: 'code',         label: 'CODE',         width: 120, type: 'text' },
  { key: 'name',         label: 'NAME',         width: 460, type: 'text', thStyle: { flex: '1 1 auto', minWidth: 280 } },
  { key: 'faculty_name', label: 'PROGRAM HEAD', width: 240, type: 'text', sortValue: headOf, thStyle: { flex: '1 1 auto', minWidth: 180 } },
  { key: 'status',       label: 'STATUS',       width: 120, type: 'number', sortable: false, sortValue: (r) => statusRank('program', r.status || 'Active') },
];

const ProgramsTable = ({ programs = [], onView, onEdit, facultyNameSet, normalizeFacultyName }) => {
  const isUnmatched = (head) => {
    if (!facultyNameSet || !normalizeFacultyName) return false;
    if (!head) return false;
    return !facultyNameSet.has(normalizeFacultyName(head));
  };
  const [sort, setSort] = React.useState({ sortKey: COLUMNS[0].key, sortDir: 'asc' });
  const onSort = (key) => setSort((s) => nextSort(s, key));
  const rows = sortRows(programs, COLUMNS, sort.sortKey, sort.sortDir);

  return (
    <div className={styles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'hidden' }}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            {COLUMNS.map((col) => (
              <SortableTh key={col.key} col={col} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={onSort} />
            ))}
            <th className={styles.fill} style={{ flex: '0 0 150px', minWidth: 150, marginLeft: 56 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const status = p.status || 'Active';
            const head = headOf(p);
            const unmatched = isUnmatched(head);
            return (
            <tr key={p.id || (p.code + '-' + p.name)}>
              <td width={120}>{p.code}</td>
              <td width={460} style={{ flex: '1 1 auto', minWidth: 280 }}>{p.name}</td>
              <td width={240} style={{ flex: '1 1 auto', minWidth: 180 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: 2 }}>
                  {unmatched && (
                    <span style={{ color: '#B91C1C', fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>
                      Unmatched
                    </span>
                  )}
                  <span>{head}</span>
                </div>
              </td>
              <td width={120}>
                <span style={{ ...statusPillStyle('program', status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                  {status}
                </span>
              </td>
              <td className={styles.fill} style={{ flex: '0 0 150px', minWidth: 150, marginLeft: 56, paddingRight: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                <RowActionsMenu
                  row={p}
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

export default ProgramsTable
