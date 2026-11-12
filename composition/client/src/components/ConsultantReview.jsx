import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Edit2, Trash2, PenTool } from 'react-feather'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import useDialogFocus from '../utils/useDialogFocus.js'
import styles from '../styles/DueDateDialog.module.sass'

// The Industry Consultant's "Suggest & Sign" window on an approved learning plan: their suggestions on this plan
// (saved as comments, kept out of the comment panel), which they can add, edit and remove, and the sign-off that puts
// their name and e-signature in the "Reviewed by" box of the exported learning plan. Signing never changes the
// approval. Server: /api/comments/suggestions/:pcId and /api/course-consultants/signoffs/:pcId.
const when = (iso) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

const ConsultantReview = ({ pcId, signedAt, onSigned, onClose }) => {
  const [items, setItems] = useState(null)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(null) // { id, text }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const windowRef = useRef(null)
  useDialogFocus(windowRef, true)

  const load = useCallback(async () => {
    try {
      const res = await fetchJson(`/api/comments/suggestions/${pcId}`)
      setItems((res?.suggestions || []).filter(s => s.thisPlan))
    } catch (err) {
      setItems([]); setError(apiErrorMessage(err, 'Your suggestions could not be loaded.'))
    }
  }, [pcId])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const run = async (action) => {
    setBusy(true); setError('')
    try { await action(); await load(); return true } catch (err) { setError(apiErrorMessage(err, 'That did not work. Try again.')); return false } finally { setBusy(false) }
  }
  const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const add = () => run(async () => { await fetchJson(`/api/comments/suggestions/${pcId}`, json('POST', { message: draft })); setDraft('') })
  const save = () => run(async () => { await fetchJson(`/api/comments/suggestions/item/${editing.id}`, json('PUT', { message: editing.text })); setEditing(null) })
  const remove = (id) => window.confirm('Remove this suggestion?') && run(() => fetchJson(`/api/comments/suggestions/item/${id}`, { method: 'DELETE' }))
  // Sign: a suggestion still typed in the box is saved first, so nothing written is lost.
  const sign = async () => {
    if (!window.confirm('Sign this learning plan as reviewed? Your name and signature go in the "Reviewed by" box of the exported plan; the approval does not change.')) return
    const ok = await run(async () => {
      if (draft.trim()) { await fetchJson(`/api/comments/suggestions/${pcId}`, json('POST', { message: draft })); setDraft('') }
      const row = await fetchJson(`/api/course-consultants/signoffs/${pcId}`, { method: 'POST' })
      onSigned?.(row)
    })
    if (ok) onClose()
  }

  return createPortal(
    <>
      <div role="presentation" className={styles.backdrop} onClick={() => !busy && onClose()} />
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label="Suggest and sign" className={styles.window} style={{ width: 'min(560px, calc(100vw - 32px))' }}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">Suggest &amp; Sign</h2>
            <div className={styles.sub}>{signedAt ? `Signed as reviewed on ${when(signedAt)}. You can still edit your suggestions.` : 'Suggestions for the next revision, then sign the plan as reviewed.'}</div>
          </div>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={onClose} disabled={busy}><X size={16} strokeWidth={2.5} color="currentColor" /></button>
        </div>
        <div className={styles.body} style={{ maxHeight: '60vh', overflowY: 'auto', display: 'grid', gap: 10 }}>
          {items === null && <div className={styles.hint}>Loading…</div>}
          {items?.length === 0 && <div className={styles.hint}>No suggestions yet.</div>}
          {(items || []).map(s => (
            <div key={s.id} style={{ border: '1px solid var(--line, #e2e8f0)', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--ink-soft)' }}>
                <span>{when(s.at)}</span>
                {editing?.id !== s.id && (
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setEditing({ id: s.id, text: s.message })}><Edit2 size={13} /> Edit</button>
                    <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={() => remove(s.id)} aria-label="Remove suggestion"><Trash2 size={13} /></button>
                  </span>
                )}
              </div>
              {editing?.id === s.id ? (
                <>
                  <textarea value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} rows={4} maxLength={2000} aria-label="Edit suggestion"
                    style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: 13, padding: 8, borderRadius: 6, border: '1px solid #D1D5DB' }} />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy || !editing.text.trim()} onClick={save}>Save</button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, borderLeft: '3px solid #f59e0b', paddingLeft: 10, whiteSpace: 'pre-wrap' }}>{s.message}</div>
              )}
            </div>
          ))}
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
            New suggestion
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={2000} placeholder="What should the next revision add or change, from industry practice?"
              style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontWeight: 400, fontSize: 13, padding: 8, borderRadius: 6, border: '1px solid #D1D5DB' }} />
          </label>
          {error && <div role="alert" className={styles.error}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" disabled={busy || !draft.trim()} onClick={add}>Add suggestion</button>
            {!signedAt && <button type="button" className="btn btn-primary" disabled={busy} onClick={sign}><PenTool size={15} /> Sign as reviewed</button>}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export default ConsultantReview
