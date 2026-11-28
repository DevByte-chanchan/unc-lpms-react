import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import useDialogFocus from '../utils/useDialogFocus.js'
import Select from './Select.jsx'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { refreshCatalogSettings, settingsFromApi, setCatalogSettings } from '../utils/referenceCatalog.js'
import styles from '../styles/DueDateDialog.module.sass'

// The Director of Libraries sets the Reference Library rules once, for everyone (PUT /api/catalog-settings):
// how many years back a title counts as recent, whether older ones are kept out, and whether only titles the
// library holds may be attached. onSaved(settings) after a save.
const CatalogRulesDialog = ({ open, onClose, onSaved }) => {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const windowRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useDialogFocus(windowRef, open)

  useEffect(() => {
    if (!open) return undefined
    setError(''); setForm(null)
    let live = true
    refreshCatalogSettings(fetchJson).then(latest => { if (live) setForm(latest) })
    // the latest onClose, without re-reading the rules (and losing the edits) when the page re-renders
    const onKey = (event) => { if (event.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    return () => { live = false; document.removeEventListener('keydown', onKey) }
  }, [open])

  const save = async () => {
    setSaving(true); setError('')
    try {
      const saved = setCatalogSettings(settingsFromApi(await fetchJson('/api/catalog-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recencyYears: Number(form.recencyYears), enforceRecency: form.enforceRecency, requireLibraryAvailability: form.requireLibraryAvailability }),
      })))
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'The rules were not saved.'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  return createPortal(
    <>
      <div role="presentation" className={styles.backdrop} onClick={onClose} />
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label="Reference rules" className={styles.window}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">Reference rules</h2>
            <div className={styles.sub}>Apply to everyone, and to the flags reviewers see.</div>
          </div>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={onClose}><X size={16} strokeWidth={2} color="currentColor" /></button>
        </div>
        <div className={styles.body}>
          {!form ? <p>Loading…</p> : (
            <>
              <div className={styles.field}>
                <div className={styles.label} id="rules-years-label">Books older than this are outdated</div>
                {/* A list of 1 to 30, not a number box: 0, 99, "e" or an empty box cannot be chosen. */}
                <Select block aria-label="Books older than this are outdated" value={String(form.recencyYears)}
                  onChange={(e) => setForm({ ...form, recencyYears: e.target.value })}>
                  {Array.from({ length: 30 }, (_, i) => String(i + 1)).map(n => <option key={n} value={n}>{n === '1' ? '1 year' : `${n} years`}</option>)}
                </Select>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={form.enforceRecency} onChange={(e) => setForm({ ...form, enforceRecency: e.target.checked })} />
                Hide outdated books when instructors add references
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input type="checkbox" checked={form.requireLibraryAvailability} onChange={(e) => setForm({ ...form, requireLibraryAvailability: e.target.checked })} />
                Instructors can only add books from the library catalog
              </label>
            </>
          )}
          {error && <div role="alert" className={styles.error}>{error}</div>}
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !form}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>,
    document.body
  )
}

export default CatalogRulesDialog
