import React, { useEffect, useState } from 'react'
import { DocumentService } from '../../services/documentService.js'
import { Upload } from 'react-feather'
import styles from '../../styles/RoleUploadPanel.module.sass'

const formatType = (file) => {
  if (!file) return ''
  if (file.type) return file.type.replace('application/', '').replace('vnd.openxmlformats-officedocument.', '').toUpperCase()
  const parts = file.name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const normalizeRoleKey = (raw) => {
  if (!raw) return ''
  const r = String(raw).toLowerCase()
  return r.replace(/_/g, '-').replace(/ /g, '-')
}

const RoleUploadPanel = ({ role = '', courseCode = '', uploadSlots = [], onUploadsChange = () => {} }) => {
  const [uploads, setUploads] = useState({})
  const roleKey = normalizeRoleKey(role)
  const storageKey = courseCode || roleKey || 'default'

  useEffect(() => {
    const all = DocumentService.getAllDocuments()
    const bucket = all[roleKey] || {}
    setUploads(bucket)
    onUploadsChange(bucket)
  }, [courseCode, roleKey])

  const handleFileChange = (slotId, e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return

    DocumentService.saveDocument(roleKey, slotId, {
      name: f.name,
      size: f.size
    })

    const all = DocumentService.getAllDocuments()
    const bucket = all[roleKey] || {}
    setUploads(bucket)
    onUploadsChange(bucket)
  }

  const handleRemove = (slotId) => {
    DocumentService.deleteDocument(roleKey, slotId)
    const all = DocumentService.getAllDocuments()
    const bucket = all[roleKey] || {}
    setUploads(bucket)
    onUploadsChange(bucket)
  }

  const handleReplace = (slotId) => {
    const el = document.getElementById(`upload-input-${storageKey}-${slotId}`)
    if (el) el.click()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h4 className={styles.title}>Uploads</h4>
        <span className={styles.panelMeta}>{Object.keys(uploads).length}/{uploadSlots.length} uploaded</span>
      </div>
      <div className={styles.slots}>
        {uploadSlots.map((slot) => {
          const slotId = slot.id
          const stored = uploads && uploads[slotId]
          const accepted = Array.isArray(slot.acceptedTypes) ? slot.acceptedTypes.join(', ') : slot.acceptedTypes || 'Any file type'

          return (
            <div key={slotId} className={styles.slot}>
              <div className={styles.slotHeader}>
                <div className={styles.slotTitle}>
                  {stored && <span className={styles.checkmark}>✓</span>}
                  <div>
                    <div className={styles.slotLabel}>{slot.label}</div>
                    {slot.description && <div className={styles.slotDescription}>{slot.description}</div>}
                  </div>
                </div>
                <span className={styles.statusBadge}>{stored ? 'Uploaded' : 'Awaiting upload'}</span>
              </div>

              <div className={styles.slotBody}>
                {stored ? (
                  <>
                    <div className={styles.uploadedFile}>
                      <div className={styles.fileTitle}>{stored.name}</div>
                      <div className={styles.fileInfo}>
                        <span>{formatFileSize(stored.size)}</span>
                        <span>{formatType(stored)}</span>
                        <span>{new Date(stored.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <input
                      id={`upload-input-${storageKey}-${slotId}`}
                      className={styles.hiddenInput}
                      type="file"
                      accept={Array.isArray(slot.acceptedTypes) ? slot.acceptedTypes.join(',') : slot.acceptedTypes || ''}
                      onChange={(e) => handleFileChange(slotId, e)}
                    />
                  </>
                ) : (
                  <label className={styles.uploadDropzone} htmlFor={`upload-input-${storageKey}-${slotId}`}>
                    <Upload size={28} />
                    <div className={styles.uploadDropzoneText}>Click to upload or drag and drop</div>
                    <div className={styles.uploadDropzoneHint}>Supported files: {accepted}</div>
                    <input
                      id={`upload-input-${storageKey}-${slotId}`}
                      type="file"
                      accept={Array.isArray(slot.acceptedTypes) ? slot.acceptedTypes.join(',') : slot.acceptedTypes || ''}
                      onChange={(e) => handleFileChange(slotId, e)}
                    />
                  </label>
                )}

                <div className={styles.actionRow}>
                  {stored ? (
                    <>
                      <button type="button" className={styles.btnReplace} onClick={() => handleReplace(slotId)}>
                        Change File
                      </button>
                      <button type="button" className={styles.removeBtn} onClick={() => handleRemove(slotId)}>
                        Remove
                      </button>
                    </>
                  ) : (
                    <div className={styles.uploadHintText}>Upload a document to complete this item.</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RoleUploadPanel
