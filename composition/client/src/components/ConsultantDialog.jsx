import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'react-feather'
import Select from './Select.jsx'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import styles from '../styles/DueDateDialog.module.sass'
import useDialogFocus from '../utils/useDialogFocus.js'

// The Program Head's window for this course's industry consultant: who is assigned, assign another, remove one.
// The server allows it only for the head of a program that offers the course.
const ConsultantDialog = ({ open, onClose, courseCode }) => {
  const [course, setCourse] = useState(null)
  const [consultants, setConsultants] = useState([])
  const [assigned, setAssigned] = useState([])
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const candidates = await fetchJson('/api/course-consultants/candidates')
      const found = (candidates.courses || []).find(c => c.course_no === courseCode) || null
      setCourse(found)
      setConsultants(candidates.consultants || [])
      setAssigned(found ? (await fetchJson(`/api/course-consultants?courseId=${found.course_id}`)).filter(row => row.is_active) : [])
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the consultants.'))
    }
  }, [courseCode])

  const windowRef = useRef(null)
  useDialogFocus(windowRef, open)

  useEffect(() => { if (open) { setPick(''); load() } }, [open, load])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const act = async (request) => {
    setBusy(true); setError('')
    try { await request(); setPick(''); await load() } catch (err) { setError(apiErrorMessage(err, 'That did not work. Try again.')) } finally { setBusy(false) }
  }
  const assign = () => act(() => fetchJson('/api/course-consultants', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_id: course.course_id, consultant_user_id: Number(pick) })
  }))
  const remove = (row) => act(() => fetchJson(`/api/course-consultants/${row.course_consultant_id}/deactivate`, { method: 'PUT' }))

  if (!open) return null
  const assignedIds = new Set(assigned.map(row => row.consultant_user_id))
  const available = consultants.filter(c => !assignedIds.has(c.user_id))

  return createPortal(
    <>
      <div role="presentation" className={styles.backdrop} onClick={onClose} />
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label="Industry consultant" className={styles.window}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">Industry Consultant</h2>
            <div className={styles.sub}>Who reviews {courseCode} as the industry consultant.</div>
          </div>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={onClose}><X size={16} strokeWidth={2.5} color="currentColor" /></button>
        </div>

        <div className={styles.body}>
          {!course && !error && <div className={styles.hint}>Only this course's Program Head can assign its consultant.</div>}
          {course && (
            <>
              <div className={styles.field}>
                <div className={styles.label}>Assigned</div>
                {assigned.length === 0 ? <div className={styles.hint}>No consultant yet.</div> : assigned.map(row => (
                  <div key={row.course_consultant_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span>{row.consultant_name || 'Consultant'}</span>
                    <button type="button" className="btn btn-sm btn-danger-outline" disabled={busy} onClick={() => remove(row)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="consultant-pick">Add a consultant</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Select id="consultant-pick" block value={pick} onChange={(event) => setPick(event.target.value)} disabled={busy || available.length === 0}>
                      <option value="">{available.length === 0 ? 'No other consultant accounts' : 'Select a consultant'}</option>
                      {available.map(c => <option key={c.user_id} value={c.user_id}>{c.name}</option>)}
                    </Select>
                  </div>
                  <button type="button" className="btn btn-primary" disabled={busy || !pick} onClick={assign}>Assign</button>
                </div>
              </div>
            </>
          )}
          {error && <div role="alert" className={styles.error}>{error}</div>}
        </div>
      </div>
    </>,
    document.body
  )
}

export default ConsultantDialog
