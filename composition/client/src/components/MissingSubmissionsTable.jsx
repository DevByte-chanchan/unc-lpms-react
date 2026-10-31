import React from 'react'
import styles from '../styles/CoursesTable.module.sass'
import TableScrollRegion from './TableScrollRegion.jsx'
import { shortDay, statusLabel, lastReminderShort, courseSubline, programCode, niceName } from '../utils/missingSubmissions.js'

// The plans still waiting on their instructor. One row per plan, with a tick to pick it for "Remind
// selected", where it stands against the due date, when the instructor was last reminded, and a switch for
// the automatic reminders of that plan. Kept short on purpose: a title that does not fit is cut with an
// ellipsis (the full text is the tooltip), dates leave out this year, and the program shows as its code and
// only when the rows come from more than one program.
const DOT = { overdue: '#E24B4A', 'due-soon': '#BA7517', 'on-track': '#1D9E75', 'no-deadline': '#94A3B8' }

const clip = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

const Standing = ({ row }) => (
  <span style={{ whiteSpace: 'nowrap' }}>
    <span aria-hidden="true" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: DOT[row.status], marginRight: 6 }} />
    {statusLabel(row)}
  </span>
)

// A small on / off switch: on = the system reminds this instructor by itself.
const Switch = ({ on, disabled, label, onClick }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onClick}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: 0, border: 0, background: 'none', cursor: disabled ? 'wait' : 'pointer', color: 'var(--ink-muted)', font: 'var(--fw-normal) var(--fs-xs) var(--font-ui)' }}>
    <span aria-hidden="true" style={{ position: 'relative', width: 30, height: 17, borderRadius: 9, background: on ? 'var(--primary)' : 'var(--line)', transition: 'background var(--t-fast)' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 15 : 2, width: 13, height: 13, borderRadius: '50%', background: '#fff', transition: 'left var(--t-fast)' }} />
    </span>
    {on ? 'On' : 'Paused'}
  </button>
)

const MissingSubmissionsTable = ({ rows = [], selected, onToggle, onToggleAll, onPause, busyId = null, today = '' }) => {
  const allTicked = rows.length > 0 && rows.every(row => selected.has(row.offeringId))
  const showProgram = new Set(rows.map(row => row.programId)).size > 1
  return (
    <TableScrollRegion label="Learning plans not yet submitted" minWidth={820} className={`${styles['table-container']} app-table`}>
      <table>
        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <tr>
            <th width={44}>
              <input type="checkbox" aria-label="Select all plans" checked={allTicked} onChange={() => onToggleAll(!allTicked)} />
            </th>
            <th width={270}>Course</th>
            <th width={150}>Instructor</th>
            {showProgram && <th width={80}>Program</th>}
            <th width={80}>Due</th>
            <th width={120}>Standing</th>
            <th width={140}>Last reminder</th>
            <th className={styles.fill}>Reminders</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.offeringId}>
              <td width={44}>
                <input type="checkbox" aria-label={`Select ${row.courseCode}`} checked={selected.has(row.offeringId)} onChange={() => onToggle(row.offeringId)} />
              </td>
              <td width={270} style={{ minWidth: 0 }}>
                <div style={{ minWidth: 0, width: '100%' }}>
                  <div style={clip} title={`${row.courseCode} — ${row.courseTitle}`}><strong>{row.courseCode}</strong> {row.courseTitle}</div>
                  <div style={{ ...clip, fontSize: 'var(--fs-2xs)', color: 'var(--ink-muted)' }} title={courseSubline(row, today)}>{courseSubline(row, today)}</div>
                </div>
              </td>
              <td width={150} style={{ minWidth: 0 }}>
                <div style={{ minWidth: 0, width: '100%' }}>
                  <div style={clip} title={row.instructorName || ''}>{row.instructorName ? niceName(row.instructorName) : 'No instructor'}</div>
                  {row.instructorName && !row.instructorActive && <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--danger)' }}>Deactivated</div>}
                </div>
              </td>
              {showProgram && <td width={80}><div title={row.programName}>{programCode(row.programName)}</div></td>}
              <td width={80}><div style={{ whiteSpace: "nowrap" }}>{shortDay(row.syllabusDue, today)}</div></td>
              <td width={120}><Standing row={row} /></td>
              <td width={140}><div style={clip}>{lastReminderShort(row, today)}</div></td>
              <td className={styles.fill}>
                {row.status === 'no-deadline'
                  ? <span style={{ color: 'var(--ink-muted)', fontSize: 'var(--fs-xs)' }}>No due date</span>
                  : <Switch on={!row.remindersPaused} disabled={busyId === row.offeringId} label={`Automatic reminders for ${row.courseCode}`} onClick={() => onPause(row)} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScrollRegion>
  )
}

export default MissingSubmissionsTable
