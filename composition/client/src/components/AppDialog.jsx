import { useEffect, useRef } from 'react'
import { X } from 'react-feather'
import useDialogFocus from '../utils/useDialogFocus.js'
import styles from '../styles/DueDateDialog.module.sass'

// The app's own replacement for the browser's alert() and confirm(): the standard window (header with close, a
// message, the app's buttons) instead of the browser's grey box. Opened by utils/appDialog.jsx.
const AppDialog = ({ title, message, confirmLabel, cancelLabel, danger, onDone }) => {
  const windowRef = useRef(null)
  useDialogFocus(windowRef, true)
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onDone(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDone])
  return (
    <>
      <div role="presentation" className={styles.backdrop} onClick={() => onDone(false)} />
      <div ref={windowRef} role="alertdialog" aria-modal="true" aria-label={title} className={styles.window}>
        <div className="app-window-header">
          <h2 className="app-window-title">{title}</h2>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={() => onDone(false)}><X size={16} strokeWidth={2.5} color="currentColor" /></button>
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
