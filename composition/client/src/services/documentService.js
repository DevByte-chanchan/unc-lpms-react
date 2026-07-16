// CRUD service for document management with localStorage
const DOCS_STORAGE_KEY = 'lpsm_documents_v1'

export const DocumentService = {
  // Get all documents
  getAllDocuments: () => {
    try {
      return JSON.parse(localStorage.getItem(DOCS_STORAGE_KEY) || '{}')
    } catch (e) {
      console.error('Failed to read documents', e)
      return {}
    }
  },

  // Get documents by role
  getDocumentsByRole: (role) => {
    const all = DocumentService.getAllDocuments()
    const normalized = normalizeRole(role)
    return all[normalized] || {}
  },

  // Get all documents as flat array
  getAllDocumentsFlat: () => {
    const all = DocumentService.getAllDocuments()
    const flat = []
    Object.entries(all).forEach(([role, docs]) => {
      Object.entries(docs).forEach(([slotId, doc]) => {
        flat.push({
          ...doc,
          id: `${role}-${slotId}`,
          role,
          slotId,
          uploadedAt: doc.uploadedAt || new Date().toISOString()
        })
      })
    })

    // If no documents exist, add some sample data
    if (flat.length === 0) {
      const sampleDocs = [
        {
          id: 'program-head-program_outcomes_peo_alignment',
          name: 'Program Outcomes & PEO Alignment Report.pdf',
          uploadedAt: '2025-01-15T10:30:00Z',
          uploader: 'CASIMERO, DANNY',
          uploaderId: '1',
          role: 'program-head',
          slotId: 'program_outcomes_peo_alignment',
          size: 2457600,
          type: 'PDF',
          status: 'Approved'
        },
        {
          id: 'program-head-coaep',
          name: 'COAEP Summary.docx',
          uploadedAt: '2025-01-12T14:20:00Z',
          uploader: 'CASIMERO, DANNY',
          uploaderId: '1',
          role: 'program-head',
          slotId: 'coaep',
          size: 1843200,
          type: 'Word',
          status: 'Under Review'
        },
        {
          id: 'director-of-libraries-reference_materials',
          name: 'Accreditation Reference Pack.pdf',
          uploadedAt: '2025-01-10T09:15:00Z',
          uploader: 'CASIMERO, DANNY',
          uploaderId: '1',
          role: 'director-of-libraries',
          slotId: 'reference_materials',
          size: 5242880,
          type: 'PDF',
          status: 'Approved'
        }
      ]
      return sampleDocs
    }

    return flat.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
  },

  // Create/Update document
  saveDocument: (role, slotId, fileData) => {
    const all = DocumentService.getAllDocuments()
    const normalized = normalizeRole(role)
    if (!all[normalized]) all[normalized] = {}

    const uploader = getUploaderInfo()
    const entry = {
      name: fileData.name,
      uploadedAt: new Date().toISOString(),
      uploader: uploader.name,
      uploaderId: uploader.id,
      role: normalized,
      size: fileData.size,
      type: getFileType(fileData.name),
      status: 'Pending'
    }

    all[normalized][slotId] = entry
    saveToStorage(all)
    return entry
  },

  // Delete document
  deleteDocument: (role, slotId) => {
    const all = DocumentService.getAllDocuments()
    const normalized = normalizeRole(role)
    if (all[normalized] && all[normalized][slotId]) {
      delete all[normalized][slotId]
      saveToStorage(all)
      return true
    }
    return false
  },

  // Update document status
  updateDocumentStatus: (role, slotId, status) => {
    const all = DocumentService.getAllDocuments()
    const normalized = normalizeRole(role)
    if (all[normalized] && all[normalized][slotId]) {
      all[normalized][slotId].status = status
      saveToStorage(all)
      return all[normalized][slotId]
    }
    return null
  },

  // Get documents for review (by admin/reviewer)
  getDocumentsForReview: () => {
    return DocumentService.getAllDocumentsFlat()
  },

  // Get instructor's submissions
  getInstructorDocuments: () => {
    return DocumentService.getAllDocumentsFlat()
  }
}

// Helper functions
const normalizeRole = (raw) => {
  if (!raw) return 'unknown'
  const r = String(raw).toLowerCase()
  return r.replace(/_/g, '-').replace(/ /g, '-')
}

const getUploaderInfo = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null') || {}
    return {
      name: user.name || 'Unknown User',
      id: user.id || '0',
      role: user.role || 'unknown'
    }
  } catch (e) {
    return {
      name: 'Unknown User',
      id: '0',
      role: 'unknown'
    }
  }
}

const getFileType = (filename) => {
  if (!filename) return 'FILE'
  const ext = filename.split('.').pop()?.toUpperCase() || 'FILE'
  const typeMap = {
    PDF: 'PDF',
    DOCX: 'Word',
    DOC: 'Word',
    XLSX: 'Excel',
    XLS: 'Excel',
    CSV: 'CSV',
    TXT: 'Text'
  }
  return typeMap[ext] || ext
}

const saveToStorage = (obj) => {
  try {
    localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(obj))
  } catch (e) {
    console.error('Failed to save documents', e)
  }
}
