import React from 'react'
import { X, Calendar, CircleCheck as CheckCircle, Plus, TriangleAlert as AlertTriangle } from 'lucide-react'
import MissingSubmissionsTable from './MissingSubmissionsTable.jsx'
import EmptyState from './EmptyState.jsx'
import DatePicker from './DatePicker.jsx'
import Select from './Select.jsx'
import { Loading, TableSkeleton } from './LoadingSkeleton.jsx'
import styles from '../styles/DueDateDialog.module.sass'
import dueStyles from '../styles/DueDates.module.sass'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { alertDialog } from '../utils/appDialog.jsx'
import { toast } from '../utils/toast.jsx'
import { dayLabel, programCode, sortMissing } from '../utils/missingSubmissions.js'

// The reminder schedule of a due date: which days before it (0 = on the day), then every N days once overdue.
// The defaults match the server's config/reminders.js; a Program Head can change both per program and term.
const DEFAULT_BEFORE = [7, 3, 1, 0]
const DEFAULT_EVERY = 3
const BEFORE_CHOICES = [14, 7, 5, 3, 2, 1, 0]
const EVERY_CHOICES = [[0, 'Never'], [1, 'Every day'], [2, 'Every 2nd day'], [3, 'Every 3rd day'], [5, 'Every 5th day'], [7, 'Every week']]
const beforeLabel = (d) => (d === 0 ? 'On the day' : `${d} day${d === 1 ? '' : 's'} before`)
const parseBefore = (raw) => (raw ? String(raw).split(',').map(Number).filter(Number.isInteger) : DEFAULT_BEFORE)
// Whole days from `from` to `to` (both YYYY-MM-DD); null when either is missing.
const daysFrom = (from, to) => {
  const a = Date.parse(`${String(from || '').slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${String(to || '').slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(a) || Number.isNaN(b) ? null : Math.round((b - a) / 86400000)
}
const shiftYear = (iso) => { const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number); return y && m && d ? `${y + 1}-${String(m).padStart(2, '0')}-${String(Math.min(d, m === 2 ? 28 : d)).padStart(2, '0')}` : '' }
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
// readOnly: the Dean sees the due dates and who has not submitted, for the programs of their departments; only the
// Program Head sets due dates or pauses reminders (server: deadline:manage).
const NotSubmittedPanel = ({ active, schoolYear, semester, query = '', onCount, readOnly = false }) => {
  const [data, setData] = React.useState(null)
  const [deadlines, setDeadlines] = React.useState({ programs: [], deadlines: [] })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [busyId, setBusyId] = React.useState(null)
  const [dialog, setDialog] = React.useState(null)
  const [dueText, setDueText] = React.useState('')
  // When instructors should start (optional); they are notified that day (server: utils/reminderJob.js).
  const [startText, setStartText] = React.useState('')
  const [beforeDays, setBeforeDays] = React.useState(DEFAULT_BEFORE)
  const [everyDays, setEveryDays] = React.useState(DEFAULT_EVERY)
  // "Add a date": any day before the due date, picked on the calendar, besides the quick chips
  const [pickingDate, setPickingDate] = React.useState(false)
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
      toast(row.remindersPaused ? `Reminders resumed for ${row.courseCode || 'the course'}.` : `Reminders paused for ${row.courseCode || 'the course'}.`)
    } catch (err) {
      alertDialog(apiErrorMessage(err, 'The reminders could not be changed.'), { title: 'Not changed' })
    } finally {
      setBusyId(null)
    }
  }

  // ---- the due date of a program for the chosen term ----
  const termDeadline = (program) => deadlines.deadlines.find(d => d.program_id === program.program_id && d.school_year === schoolYear && d.semester === semester)
  const openDialog = (program) => {
    const found = termDeadline(program)
    // No date yet: start from last year's date for the same semester (and its reminder days), moved one year on,
    // when that day has not passed. The Program Head checks it and saves; nothing is set without them.
    const lastYear = found ? null : (() => {
      const [start] = String(schoolYear).split('-').map(Number)
      const prev = deadlines.deadlines.find(d => d.program_id === program.program_id && d.semester === semester && d.school_year === `${start - 1}-${start}`)
      const moved = prev ? shiftYear(prev.syllabus_due) : ''
      return moved && moved >= (data?.today || '') ? { ...prev, syllabus_due: moved, start_date: prev.start_date ? shiftYear(prev.start_date) : null } : null
    })()
    const from = found || lastYear
    setDialog({ ...program, fromLastYear: Boolean(lastYear) }); setDueText(from?.syllabus_due || ''); setStartText(from?.start_date || ''); setDialogError('')
    setBeforeDays(parseBefore(from?.remind_before)); setEveryDays(from?.overdue_every ?? DEFAULT_EVERY); setPickingDate(false)
  }
  // A day picked on the calendar becomes "N days before" (0-60, like the chips); shown as its own removable chip.
  const addDate = (iso) => {
    const before = daysFrom(iso, dueText)
    setPickingDate(false)
    if (before === null || before < 0 || before > 60) { setDialogError('Pick a day on or before the due date, up to 60 days before it.'); return }
    setDialogError('')
    setBeforeDays(list => (list.includes(before) || list.length >= 6 ? list : [...list, before].sort((a, b) => b - a)))
  }
  // A reminder day on or off (at most 6, at least one).
  const toggleBefore = (day) => setBeforeDays(list => (list.includes(day)
    ? (list.length > 1 ? list.filter(d => d !== day) : list)
    : (list.length < 6 ? [...list, day].sort((a, b) => b - a) : list)))
  const closeDialog = () => { setDialog(null); setDialogError('') }

  const saveDeadline = async () => {
    setSaving(true); setDialogError('')
    try {
      await fetchJson('/api/term-deadlines', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: dialog.program_id, school_year: schoolYear, semester, syllabus_due: dueText, remind_before: beforeDays.join(','), overdue_every: everyDays, start_date: startText || null })
      })
      closeDialog()
      await load()
      toast('Due date saved.')
    } catch (err) {
      setDialogError(apiErrorMessage(err, 'The due date could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  // The Program Head reminds one instructor now (once a day per plan; the server refuses a second one).
  const remindNow = async (row) => {
    setBusyId(row.offeringId)
    try {
      await fetchJson(`/api/missing-submissions/${row.offeringId}/remind`, { method: 'POST' })
      await load()
      toast(`${row.instructorName ? 'The instructor of ' : ''}${row.courseCode} was reminded.`)
    } catch (err) {
      // 409: someone (or the system) reminded this plan today already; reload so the row shows "Reminded".
      if (err?.status === 409) load()
      alertDialog(apiErrorMessage(err, 'The reminder was not sent.'), { title: 'Not sent' })
    } finally {
      setBusyId(null)
    }
  }

  const removeDeadline = async (program) => {
    const found = termDeadline(program)
    if (!found) return
    setError('')
    try {
      await fetchJson(`/api/term-deadlines/${found.id}`, { method: 'DELETE' })
      await load()
      toast('Due date removed.')
    } catch (err) {
      alertDialog(apiErrorMessage(err, 'The due date could not be removed.'), { title: 'Not removed' })
    }
  }

  const empty = !loading && !error && visible.length === 0

  return (
    <div style={{ display: active ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, gap: 10 }}>
      {error && <div role="alert" style={{ color: 'var(--danger)' }}>{error} <button type="button" className="btn btn-secondary btn-sm" onClick={load} style={{ marginLeft: 8 }}>Try again</button></div>}

      {(() => {
        const unset = deadlines.programs.filter(program => !termDeadline(program))
        const warn = unset.length > 0
        return (
          <div className={`${dueStyles.bar} ${warn ? dueStyles.barWarn : dueStyles.barOk}`} role="group" aria-label={`Due dates for ${semester} semester, ${schoolYear}`}>
            <div className={dueStyles.message}>
              {warn ? <AlertTriangle size={16} aria-hidden="true" /> : <CheckCircle size={16} aria-hidden="true" />}
              <span>
                {deadlines.programs.length === 0
                  ? (readOnly ? 'No program is in your department yet.' : 'You do not head a program yet.')
                  : warn
                    ? `${unset.length} of ${deadlines.programs.length} program${deadlines.programs.length === 1 ? ' has' : 's have'} no due date. Instructors are not reminded until ${readOnly ? 'their Program Head sets one' : 'you set one'}.`
                    : 'Every program has a due date. Instructors are reminded automatically.'}
              </span>
              <span className={dueStyles.note} role="status">
                {(() => {
                  const today = visible.filter(row => row.daysLeft === 0).length
                  const soon = count('due-soon') - today
                  return [`${visible.length} not submitted`, count('overdue') ? `${count('overdue')} overdue` : '', today ? `${today} due today` : '', soon ? `${soon} due soon` : ''].filter(Boolean).join(' · ')
                })()}
              </span>
            </div>
            {deadlines.programs.length > 0 && (
              <div className={dueStyles.chips}>
                {deadlines.programs.map(program => {
                  const found = termDeadline(program)
                  const away = found ? daysFrom(data?.today, found.syllabus_due) : null
                  const when = away === null ? '' : away > 0 ? `in ${away} day${away === 1 ? '' : 's'}` : away === 0 ? 'today' : `${-away} day${away === -1 ? '' : 's'} ago`
                  return (
                    <button
                      key={program.program_id}
                      type="button"
                      className={`${dueStyles.chip} ${found ? dueStyles.chipSet : dueStyles.chipUnset} ${away !== null && away < 0 ? dueStyles.chipPast : ''}`}
                      onClick={readOnly ? undefined : () => openDialog(program)}
                      aria-disabled={readOnly || undefined}
                      style={readOnly ? { cursor: 'default' } : undefined}
                      title={found ? `${program.name}: due ${dayLabel(found.syllabus_due)}${when ? ` (${when})` : ''}.${readOnly ? '' : ' Click to change.'}` : `${program.name}: no due date.${readOnly ? ' Its Program Head sets it.' : ' Click to set one.'}`}
                    >
                      {found || readOnly ? <Calendar size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                      <strong>{programCode(program.name)}</strong>
                      <span>{found ? `${dayLabel(found.syllabus_due)}${when ? ` · ${when}` : ''}` : (readOnly ? 'No due date' : 'Set due date')}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {loading ? (
        <Loading label="Loading the list…"><TableSkeleton rows={5} cols={[330, 170, 90, 170, 170, '1fr']} /></Loading>
      ) : empty ? (
        <EmptyState
          icon={<CheckCircle size={22} strokeWidth={1.6} />}
          title={rows.length === 0 ? 'Every assigned plan has been submitted' : 'Nothing matches these filters'}
          hint={rows.length === 0 ? 'Plans that are not submitted, or were returned and not resubmitted, appear here until the instructor submits them.' : 'Change the school year, the semester or the search.'}
        />
      ) : !error && (
        <MissingSubmissionsTable rows={visible} onPause={readOnly ? null : pause} onRemind={readOnly ? null : remindNow} busyId={busyId} today={data?.today} />
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
              <button type="button" className="app-icon-close" aria-label="Close" onClick={closeDialog}><X size={16} strokeWidth={2} color="currentColor" /></button>
            </div>

            <div className={styles.body}>
              <div className={styles.chips}>
                <span className={styles.chip} title={dialog.name}>{programCode(dialog.name)}</span>
                <span className={styles.chip}>{schoolYear}</span>
                <span className={styles.chip}>{semester} semester</span>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="syllabus-due-date">Submit by</label>
                {/* A due date already past would send every reminder at once: past days cannot be picked. */}
                <DatePicker id="syllabus-due-date" value={dueText} onChange={setDueText} min={(() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` })()} />
              </div>
              <div className={styles.hint}>{dialog.fromLastYear ? 'Filled in from last year\'s due date for this semester. Check it, then save.' : 'Set it at least 2 weeks before classes start.'}</div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="syllabus-start-date">Start on (optional)</label>
                <DatePicker id="syllabus-start-date" value={startText} onChange={setStartText} placeholder="No start date"
                  min={(() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` })()} />
              </div>
              <div className={styles.hint}>
                {startText && dueText && startText > dueText
                  ? <span style={{ color: 'var(--danger)' }}>The start date must be on or before the due date.</span>
                  : 'On this day every instructor with a plan not yet submitted is told to start, and when it is due.'}
                {startText && <> <button type="button" style={{ background: 'none', border: 0, padding: 0, color: 'var(--ink-muted)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setStartText('')}>Clear</button></>}
              </div>

              <div className={styles.schedule} aria-live="polite">
                <div className={styles.scheduleTitle}>Automatic reminders</div>
                {/* Which days before the due date, then how often once it has passed. */}
                <div className={styles.scheduleChoices} role="group" aria-label="Remind on">
                  {BEFORE_CHOICES.map(day => (
                    <button key={day} type="button" aria-pressed={beforeDays.includes(day)}
                      className={`${styles.dayChip} ${beforeDays.includes(day) ? styles.dayChipOn : ''}`} onClick={() => toggleBefore(day)}>
                      {day === 0 ? 'On the day' : `${day}d before`}
                    </button>
                  ))}
                  {/* days picked on the calendar: their date, and an x to drop them */}
                  {beforeDays.filter(day => !BEFORE_CHOICES.includes(day)).map(day => (
                    <button key={`own-${day}`} type="button" className={`${styles.dayChip} ${styles.dayChipOn}`} onClick={() => toggleBefore(day)}
                      title={`${day} days before the due date. Click to remove.`} aria-label={`Remove the reminder ${day} days before`}>
                      {dueText ? dayLabel(shiftDay(dueText, -day)) : `${day}d before`} <X size={12} aria-hidden="true" />
                    </button>
                  ))}
                  {!pickingDate && (
                    <button type="button" className={`${styles.dayChip} ${styles.dayChipAdd}`} disabled={!dueText || beforeDays.length >= 6}
                      title={!dueText ? 'Pick the due date first' : beforeDays.length >= 6 ? 'Six reminder days at most' : 'Pick any day on the calendar'}
                      onClick={() => setPickingDate(true)}>
                      <Plus size={12} aria-hidden="true" /> Add a date
                    </button>
                  )}
                </div>
                {pickingDate && (
                  <div className={styles.scheduleEvery}>
                    <span>Remind on</span>
                    <DatePicker id="reminder-date" value="" onChange={addDate}
                      min={(() => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}` })()} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPickingDate(false)}>Cancel</button>
                  </div>
                )}
                <div className={styles.scheduleEvery}>
                  <span>After the due date</span>
                  <Select value={String(everyDays)} onChange={(e) => setEveryDays(Number(e.target.value))} aria-label="After the due date">
                    {EVERY_CHOICES.map(([value, label]) => <option key={value} value={String(value)}>{label}</option>)}
                  </Select>
                </div>
                {dueText ? (
                  <ul>
                    {startText && <li><span>Start</span><strong>{dayLabel(startText)}</strong></li>}
                    {beforeDays.map(day => (
                      <li key={day}><span>{beforeLabel(day)}</span><strong>{dayLabel(shiftDay(dueText, -day))}</strong></li>
                    ))}
                    <li><span>After that</span><strong>{everyDays === 0 ? 'no more reminders' : EVERY_CHOICES.find(([v]) => v === everyDays)?.[1].toLowerCase()}</strong></li>
                  </ul>
                ) : (
                  <div className={styles.scheduleEmpty}>Pick a date to see when the reminders go out.</div>
                )}
              </div>

              {dialogError && <div role="alert" className={styles.error}>{dialogError}</div>}
            </div>

            <div className={styles.actions}>
              {termDeadline(dialog) && (
                <button type="button" className="btn btn-danger-outline" style={{ marginRight: 'auto' }} onClick={async () => { await removeDeadline(dialog); closeDialog() }}>Remove due date</button>
              )}
              <button type="button" onClick={closeDialog} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={saveDeadline} disabled={saving || !dueText || Boolean(startText && startText > dueText)} className="btn btn-primary">{saving ? 'Saving…' : 'Save due date'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotSubmittedPanel
