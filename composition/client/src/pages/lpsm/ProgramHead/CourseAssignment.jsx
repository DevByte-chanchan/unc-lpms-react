import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload } from 'react-feather'
import SkeletonA from '../../../layouts/SkeletonA.jsx'
import HeaderA from '../../../components/HeaderA.jsx'
import SideNavigation from '../../../components/SideNavigation.jsx'
import Select from '../../../components/Select.jsx'
import TableScrollRegion from '../../../components/TableScrollRegion.jsx'
import { Loading, TableSkeleton } from '../../../components/LoadingSkeleton.jsx'
import { fetchJson, apiErrorMessage } from '../../../utils/api.js'
import { getSession } from '../../../utils/session.js'
import table from '../../../styles/CoursesTable.module.sass'
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass'

// Course Assignment (Program Head). Before enrollment the Program Head pre-assigns each course to an instructor, so
// the learning plan, COAEP and syllabus can be written early. At the end of enrollment the registrar's Subject
// Offerings list (the Dean's .xls) is the official one: import it here, compare, and update the pre-assignment
// wherever it differs ("ima-match mo lang ... i-update mo si nasa initial assignment mo", interview Part 1).

const SEMESTERS = ['1st', '2nd', 'Summer']
const STATUS = {
  match: { label: 'Matches official', color: 'var(--good)' },
  different: { label: 'Different from official', color: 'var(--danger)' },
  'official-only': { label: 'Not pre-assigned', color: 'var(--warn)' },
  'pre-only': { label: 'Not in the official list', color: 'var(--warn)' },
  'no-faculty': { label: 'No faculty named yet', color: 'var(--ink-muted)' },
  assigned: { label: 'Assigned', color: 'var(--ink-soft)' },
  unassigned: { label: 'Not assigned', color: 'var(--ink-muted)' },
}

// The school year starts in June, so from January to May the current one began last calendar year.
const today = new Date()
const currentYear = today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1
const YEARS = [currentYear + 1, currentYear, currentYear - 1].map(y => `${y}-${y + 1}`)

// "CASIMERO DANNY BOY: OBa, OBb, OBc", one line per faculty (sections without one grouped under '').
const officialByFaculty = (sections) => {
  const groups = new Map()
  for (const s of sections) {
    for (const f of (s.faculty.length ? s.faculty : [{ name: '', user: null }])) {
      if (!groups.has(f.name)) groups.set(f.name, { name: f.name, known: Boolean(f.user), sections: [] })
      groups.get(f.name).sections.push(s.section || '—')
    }
  }
  return [...groups.values()]
}

