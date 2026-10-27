import React, { useEffect, useState } from 'react'
import { Sliders, X } from 'react-feather'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { getCatalogSettings, refreshCatalogSettings, settingsFromApi, setCatalogSettings } from '../utils/referenceCatalog.js'

// The Director of Libraries sets the Reference Library rules once, for everyone: how many years back a
// title may be published, whether an older one is kept out, and whether only titles the library holds
// may be attached to a plan.
const CatalogRulesPanel = ({ onSaved }) => {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(getCatalogSettings)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    let on = true
    refreshCatalogSettings(fetchJson).then(latest => { if (on) setForm(latest) })
    return () => { on = false }
  }, [open])

  const save = async () => {
    setSaving(true); setError('')
    try {
      const saved = await fetchJson('/api/catalog-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recencyYears: Number(form.recencyYears), enforceRecency: form.enforceRecency, requireLibraryAvailability: form.requireLibraryAvailability })
      })
      setCatalogSettings(settingsFromApi(saved))
      setOpen(false)
      if (onSaved) onSaved('Reference rules saved for everyone.')
    } catch (err) {
      setError(apiErrorMessage(err, 'The rules could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" className="app-link-button" onClick={() => setOpen(true)}><Sliders size={15} /> Rules</button>
      {open && (
        <div>
          <div role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Reference rules" style={{ position: 'fixed', zIndex: 31, top: '20%', left: '50%', transform: 'translateX(-50%)', width: 'min(440px, 92vw)', background: '#FFFFFF', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Reference rules</h2>
              <button type="button" className="app-icon-close" aria-label="Close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <label>A title is recent if published within the last
              <input id="rules-years" type="number" min="1" max="30" value={form.recencyYears} onChange={(e) => setForm({ ...form, recencyYears: e.target.value })} style={{ width: 70, margin: '0 6px', height: 32 }} />
              years
            </label>
            <label style={{ display: 'flex', gap: 8 }}>
              <input type="checkbox" checked={form.enforceRecency} onChange={(e) => setForm({ ...form, enforceRecency: e.target.checked })} />
              Keep older titles out of the list a plan can attach from
            </label>
            <label style={{ display: 'flex', gap: 8 }}>
              <input type="checkbox" checked={form.requireLibraryAvailability} onChange={(e) => setForm({ ...form, requireLibraryAvailability: e.target.checked })} />
              Only titles the library holds can be attached
            </label>
            <div style={{ color: '#6B7280', fontSize: 13 }}>These apply to everyone, and to the flags shown to reviewers.</div>
            {error && <div role="alert" style={{ color: '#b91c1c' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, height: 40, background: '#FFFFFF', color: '#111827', border: '1px solid #111827', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={save} disabled={saving} style={{ flex: 1, height: 40, background: '#2C3744', color: '#FFFFFF', borderRadius: 8, border: 'none', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CatalogRulesPanel
