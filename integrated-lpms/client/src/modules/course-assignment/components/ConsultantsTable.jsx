import React from 'react'
import styles from '../styles/CoursesTable.module.sass'
import { User } from 'react-feather'
import { statusPillStyle } from '../services/statusPolicy.js'
import { sortRows, nextSort } from '../services/tableSort.js'
import RowActionsMenu from './RowActionsMenu.jsx'
import SortableTh from './SortableTh.jsx'
import AccessChip, { inviteRowAction } from './AccessChip.jsx'

// An assigned course is either a plain code string (legacy) or { code, title }.
const courseCodeOf = (x) => (x && typeof x === 'object') ? (x.code || '') : (x || '');
const courseTitleOf = (x) => (x && typeof x === 'object') ? (x.title || '') : '';
const firstCourse = (c) => (Array.isArray(c.assignedCourse) ? courseCodeOf(c.assignedCourse[0]) : courseCodeOf(c.assignedCourse));
const ACCESS_RANK = { waiting: 0, failed: 1, expired: 2, held: 3, scheduled: 4, sending: 4, sent: 5, none: 6, disabled: 7, active: 8 };

const ConsultantsTable = ({ consultants = [], onAssign, onInvite, invitingId = null, hideDepartment = false, readOnly = false, showAccess = false }) => {
  const columns = React.useMemo(() => [
    { key: 'name', label: 'NAME', width: 260, type: 'text', thStyle: { flex: '1 1 auto', minWidth: 200 } },
    ...(!hideDepartment ? [{ key: 'department', label: 'DEPARTMENT', width: 400, type: 'text' }] : []),
    // Wider so "CODE — Course Name" fits on one line before the Status column.
    { key: 'assignedCourse', label: 'ASSIGNED COURSE OFFERING', width: 400, type: 'text', sortValue: firstCourse, thStyle: { flex: '1 1 auto', minWidth: 260 } },
    { key: 'status', label: 'STATUS', width: 130, type: 'number', thStyle: { paddingLeft: 0 }, sortable: false },
    ...(showAccess ? [{ key: 'access', label: 'ACCESS', width: 150, type: 'number', sortValue: (r) => ACCESS_RANK[r.access ? r.access.status : 'none'] ?? 9 }] : []),
  ], [hideDepartment, showAccess]);

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
            <th className={styles.fill} style={{ flex: '0 0 190px', minWidth: 190, marginLeft: 24 }}></th>
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
                <td width={400} style={{ flex: '1 1 auto', minWidth: 260 }}>
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
                {showAccess && (
                  <td width={150}><AccessChip access={c.access} /></td>
                )}
                <td className={styles.fill} style={{ flex: '0 0 190px', minWidth: 190, marginLeft: 24, paddingRight: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {/* Manage opens the popup for both status and course
                      assignment in one place; Invite now / Resend sends the
                      person their set-password link. */}
                  {!readOnly && (
                    <RowActionsMenu
                      row={c}
                      inline={[
                        onAssign && { key: 'manage', label: 'Manage', icon: <User size={16} />, onClick: (r) => onAssign(r) },
                        showAccess && inviteRowAction(c.access, onInvite, invitingId === c.id),
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
