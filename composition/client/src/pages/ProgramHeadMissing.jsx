import React from 'react'
import Skeleton from '../layouts/SkeletonA.jsx'
import Header from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import MissingSubmissionsTable from '../components/MissingSubmissionsTable.jsx'
import { Download, Bell, X, Calendar, CheckCircle } from 'react-feather'
import EmptyState from '../components/EmptyState.jsx'
import { usePageSearch } from '../utils/pageSearch.js'
import syllabusStyles from '../styles/SyllabusSections.module.sass'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import {
  dayLabel, sortMissing, schoolYearOptions, currentSchoolYear, remindSummary, toCsv, SEMESTERS
} from '../utils/missingSubmissions.js'

// The Program Head's list of learning plans that are still waiting on their instructor: who, since
// when, against which due date, and when they were last reminded. The system reminds them by itself
// (7, 3 and 1 days before the due date, on the day, then every third day overdue) once a due date is
// set for the program and term; this page sets that date, reminds people now, pauses a plan, and
// exports the list.
const chip = { padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: '#F3F4F6', color: '#111827' }

const ProgramHeadMissing = () => {
  const [data, setData] = React.useState(null)
  const [deadlines, setDeadlines] = React.useState({ programs: [], deadlines: [] })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [schoolYear, setSchoolYear] = React.useState('')
  const [semester, setSemester] = React.useState('')
  const query = usePageSearch('Search course or instructor')
  const [selected, setSelected] = React.useState(() => new Set())
  const [busyId, setBusyId] = React.useState(null)
  const [reminding, setReminding] = React.useState(false)
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
      setSchoolYear(previous => previous || currentSchoolYear(missing.today))
    } catch (err) {
      setError(apiErrorMessage(err, 'The list could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const rows = data?.missing || []
  const years = schoolYearOptions(rows, deadlines.deadlines, data?.today)
  const needle = query.trim().toLowerCase()
  const visible = sortMissing(rows.filter(row => (!schoolYear || row.schoolYear === schoolYear)
    && (!semester || row.semester === semester)
    && (!needle || [row.courseCode, row.courseTitle, row.instructorName, row.programName].some(v => String(v || '').toLowerCase().includes(needle)))))
  const count = (status) => visible.filter(row => row.status === status).length

  const toggle = (id) => setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const toggleAll = (on) => setSelected(on ? new Set(visible.map(row => row.offeringId)) : new Set())
  const ticked = visible.filter(row => selected.has(row.offeringId))

  const remindSelected = async () => {
    setReminding(true); setError(''); setNotice('')
    try {
      const response = await fetchJson('/api/missing-submissions/remind', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offeringIds: ticked.map(row => row.offeringId) })
      })
      setNotice(remindSummary(response))
      setSelected(new Set())
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'The reminders could not be sent.'))
    } finally {
      setReminding(false)
    }
  }

  const pause = async (row) => {
    setBusyId(row.offeringId); setError(''); setNotice('')
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

  const exportCsv = () => {
    const blob = new Blob(['﻿', toCsv(visible)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `not-yet-submitted-${schoolYear || 'all'}${semester ? `-${semester}` : ''}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
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

  const pageContent = (
    <div className={pageStyles.managementPage}>
      <div className={pageStyles.pageHeader}>
        <h2 className="app-page-title">Not yet submitted</h2>
        <div className={pageStyles.pageHeaderActions} style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={pageStyles.uploadButton} onClick={remindSelected} disabled={ticked.length === 0 || reminding}>
            <Bell size={18} color="#FFFFFF" /> {reminding ? 'Sending…' : `Remind selected (${ticked.length})`}
          </button>
          <button type="button" className={pageStyles.uploadButton} onClick={exportCsv} disabled={visible.length === 0}>
            <Download size={18} color="#FFFFFF" /> Export CSV
          </button>
        </div>
      </div>

      {error && <div role="alert" style={{ margin: '0 0 12px', color: '#b91c1c' }}>{error} <button type="button" onClick={load} style={{ marginLeft: 8 }}>Try again</button></div>}
      {notice && <div role="status" style={{ margin: '0 0 12px', color: '#166534' }}>{notice}</div>}

      <div className={`${syllabusStyles.header} ${pageStyles.dataToolbar}`}>
        <div className={pageStyles.toolbarControls} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select aria-label="School year" className="app-select" value={schoolYear} onChange={(e) => { setSchoolYear(e.target.value); setSelected(new Set()) }}>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <select aria-label="Semester" className="app-select" value={semester} onChange={(e) => { setSemester(e.target.value); setSelected(new Set()) }}>
            <option value="">All semesters</option>
            {SEMESTERS.map(name => <option key={name} value={name}>{name} semester</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '4px 0 12px' }} aria-label="Summary">
        <span style={chip}>{visible.length} not submitted</span>
        <span style={{ ...chip, background: '#FEE2E2', color: '#991B1B' }}>{count('overdue')} overdue</span>
        <span style={{ ...chip, background: '#FEF3C7', color: '#92400E' }}>{count('due-soon')} due within 3 days</span>
        <span style={chip}>{count('no-deadline')} with no due date</span>
      </div>

      <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px', margin: '0 0 12px', background: '#F9FAFB' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}><Calendar size={14} style={{ marginRight: 6 }} />Syllabus due date</div>
        {!semester ? (
          <div style={{ color: '#6B7280' }}>Choose a semester to see or set its due date. The system sends automatic reminders only for programs that have one.</div>
        ) : deadlines.programs.length === 0 ? (
          <div style={{ color: '#6B7280' }}>You do not head a program yet.</div>
        ) : deadlines.programs.map(program => {
          const found = termDeadline(program)
          return (
            <div key={program.program_id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '4px 0', flexWrap: 'wrap' }}>
              <span style={{ minWidth: 220 }}>{program.name}</span>
              {found ? <strong>{dayLabel(found.syllabus_due)}</strong> : <span style={{ color: '#92400E' }}>No due date, so no automatic reminders</span>}
              <button type="button" className="app-link-button" onClick={() => openDialog(program)}>{found ? 'Change' : 'Set due date'}</button>
              {found && <button type="button" className="app-link-button" onClick={() => removeDeadline(program)}>Remove</button>}
            </div>
          )
        })}
      </div>

      {loading ? (
        <p>Loading the list…</p>
      ) : empty ? (
        <EmptyState
          icon={<CheckCircle size={22} strokeWidth={1.6} />}
          title={rows.length === 0 ? 'Every assigned plan has been submitted' : 'Nothing matches these filters'}
          hint={rows.length === 0 ? 'Plans that are not submitted, or were returned and not resubmitted, appear here until the instructor submits them.' : 'Change the school year, the semester or the search.'}
        />
      ) : !error && (
        <MissingSubmissionsTable rows={visible} selected={selected} onToggle={toggle} onToggleAll={toggleAll} onPause={pause} busyId={busyId} showProgram={deadlines.programs.length > 1} />
      )}

      {dialog && (
        <div>
          <div role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={closeDialog} />
          <div role="dialog" aria-modal="true" aria-label="Syllabus due date" className={`${pageStyles.managementDialog} ${pageStyles.dialogNarrow} ${pageStyles.dialogElevated}`}>
            <div className={pageStyles.dialogHeader}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Syllabus due date</h2>
              <button type="button" className="app-icon-close" aria-label="Close" onClick={closeDialog}><X size={16} /></button>
            </div>
            <div className={pageStyles.dialogContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>{dialog.name} · {schoolYear} · {semester} semester</div>
              <label>Instructors must submit by<br />
                <input id="syllabus-due-date" type="date" value={dueText} onChange={(e) => setDueText(e.target.value)} style={{ width: '100%', height: 36 }} />
              </label>
              <div style={{ color: '#6B7280', fontSize: 13 }}>The faculty manual asks for the plan to be approved 2 weeks before classes start. Set this date earlier than that, so there is time to review and return it. Instructors who have not submitted are reminded 7, 3 and 1 days before this date, on the day, and every third day after it. A plan can still be submitted late; the page records when it was assigned.</div>
              {dialogError && <div role="alert" style={{ color: '#b91c1c' }}>{dialogError}</div>}
            </div>
            <div className={pageStyles.managementDialogActions}>
              <button type="button" onClick={closeDialog} style={{ flex: 1, height: 40, background: '#FFFFFF', color: '#111827', border: '1px solid #111827', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={saveDeadline} disabled={saving || !dueText} style={{ flex: 1, height: 40, background: '#2C3744', color: '#FFFFFF', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Skeleton
      header={<Header role="Program Head" />}
      nav={<SideNavigation mode="program-head" />}
      content={pageContent}
    />
  )
}

export default ProgramHeadMissing
