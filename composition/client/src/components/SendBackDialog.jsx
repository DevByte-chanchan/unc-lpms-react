import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'react-feather'
import SpellCheckArea from './SpellCheckArea.jsx'
import useDialogFocus from '../utils/useDialogFocus.js'
import styles from '../styles/DueDateDialog.module.sass'

// The Program Head disagrees with a Dean return and sends the plan back to the Dean instead of forwarding it to the
// instructor. The reason is required: the Dean reads it before deciding again. onSend(note) resolves to true, or to
// the reason it failed, which is shown here.
const SendBackDialog = ({ open, onClose, onSend, courseCode }) => {
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const windowRef = useRef(null)
  useDialogFocus(windowRef, open)

  useEffect(() => {
    if (!open) return undefined
    setNote(''); setError('')
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const send = async () => {
    if (note.trim().length < 5) { setError('Say why the plan goes back to the Dean.'); return }
    setBusy(true); setError('')
    const result = await onSend(note.trim())
    setBusy(false)
    if (result === true) onClose()
    else setError(typeof result === 'string' ? result : 'The plan was not sent back. Try again.')
  }

  if (!open) return null
  return createPortal(
    <>
      <div role="presentation" className={styles.backdrop} onClick={onClose} />
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label="Send back to the Dean" className={styles.window}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">Send back to the Dean</h2>
            <div className={styles.sub}>{courseCode}: the plan goes back to the Dean instead of the instructor.</div>
          </div>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={onClose}><X size={16} strokeWidth={2.5} color="currentColor" /></button>
        </div>
        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="send-back-note">Why it goes back (the Dean reads this)</label>
            <SpellCheckArea id="send-back-note" value={note} onChange={(next) => { setNote(next); if (error) setError('') }} rows={4} showButton={false}
              placeholder="For example: CO2's ILOs already cover this; the assessment matches the outcome." />
          </div>
          {error && <div role="alert" className={styles.error}>{error}</div>}
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send back to the Dean'}</button>
        </div>
      </div>
    </>,
    document.body
  )
}

export default SendBackDialog
