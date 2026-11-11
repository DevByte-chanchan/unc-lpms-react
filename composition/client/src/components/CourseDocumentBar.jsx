import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileText, Upload, Zap } from 'react-feather'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { downloadFromApi, openCourseDocument } from '../utils/courseDocuments.js'
import { getSession } from '../utils/session.js'
import ScanReviewModal from './ScanReviewModal.jsx'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'

// The Program Head's own file for one course offering, beside the table generated from the instructor's plan:
// kind 'co-po' or 'coaep' (server: /api/course-documents). When one is uploaded, the page's Export opens it
// instead of the generated table; the instructor's plan is never changed.

// The bar every Program Documents tab uses: what is uploaded, then its buttons (Template, Upload, View, Remove).
export const DocumentBar = ({ label, status, error, children }) => (
  <div className={pageStyles.contextBar} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <FileText size={16} aria-hidden="true" />
    <span style={{ flex: '1 1 240px', minWidth: 0 }}><strong>{label}:</strong> {status}</span>
    {/* Buttons sit at the right edge on every tab, wherever the sentence ends. */}
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>{children}</div>
    {error && <span role="alert" style={{ color: 'var(--danger)', flexBasis: '100%' }}>{error}</span>}
  </div>
)

export const TemplateButton = ({ path, name, onError }) => (
  <button type="button" className="btn btn-secondary btn-sm" title="The spreadsheet layout to fill in"
    onClick={() => downloadFromApi(path, name).catch(() => onError?.('The template could not be downloaded.'))}>
    <Download size={14} /> Template
  </button>
)

// `onChange(doc)`: the uploaded file's { fileName, contentType, updatedAt, parsed }, or null when there is none.
// parsed: an Excel file read into the generated table's shape (server: utils/courseDocumentSheets.js).
const CourseDocumentBar = ({ pcId, kind, label, onChange }) => {
  const [doc, setDoc] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const scanRef = useRef(null)
  // A scan in review: { file, result }; saving: while "Use these" is sent.
  const [scan, setScan] = useState(null)
  const [saving, setSaving] = useState(false)
  const [scanError, setScanError] = useState('')
  const canEdit = getSession()?.role === 'program-head'

  const load = useCallback(async () => {
    if (!pcId) return
    setDoc(undefined)
    try {
      const info = await fetchJson(`/api/course-documents/${pcId}`)
      setDoc(info[kind] || null)
    } catch {
      setDoc(null)
    }
  }, [pcId, kind])
  useEffect(() => { load() }, [load])
  useEffect(() => { onChange?.(doc ?? null) }, [doc, onChange])

  const run = async (action) => {
    setBusy(true); setError('')
    try { await action(); await load() } catch (err) { setError(apiErrorMessage(err, err?.message || 'The change was not saved.')) } finally { setBusy(false) }
  }
  const upload = (file) => file && run(async () => {
    await fetchJson(`/api/course-documents/${pcId}/${kind}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }, body: file,
    })
    if (fileRef.current) fileRef.current.value = ''
  })
  // Scan a picture or PDF of the form: what is read opens in "Check what was read"; nothing is saved yet.
  const startScan = async (file) => {
    if (!file) return
    setBusy(true); setError('')
    try {
      const result = await fetchJson(`/api/course-documents/${pcId}/${kind}/scan`, {
        method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file,
      })
      setScanError('')
      setScan({ file, result })
    } catch (err) {
      setError(apiErrorMessage(err, 'The file could not be scanned.'))
    } finally {
      setBusy(false)
      if (scanRef.current) scanRef.current.value = ''
    }
  }
  const saveScan = async (data) => {
    setSaving(true); setScanError('')
    try {
      await fetchJson(`/api/course-documents/${pcId}/${kind}/scanned`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }),
      })
      setScan(null)
      await load()
    } catch (err) {
      setScanError(apiErrorMessage(err, 'The scan was not saved.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = () => window.confirm(`Remove the uploaded ${label}? View / Export goes back to the generated table.`)
    && run(() => fetchJson(`/api/course-documents/${pcId}/${kind}`, { method: 'DELETE' }))

  if (!pcId) return null
  return (
    <DocumentBar label={label} error={error} status={
      doc === undefined ? 'checking…'
        : !doc ? 'none uploaded — the table is generated from the plan.'
          : doc.parsed ? `${doc.fileName} — read into the table below; Export uses it.`
            : `${doc.fileName} — Export opens this file instead of the generated table.`
    }>
      {canEdit && <TemplateButton path={`/api/course-documents/template/${kind}`} name={`${kind === 'coaep' ? 'COAEP' : 'CO-PO'}-template.xlsx`} onError={setError} />}
      {doc && <button type="button" className="btn btn-secondary btn-sm" onClick={() => openCourseDocument(pcId, kind, doc).catch(() => setError('The file could not be opened.'))}>View</button>}
      {canEdit && (
        <>
          <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,application/pdf" hidden aria-label={`${label} file`} onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {doc ? 'Replace' : 'Upload Excel or PDF'}
          </button>
          <input ref={scanRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" hidden aria-label={`Scan ${label}`} onChange={(e) => startScan(e.target.files?.[0])} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} title="Read a photo or PDF of the form, then check it" onClick={() => scanRef.current?.click()}>
            <Zap size={14} /> {busy ? 'Reading…' : 'Scan'}
          </button>
          {doc && <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={remove}>Remove</button>}
        </>
      )}
      {scan && <ScanReviewModal kind={kind} file={scan.file} result={scan.result} busy={saving} error={scanError}
        onCancel={() => setScan(null)} onUse={saveScan} />}
    </DocumentBar>
  )
}

export default CourseDocumentBar
