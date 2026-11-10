import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Upload } from 'react-feather'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { openCourseDocument } from '../utils/courseDocuments.js'
import { getSession } from '../utils/session.js'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'

// The Program Head's own file for one course offering, beside the table generated from the instructor's plan:
// kind 'co-po' or 'coaep' (server: /api/course-documents). When one is uploaded, the page's Preview / Export opens it
// instead of the generated table; the instructor's plan is never changed.

// `onChange(doc)`: the uploaded file's { fileName, contentType, updatedAt }, or null when there is none.
const CourseDocumentBar = ({ pcId, kind, label, onChange }) => {
  const [doc, setDoc] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
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
  const remove = () => window.confirm(`Remove the uploaded ${label}? View / Export goes back to the generated table.`)
    && run(() => fetchJson(`/api/course-documents/${pcId}/${kind}`, { method: 'DELETE' }))

  if (!pcId) return null
  return (
    <div className={pageStyles.contextBar} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <FileText size={16} aria-hidden="true" />
      <span>
        Uploaded {label}:{' '}
        {doc === undefined ? 'checking…' : doc ? `${doc.fileName} — Preview / Export opens this file instead of the generated table.` : 'none — Preview / Export uses the table generated from the plan.'}
      </span>
      {doc && <button type="button" className="btn btn-secondary btn-sm" onClick={() => openCourseDocument(pcId, kind, doc).catch(() => setError('The file could not be opened.'))}>View</button>}
      {canEdit && (
        <>
          <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,application/pdf" hidden aria-label={`${label} file`} onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {doc ? 'Replace' : 'Upload PDF or Excel'}
          </button>
          {doc && <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy} onClick={remove}>Remove</button>}
        </>
      )}
      {error && <span role="alert" style={{ color: 'var(--danger)' }}>{error}</span>}
    </div>
  )
}

export default CourseDocumentBar
