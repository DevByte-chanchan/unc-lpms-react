import React, { useState, useEffect } from 'react'
import styles from './UploadPanel.module.scss'

const STORAGE_KEY = 'lpsm_uploads_v1'

const normalizeRoleKey = (raw) => {
  if (!raw) return ''
  const r = String(raw).toLowerCase()
  if (r.includes('program')) return 'program-head'
  if (r.includes('dean')) return 'dean'
  if (r.includes('industry')) return 'industry-consultant'
  if (r.includes('library') || r.includes('libraries')) return 'director-of-libraries'
  if (r.includes('instructor')) return 'instructor'
  return r.replace(/_/g, '-').replace(/ /g, '-')
}

const readAll = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch (e) { return {} }
}

const writeAll = (obj) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)) } catch (e) { console.error('Failed to write uploads', e) }
}

const UploadPanel = ({ role = '', courseCode = '', uploadSlots = [] }) => {
  const [uploads, setUploads] = useState({})
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const all = readAll()
    const byCode = (courseCode && all[courseCode]) || {}
    setUploads(byCode)
  }, [courseCode])

  useEffect(() => {
    if (!role) {
      setShouldRender(false)
      return
    }
    
    const normalized = normalizeRoleKey(role)
    const currentRole = (() => {
      try { 
        return normalizeRoleKey(JSON.parse(localStorage.getItem('user') || 'null')?.role || localStorage.getItem('approver_role')) 
      } catch (e) { 
        return normalizeRoleKey(localStorage.getItem('approver_role')) 
      }
    })()
    
    setShouldRender(normalized === currentRole)
  }, [role])

  if (!shouldRender) return null

  const currentRole = (() => {
    try { 
      return normalizeRoleKey(JSON.parse(localStorage.getItem('user') || 'null')?.role || localStorage.getItem('approver_role')) 
    } catch (e) { 
      return normalizeRoleKey(localStorage.getItem('approver_role')) 
    }
  })()

  const handleFileChange = (slotId, e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const all = readAll()
    const byCode = all[courseCode] || {}
    const uploader = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null')?.name || localStorage.getItem('approver_name') || 'Uploader' } catch (e) { return localStorage.getItem('approver_name') || 'Uploader' } })()
    const entry = { name: f.name, uploadedAt: new Date().toISOString(), uploader, role: currentRole }
    byCode[slotId] = entry
    all[courseCode] = byCode
    writeAll(all)
    setUploads(byCode)
  }

  const handleReplace = (slotId) => {
    const el = document.getElementById(`upload-input-${slotId}`)
    if (el) el.click()
  }

  return (
    <div className={styles.panel}>
      <h4 className={styles.title}>Uploads</h4>
      <div className={styles.slots}>
        {uploadSlots.map((s) => {
          const slotId = s.id
          const stored = uploads && uploads[slotId]
          const accepted = Array.isArray(s.acceptedTypes) ? s.acceptedTypes.join(',') : (s.acceptedTypes || '')
          return (
            <div key={slotId} className={styles.slot}>
              <div className={styles.slotHeader}>
                <div className={styles.slotLabel}>{s.label}</div>
                <div className={styles.slotActions}>
                  {stored ? (
                    <>
                      <button className={styles.replaceBtn} onClick={() => handleReplace(slotId)}>Replace</button>
                    </>
                  ) : (
                    <label className={styles.uploadBtn}>
                      <input id={`upload-input-${slotId}`} type="file" accept={accepted} onChange={(e) => handleFileChange(slotId, e)} />
                      Upload
                    </label>
                  )}
                </div>
              </div>

              <div className={styles.slotBody}>
                {stored ? (
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{stored.name}</div>
                    <div className={styles.metaRow}>
                      <div className={styles.metaItem}>Uploaded: {new Date(stored.uploadedAt).toLocaleString()}</div>
                      <div className={styles.metaItem}>By: {stored.uploader}</div>
                      <div className={styles.statusBadge}>{stored.uploadedAt ? 'Uploaded' : 'Pending'}</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.empty}>No file uploaded.</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default UploadPanel
