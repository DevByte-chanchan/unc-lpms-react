import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'react-feather'
import useDialogFocus from '../utils/useDialogFocus.js'
import frame from '../styles/DueDateDialog.module.sass'
import styles from '../styles/PlanChanges.module.sass'

// What the instructor changed after the plan was returned (GET /api/plan-changes/:pcId, server/utils/planChanges.js).
// Items one of your own comments pointed at come first, marked "Your comment".
const STATUS = { added: 'Added', removed: 'Removed', changed: 'Changed' }

const PlanChangesDialog = ({ open, onClose, data, courseCode }) => {
  const windowRef = useRef(null)
  useDialogFocus(windowRef, open)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !data) return null
  const changes = [...data.changes].sort((a, b) => Number(b.yours) - Number(a.yours))
  const since = data.since ? new Date(data.since).toLocaleString() : ''
  return createPortal(
    <>
      <div role="presentation" className={frame.backdrop} onClick={onClose} />
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label="What changed since the return" className={`${frame.window} ${styles.wide}`}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">What changed since the return</h2>
            <div className={frame.sub}>{courseCode}: returned {since}; {changes.length} change{changes.length === 1 ? '' : 's'} in the resubmitted plan.</div>
          </div>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={onClose}><X size={16} strokeWidth={2.5} color="currentColor" /></button>
        </div>
        <div className={frame.body}>
          {changes.length === 0 ? <p>Nothing in the plan changed since it was returned.</p> : (
            <ul className={styles.list}>
              {changes.map(c => (
                <li key={c.key} className={styles.item}>
                  <div className={styles.head}>
                    <span className={`${styles.tag} ${styles[c.status]}`}>{STATUS[c.status]}</span>
                    {c.yours && <span className={`${styles.tag} ${styles.yours}`}>Your comment</span>}
                    <span>{c.kind} · {c.label}</span>
                  </div>
                  {c.before !== null && c.status !== 'added' && <div className={styles.before}>{c.before || '(empty)'}</div>}
                  {c.after !== null && <div className={styles.after}>{c.after || '(empty)'}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={frame.actions}>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </>,
    document.body
  )
}

export default PlanChangesDialog
