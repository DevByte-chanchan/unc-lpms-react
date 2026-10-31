import React from 'react'
import styles from '../styles/CoursesTable.module.sass'
import TableScrollRegion from './TableScrollRegion.jsx'
import { dayLabel, statusLabel, lastReminderLabel, assignedLabel, timeToPrepareLabel } from '../utils/missingSubmissions.js'

// The plans still waiting on their instructor. One row per plan, with a tick to pick it for "Remind
// selected", where it stands against the due date, when the instructor was last reminded, and whether
// the automatic reminders for it are paused.
const TONES = {
  overdue: { background: '#FEE2E2', color: '#991B1B' },
  'due-soon': { background: '#FEF3C7', color: '#92400E' },
  'on-track': { background: '#DCFCE7', color: '#166534' },
  'no-deadline': { background: '#F3F4F6', color: '#374151' }
}

const StatusBadge = ({ row }) => (
  <span style={{ ...TONES[row.status], padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
    {statusLabel(row)}
  </span>
)

const MissingSubmissionsTable = ({ rows = [], selected, onToggle, onToggleAll, onPause, busyId = null, showProgram = false }) => {
  const allTicked = rows.length > 0 && rows.every(row => selected.has(row.offeringId))
  return (
    <TableScrollRegion label="Learning plans not yet submitted" minWidth={1160} className={styles['table-container']}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            <th width={44}>
              <input type="checkbox" aria-label="Select all plans" checked={allTicked} onChange={() => onToggleAll(!allTicked)} />
            </th>
            <th width={230}>COURSE</th>
            <th width={190}>INSTRUCTOR</th>
            {showProgram && <th width={170}>PROGRAM</th>}
            <th width={170}>ASSIGNED</th>
            <th width={120}>DUE DATE</th>
            <th width={150}>STANDING</th>
            <th width={190}>LAST REMINDER</th>
            <th className={styles.fill}>AUTOMATIC REMINDERS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.offeringId}>
              <td width={44}>
                <input type="checkbox" aria-label={`Select ${row.courseCode}`} checked={selected.has(row.offeringId)} onChange={() => onToggle(row.offeringId)} />
              </td>
              <td width={230}>
                <div>
                <strong>{row.courseCode}</strong> — {row.courseTitle}
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {row.schoolYear} · {row.semester} semester · {row.state === 'Returned' ? 'returned, not resubmitted' : 'not submitted'}{row.isRevision ? ' · revision' : ''}
                </div>
                </div>
              </td>
              <td width={190}>
                <div>
                  {row.instructorName || 'No instructor'}
                  {row.instructorName && !row.instructorActive && <div style={{ fontSize: 12, color: '#991B1B' }}>Account is deactivated</div>}
                </div>
              </td>
              {showProgram && <td width={170}><div>{row.programName}</div></td>}
              <td width={170}><div>{assignedLabel(row)}<div style={{ fontSize: 12, color: row.assignedDaysBeforeDue < 0 ? '#991B1B' : '#6B7280' }}>{timeToPrepareLabel(row)}</div></div></td>
              <td width={120}>{dayLabel(row.syllabusDue)}</td>
              <td width={150}><StatusBadge row={row} /></td>
              <td width={190}>{lastReminderLabel(row)}</td>
              <td className={styles.fill}>
                {row.status === 'no-deadline'
                  ? <span style={{ color: '#6B7280' }}>Off: no due date set</span>
                  : (
                    <button type="button" className={styles.actionLink} disabled={busyId === row.offeringId} onClick={() => onPause(row)}>
                      {row.remindersPaused ? 'Paused — resume' : 'On — pause'}
                    </button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScrollRegion>
  )
}

export default MissingSubmissionsTable
