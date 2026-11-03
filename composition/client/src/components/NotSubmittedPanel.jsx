import React from 'react'
import { X, Calendar, CheckCircle } from 'react-feather'
import MissingSubmissionsTable from './MissingSubmissionsTable.jsx'
import EmptyState from './EmptyState.jsx'
import DatePicker from './DatePicker.jsx'
import { Loading, TableSkeleton } from './LoadingSkeleton.jsx'
import styles from '../styles/DueDateDialog.module.sass'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { dayLabel, programCode, sortMissing } from '../utils/missingSubmissions.js'

// When the system reminds the instructors for a due date: 7, 3 and 1 days before, on the day, then every third day.
const REMINDER_OFFSETS = [[-7, '7 days before'], [-3, '3 days before'], [-1, '1 day before'], [0, 'On the day']]
const shiftDay = (iso, days) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// The learning plans that are still waiting on their instructor, as the "Not submitted" tab of the Program Head's
// Learning plan page: who, since when, against which due date, and when they were last reminded. The page's own
// school year, semester and search choose what is listed. The system reminds the instructors by itself (7, 3 and 1
// days before the due date, on the day, then every third day overdue) once a due date is set for the program and
// term; this panel sets that date and pauses the reminders of a plan. It stays mounted while another tab is shown, so
// the tab's count is always known, and says how many plans it lists through `onCount`.
const NotSubmittedPanel = ({ active, schoolYear, semester, query = '', onCount }) => {
  const [data, setData] = React.useState(null)
  const [deadlines, setDeadlines] = React.useState({ programs: [], deadlines: [] })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [busyId, setBusyId] = React.useState(null)
  const [dialog, setDialog] = React.useState(null)
  const [dueText, setDueText] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [dialogError, setDialogError] = React.useState('')

  const load = React.useCallback(async () => {
    setError('')
    try {
      const [missing, set] = await Promise.all([fetchJson('/api/missing-submissions'), fetchJson('/api/term-deadlines')])
      setData(missing)
      setDeadlines(set)
    } catch (err) {
      setError(apiErrorMessage(err, 'The list could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const rows = data?.missing || []
  const needle = query.trim().toLowerCase()
  const visible = sortMissing(rows.filter(row => row.schoolYear === schoolYear && row.semester === semester
    && (!needle || [row.courseCode, row.courseTitle, row.instructorName, row.programName].some(v => String(v || '').toLowerCase().includes(needle)))))
  const count = (status) => visible.filter(row => row.status === status).length

  React.useEffect(() => { if (!loading && !error) onCount?.(visible.length) }, [loading, error, visible.length, onCount])

  const pause = async (row) => {
    setBusyId(row.offeringId); setError('')
    try {
      await fetchJson(`/api/missing-submissions/${row.offeringId}/pause`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paused: !row.remindersPaused })
      })
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'The reminders could not be changed.'))
    } finally {
      setBusyId(null)
    }
  }

  // ---- the due date of a program for the chosen term ----
  const termDeadline = (program) => deadlines.deadlines.find(d => d.program_id === program.program_id && d.school_year === schoolYear && d.semester === semester)
  const openDialog = (program) => { setDialog(program); setDueText(termDeadline(program)?.syllabus_due || ''); setDialogError('') }
  const closeDialog = () => { setDialog(null); setDialogError('') }

  const saveDeadline = async () => {
    setSaving(true); setDialogError('')
    try {
      await fetchJson('/api/term-deadlines', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: dialog.program_id, school_year: schoolYear, semester, syllabus_due: dueText })
      })
      closeDialog()
      await load()
    } catch (err) {
      setDialogError(apiErrorMessage(err, 'The due date could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const removeDeadline = async (program) => {
    const found = termDeadline(program)
    if (!found) return
    setError('')
    try {
      await fetchJson(`/api/term-deadlines/${found.id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'The due date could not be removed.'))
    }
  }

  const empty = !loading && !error && visible.length === 0

  return (
    <div style={{ display: active ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, gap: 10 }}>
      {error && <div role="alert" style={{ color: 'var(--danger)' }}>{error} <button type="button" className="btn btn-secondary btn-sm" onClick={load} style={{ marginLeft: 8 }}>Try again</button></div>}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', fontSize: 'var(--fs-sm)' }}>
        <div>
          {deadlines.programs.length === 0 ? (
            <div style={{ color: 'var(--ink-muted)' }}>You do not head a program yet.</div>
          ) : deadlines.programs.map(program => {
            const found = termDeadline(program)
            return (
              <div key={program.program_id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '2px 0', flexWrap: 'wrap' }}>
                <Calendar size={13} aria-hidden="true" style={{ color: 'var(--ink-muted)' }} />
                <span title={program.name}>Due date{deadlines.programs.length > 1 ? ` · ${programCode(program.name)}` : ''}</span>
                {found ? <strong>{dayLabel(found.syllabus_due)}</strong> : <span style={{ color: 'var(--warn)' }}>No due date, so no automatic reminders</span>}
                <button type="button" className="app-link-button" onClick={() => openDialog(program)}>{found ? 'Change' : 'Set due date'}</button>
                {found && <button type="button" className="app-link-button" onClick={() => removeDeadline(program)}>Remove</button>}
              </div>
            )
          })}
        </div>
        <span role="status" style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-muted)' }}>
          {[`${visible.length} not submitted`, count('overdue') ? `${count('overdue')} overdue` : '', count('due-soon') ? `${count('due-soon')} due soon` : '', count('no-deadline') ? `${count('no-deadline')} with no due date` : ''].filter(Boolean).join(' · ')}
        </span>
      </div>

      {loading ? (
        <Loading label="Loading the list…"><TableSkeleton rows={5} cols={[330, 170, 90, 170, 170, '1fr']} /></Loading>
      ) : empty ? (
        <EmptyState
          icon={<CheckCircle size={22} strokeWidth={1.6} />}
          title={rows.length === 0 ? 'Every assigned plan has been submitted' : 'Nothing matches these filters'}
          hint={rows.length === 0 ? 'Plans that are not submitted, or were returned and not resubmitted, appear here until the instructor submits them.' : 'Change the school year, the semester or the search.'}
        />
      ) : !error && (
        <MissingSubmissionsTable rows={visible} onPause={pause} busyId={busyId} today={data?.today} />
      )}

      {dialog && (
        <>
          <div role="presentation" className={styles.backdrop} onClick={closeDialog} />
          <div role="dialog" aria-modal="true" aria-label="Syllabus due date" className={styles.window}>
            <div className="app-window-header">
              <div>
                <h2 className="app-window-title">Syllabus due date</h2>
                <div className={styles.sub}>When instructors must submit their learning plans.</div>
              </div>
              <button type="button" className="app-icon-close" aria-label="Close" onClick={closeDialog}><X size={16} strokeWidth={2.5} color="currentColor" /></button>
            </div>

            <div className={styles.body}>
              <div className={styles.chips}>
                <span className={styles.chip} title={dialog.name}>{programCode(dialog.name)}</span>
                <span className={styles.chip}>{schoolYear}</span>
                <span className={styles.chip}>{semester} semester</span>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="syllabus-due-date">Submit by</label>
                <DatePicker id="syllabus-due-date" value={dueText} onChange={setDueText} />
              </div>
              <div className={styles.hint}>Set it earlier than 2 weeks before classes start, so there is time to review and return plans.</div>

              <div className={styles.schedule} aria-live="polite">
                <div className={styles.scheduleTitle}>Automatic reminders</div>
                {dueText ? (
                  <ul>
                    {REMINDER_OFFSETS.map(([offset, label]) => (
                      <li key={label}><span>{label}</span><strong>{dayLabel(shiftDay(dueText, offset))}</strong></li>
                    ))}
                    <li><span>After that</span><strong>every 3rd day</strong></li>
                  </ul>
                ) : (
                  <div className={styles.scheduleEmpty}>Pick a date to see when the reminders go out.</div>
                )}
              </div>

              {dialogError && <div role="alert" className={styles.error}>{dialogError}</div>}
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={closeDialog} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={saveDeadline} disabled={saving || !dueText} className="btn btn-primary">{saving ? 'Saving…' : 'Save due date'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotSubmittedPanel
