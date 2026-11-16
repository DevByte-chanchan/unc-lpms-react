import { useEffect, useRef } from 'react'
import { CircleAlert as AlertCircle, TriangleAlert as AlertTriangle, X } from 'lucide-react'
import useDialogFocus from '../utils/useDialogFocus.js'
import styles from '../styles/DueDateDialog.module.sass'

// The app's own replacement for the browser's alert() and confirm(): the standard window (header with close, a
// message, the app's buttons) instead of the browser's grey box. Opened by utils/appDialog.jsx. `tone` puts the same
// icon colours as the toasts (utils/toast.jsx) beside the title: 'error' for a failure, 'warning' for a step that cannot
// be undone. It sits above every other window (they go up to 3300), so a failure inside one is never hidden behind it.
const TONES = { error: { Icon: AlertCircle, color: 'var(--danger-solid)' }, warning: { Icon: AlertTriangle, color: 'var(--warn-solid)' } }
const AppDialog = ({ title, message, confirmLabel, cancelLabel, danger, tone, onDone }) => {
  const mark = TONES[tone]
  const windowRef = useRef(null)
  useDialogFocus(windowRef, true)
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onDone(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDone])
  return (
    <>
      <div role="presentation" className={styles.backdrop} style={{ zIndex: 3500 }} onClick={() => onDone(false)} />
      <div ref={windowRef} role="alertdialog" aria-modal="true" aria-label={title} className={styles.window} style={{ zIndex: 3501 }}>
        <div className="app-window-header">
          <h2 className="app-window-title" style={mark ? { display: 'flex', alignItems: 'center', gap: 8 } : undefined}>
            {mark && <mark.Icon size={20} color={mark.color} aria-hidden="true" />}{title}
          </h2>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={() => onDone(false)}><X size={16} strokeWidth={2} color="currentColor" /></button>
        </div>
        <div className={styles.body}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{message}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {cancelLabel && <button type="button" className="btn btn-secondary" onClick={() => onDone(false)}>{cancelLabel}</button>}
            <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => onDone(true)}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AppDialog
