import React, { useEffect, useState } from 'react'
import { fetchFormInfo, saveFormInfo } from '../utils/formSettings.js'
import { apiErrorMessage } from '../utils/api.js'

// The ISO identity of the printed forms: each form's revision number and effectivity date.
// These describe the FORM (they change when the institution reissues it), not any syllabus, and
// are printed in the footer of every export. Only the Dean can change them.
const FORMS = [
  { key: 'syllabus', label: 'Course Syllabus form' },
  { key: 'coaep', label: 'Course Assessment & Evaluation Plan form' }
]

const FormSettingsPanel = () => {
  const [info, setInfo] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [messages, setMessages] = useState({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let live = true
    fetchFormInfo().then(data => {
      if (!live) return
      setInfo(data)
      setDrafts(Object.fromEntries(FORMS.map(({ key }) => [key, { revisionNo: data[key].revisionNo, effectivity: data[key].effectivity }])))
    })
    return () => { live = false }
  }, [])

  const edit = (key, field, value) => setDrafts(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))

  const save = async (key) => {
    setMessages(prev => ({ ...prev, [key]: { text: 'Saving…', ok: true } }))
    try {
      const saved = await saveFormInfo(key, drafts[key])
      setInfo(prev => ({ ...prev, [key]: saved }))
      setMessages(prev => ({ ...prev, [key]: { text: 'Saved. New exports use these values.', ok: true } }))
    } catch (error) {
      setMessages(prev => ({ ...prev, [key]: { text: apiErrorMessage(error, 'Could not save.'), ok: false } }))
    }
  }

  return (
    <section aria-label="Form settings" style={{ margin: '0 0 16px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', height: 'auto', flex: '0 0 auto' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#111827', fontWeight: 600, cursor: 'pointer' }}>
        Form settings (ISO revision and effectivity) {open ? '▾' : '▸'}
      </button>
      {open && info && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 12 }}>
          {FORMS.map(({ key, label }) => (
            <div key={key} style={{ display: 'grid', gap: 6 }}>
              <strong>{label} <span style={{ fontWeight: 400 }}>— {info[key].docControlNo}</span></strong>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
                <label>Revision No.<br />
                  <input value={drafts[key]?.revisionNo || ''} onChange={e => edit(key, 'revisionNo', e.target.value)} style={{ width: 90 }} />
                </label>
                <label>Effectivity (MM/DD/YYYY)<br />
                  <input value={drafts[key]?.effectivity || ''} onChange={e => edit(key, 'effectivity', e.target.value)} placeholder="MM/DD/YYYY" style={{ width: 140 }} />
                </label>
                <button type="button" onClick={() => save(key)}>Save</button>
              </div>
              {messages[key] && <span role="status" style={{ color: messages[key].ok ? '#166534' : '#b91c1c' }}>{messages[key].text}</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default FormSettingsPanel