const CourseAssignment = () => {
  const session = getSession()
  const [schoolYear, setSchoolYear] = useState(`${currentYear}-${currentYear + 1}`)
  const [semester, setSemester] = useState('1st')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const fileRef = useRef(null)
  const term = `school_year=${schoolYear}&semester=${encodeURIComponent(semester)}`

  const load = useCallback(async () => {
    setData(null)
    try {
      setData(await fetchJson(`/api/course-assignments?${term}`))
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the course assignments.'))
      setData({ rows: [], instructors: [], official: null })
    }
  }, [term])
  useEffect(() => { load() }, [load])

  const run = async (key, action, success) => {
    setBusy(key); setError(''); setNotice('')
    try {
      const result = await action()
      setNotice(typeof success === 'function' ? success(result) : success)
      await load()
    } catch (err) {
      setError(apiErrorMessage(err, 'The change was not saved.'))
    } finally {
      setBusy('')
    }
  }

  // Assign a course that has no assignment this term, or change the instructor of one that has.
  const setInstructor = (row, userId, name) => run(`row-${row.course_id}-${row.program_id}`, () => (row.pre
    ? fetchJson(`/api/course-assignments/${row.pre.pc_offering_id}/instructor`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instructor_user_id: Number(userId) }),
    })
    : fetchJson('/api/offerings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: row.course_id, program_id: row.program_id, instructor_user_id: Number(userId), school_year: schoolYear, semester }),
    })), `${row.course_no} is now assigned to ${name}.`)

  const importFile = (file) => {
    if (!file) return
    run('import', () => fetchJson(`/api/course-assignments/official?${term}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file,
    }), (r) => `Official list imported: ${r.sections} sections of ${r.courses} of your courses.`)
    if (fileRef.current) fileRef.current.value = ''
  }

  const instructorName = (id) => data?.instructors.find(u => String(u.user_id) === String(id))?.name || ''

  const content = (
    <div className={`${table['courses-table']}`}>
      <div className={table.header}>
        <h2>COURSE ASSIGNMENT</h2>
        <div className={table.filterA}>
          <Select variant="inline" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} aria-label="School year">
            {YEARS.map(y => <option key={y} value={y}>{y.replace('-', ' - ')}</option>)}
          </Select>
          <Select variant="inline" value={semester} onChange={(e) => setSemester(e.target.value)} aria-label="Semester">
            {SEMESTERS.map(s => <option key={s} value={s}>{s === 'Summer' ? 'Summer' : `${s} Sem`}</option>)}
          </Select>
        </div>
        <div className={table.fill}></div>
        <input ref={fileRef} type="file" aria-label="Subject Offerings file" accept=".xls,.xlsx" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        <button type="button" className="btn btn-primary" disabled={busy === 'import'} onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> {busy === 'import' ? 'Importing…' : 'Import official list'}
        </button>
      </div>

      <p style={{ margin: '0 0 12px', color: 'var(--ink-muted)', fontSize: 13 }}>
        {data?.official
          ? `Official list (registrar's Subject Offerings): ${data.official.sections} sections, imported ${new Date(data.official.importedAt).toLocaleString()}.`
          : 'No official list for this term yet. Pre-assign the courses now; import the Subject Offerings (.xls) at the end of enrollment to compare.'}
      </p>
      {error && <div role="alert" style={{ margin: '0 0 12px', color: 'var(--danger)' }}>{error}</div>}
      {notice && <div role="status" style={{ margin: '0 0 12px', color: 'var(--good)' }}>{notice}</div>}

      <TableScrollRegion label="Course assignments" minWidth={900} className={`${table['table-container']} app-table`}>
        {!data ? <Loading label="Loading course assignments…"><TableSkeleton rows={6} cols={[120, '1fr', 220, 260, 160]} /></Loading> : (
          <table>
            <thead>
              <tr>
                <th width={110}>Code</th>
                <th className={table.growCol}>Course</th>
                <th width={240}>Pre-assigned</th>
                <th width={260}>Official</th>
                <th width={190}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>You do not head a program with courses yet.</td></tr>
              )}
              {data.rows.map(row => {
                const key = `row-${row.course_id}-${row.program_id}`
                const status = STATUS[row.status] || STATUS.unassigned
                const preId = row.pre?.instructor_user_id
                const canUseOfficial = row.suggested && String(row.suggested.user_id) !== String(preId)
                return (
                  <tr key={key}>
                    <td width={110}>{row.course_no}</td>
                    <td className={table.growCol}>{row.course_title}</td>
                    <td width={240}>
                      <Select block value={preId ? String(preId) : ''} placeholder="Choose instructor…" disabled={busy === key}
                        aria-label={`Instructor of ${row.course_no}`}
                        onChange={(e) => e.target.value && e.target.value !== String(preId) && setInstructor(row, e.target.value, instructorName(e.target.value))}>
                        {data.instructors.map(u => <option key={u.user_id} value={String(u.user_id)}>{u.name}</option>)}
                      </Select>
                    </td>
                    <td width={260}>
                      {row.official.length === 0 ? <span style={{ color: 'var(--ink-faint)' }}>—</span> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 13 }}>
                          {officialByFaculty(row.official).map(g => (
                            <div key={g.name}>
                              <span style={{ color: g.name ? 'var(--ink)' : 'var(--ink-faint)' }}>{g.name || 'No faculty yet'}</span>
                              {g.name && !g.known && <span style={{ color: 'var(--warn)' }}> (no account)</span>}
                              <span style={{ color: 'var(--ink-muted)' }}>: {g.sections.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td width={190}>
                      <div style={{ color: status.color, fontWeight: 500 }}>{status.label}</div>
                      {canUseOfficial && (
                        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 6 }} disabled={busy === key}
                          onClick={() => setInstructor(row, row.suggested.user_id, row.suggested.name)}>
                          Use {row.suggested.name}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </TableScrollRegion>
    </div>
  )

  return (
    <SkeletonA
      header={<HeaderA role={session?.roleLabel || 'Program Head'} name={session?.name || ''} />}
      nav={<SideNavigation mode="program-head" />}
      content={<div className={pageStyles.page}>{content}</div>}
    />
  )
}

export default CourseAssignment
