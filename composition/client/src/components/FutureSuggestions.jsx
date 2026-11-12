import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'react-feather'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import useDialogFocus from '../utils/useDialogFocus.js'
import styles from '../styles/DueDateDialog.module.sass'

// "Future Suggestions": the Industry Consultant's suggestions on this plan and the versions it came from
// (GET /api/comments/suggestions/:pcId). The consultant suggests on approved plans; the instructor applies the
// suggestions in the next term or revision.
const ABOUT = { topics: 'Topics', tlas: 'Activities', references: 'References' }

const planLabel = (s) => [s.schoolYear, s.semester && `${s.semester} sem`, s.revision ? `Rev ${s.revision}` : null].filter(Boolean).join(' · ')

const FutureSuggestions = ({ pcId, onClose }) => {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [signoffs, setSignoffs] = useState([])
  const windowRef = useRef(null)
  useDialogFocus(windowRef, true)

  useEffect(() => {
    let live = true
    fetchJson(`/api/comments/suggestions/${pcId}`)
      .then(res => { if (live) setItems(res?.suggestions || []) })
      .catch(err => { if (live) { setItems([]); setError(apiErrorMessage(err, 'The suggestions could not be loaded.')) } })
    // Who signed this plan as reviewed (courseConsultantController.signOff).
    fetchJson(`/api/course-consultants/signoffs/${pcId}`).then(rows => { if (live) setSignoffs(Array.isArray(rows) ? rows : []) }).catch(() => {})
    return () => { live = false }
  }, [pcId])

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <>
      <div role="presentation" className={styles.backdrop} onClick={onClose} />
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label="Future Suggestions" className={styles.window}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">Future Suggestions</h2>
            <div className={styles.sub}>From the industry consultant, for the next term or revision.</div>
          </div>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={onClose}><X size={16} strokeWidth={2.5} color="currentColor" /></button>
        </div>
        <div className={styles.body} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {signoffs.length > 0 && (
            <div className={styles.hint}>
              Reviewed and signed by {signoffs.map(s => `${s.name} (${new Date(s.signedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })})`).join(', ')}.
            </div>
          )}
          {items === null && <div className={styles.hint}>Loading…</div>}
          {items?.length === 0 && !error && <div className={styles.hint}>No suggestions yet.</div>}
          {error && <div role="alert" className={styles.error}>{error}</div>}
          {(items || []).map(s => (
            <div key={s.id} style={{ border: '1px solid var(--line, #e2e8f0)', borderRadius: 8, padding: 12, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--ink-soft)' }}>
                <span><strong style={{ color: 'var(--ink)' }}>{s.name}</strong>{s.thisPlan ? '' : ` · ${planLabel(s)}`}</span>
                <span>{new Date(s.at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              {(s.target || s.about) && (
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  <strong>{ABOUT[s.about] || 'About'}:</strong> {s.target || 'the whole section'}
                </div>
              )}
              <div style={{ fontSize: 13, borderLeft: '3px solid #f59e0b', paddingLeft: 10, whiteSpace: 'pre-wrap' }}>{s.message}</div>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  )
}

export default FutureSuggestions
