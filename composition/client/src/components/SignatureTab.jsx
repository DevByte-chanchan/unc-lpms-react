import { useEffect, useRef, useState } from 'react'
import { Trash2, Upload } from 'react-feather'
import { API_BASE, fetchJson, apiErrorMessage } from '../utils/api.js'
import { actingRole } from '../utils/session.js'
import { cleanSignatureFile } from '../utils/signatureCleanup.js'
import { confirmDialog } from '../utils/appDialog.jsx'
import styles from '../styles/SettingsModal.module.sass'

// Settings > Signature: the e-signature printed on the learning plans this person prepared or approved
// (server: controllers/profileController.js, stored encrypted; utils/approverSignatures.js decides where it goes).
// A photo or scan is cleaned in the browser first: the paper turns transparent and the picture is cropped to the ink.

const roleHeaders = () => { const role = actingRole(); return role ? { 'X-LPMS-Role': role } : {} }
const checker = 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 0 0 / 16px 16px'

const Preview = ({ src, label }) => (
  <div style={{ background: checker, border: '1px solid var(--line)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 110 }}>
    {src ? <img src={src} alt={label} style={{ maxHeight: 90, maxWidth: '100%' }} /> : <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>{label}</span>}
  </div>
)

const SignatureTab = () => {
  const [saved, setSaved] = useState(undefined) // undefined: loading; null: none; else an object URL
  const [file, setFile] = useState(null)
  const [strength, setStrength] = useState(50)
  const [draft, setDraft] = useState(null) // { blob, url } of the cleaned picture
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const input = useRef(null)

  const loadSaved = async () => {
    try {
      const profile = await fetchJson('/api/profile')
      if (!profile?.hasSignature) { setSaved(null); return }
      const res = await fetch(`${API_BASE}/api/profile/signature`, { credentials: 'include', headers: roleHeaders() })
      if (res.status === 503) { setSaved(null); setError('Signatures are not set up on this server yet (no signature key). Ask the administrator.'); return }
      setSaved(res.ok ? URL.createObjectURL(await res.blob()) : null)
    } catch (err) {
      setSaved(null)
      setError(apiErrorMessage(err, 'Your signature could not be loaded.'))
    }
  }
  useEffect(() => { loadSaved() }, [])
  useEffect(() => () => { if (typeof saved === 'string') URL.revokeObjectURL(saved) }, [saved])
  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.url) }, [draft])

  // Re-clean whenever the picture or the strength changes.
  useEffect(() => {
    if (!file) return undefined
    let on = true
    cleanSignatureFile(file, strength)
      .then(blob => {
        if (!on) return
        if (!blob) { setDraft(null); setError('No ink was found. Move the slider right, or use a darker photo on plain paper.'); return }
        setError('')
        setDraft({ blob, url: URL.createObjectURL(blob) })
      })
      .catch(() => { if (on) setError('This picture could not be read. Use a PNG or JPEG photo or scan.') })
    return () => { on = false }
  }, [file, strength])

  const pick = (chosen) => {
    setNotice(''); setError('')
    if (!chosen) return
    if (!/^image\/(png|jpeg)$/.test(chosen.type)) { setError('Use a PNG or JPEG picture.'); return }
    setFile(chosen)
  }

  const save = async () => {
    if (!draft) return
    if (draft.blob.size > 1024 * 1024) { setError('The cleaned picture is larger than 1 MB. Use a smaller or closer photo.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/profile/signature`, {
        method: 'PUT', credentials: 'include', headers: { ...roleHeaders(), 'Content-Type': 'image/png' }, body: draft.blob,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `The signature was not saved (${res.status}).`)
      }
      setFile(null); setDraft(null)
      if (input.current) input.current.value = ''
      await loadSaved()
      setNotice('Saved. It will appear on the plans you prepare or approve.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!(await confirmDialog('Exports will show only your name again.', { title: 'Remove your signature?', confirmLabel: 'Remove', danger: true }))) return
    setBusy(true); setError('')
    try {
      await fetchJson('/api/profile/signature', { method: 'DELETE' })
      setSaved(null)
      setNotice('Removed.')
    } catch (err) {
      setError(apiErrorMessage(err, 'The signature was not removed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={styles.footnote} style={{ marginTop: 0 }}>
        Your signature is printed above your name on the learning plans you prepared or approved, only for the steps you
        did. It is stored encrypted and only you can see it here.
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Current signature</div>
        <Preview src={typeof saved === 'string' ? saved : null} label={saved === undefined ? 'Loading…' : 'None yet'} />
        {typeof saved === 'string' && (
          <button type="button" className="btn btn-danger-outline btn-sm" style={{ marginTop: 8 }} onClick={remove} disabled={busy}>
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{typeof saved === 'string' ? 'Replace it' : 'Upload one'}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 8 }}>
          Sign on plain white paper with a dark pen, then take a straight, well-lit photo or scan (PNG or JPEG).
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg" hidden aria-label="Signature picture" onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          <Upload size={14} /> Choose a picture
        </button>
      </div>

      {file && (
        <div style={{ display: 'grid', gap: 8 }}>
          <Preview src={draft?.url} label="Cleaning…" />
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>Background removal: lower removes more paper, higher keeps fainter strokes</span>
            <input type="range" min="0" max="100" value={strength} onChange={(e) => setStrength(Number(e.target.value))} aria-label="Background removal strength" />
          </label>
          <div>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || !draft}>
              {busy ? 'Saving…' : 'Save signature'}
            </button>
          </div>
        </div>
      )}

      {error && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
      {notice && <div role="status" style={{ color: 'var(--good)', fontSize: 13 }}>{notice}</div>}
    </div>
  )
}

export default SignatureTab
