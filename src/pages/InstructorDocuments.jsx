import React, { useState, useEffect } from 'react'
import SkeletonA from '../layouts/SkeletonA.jsx'
import HeaderA from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import { DocumentService } from '../services/documentService.js'
import uploadStyles from '../styles/UploadPages.module.sass'

const formatBytes = (bytes) => {
  if (!bytes) return '—'
  const value = bytes < 1024 ? bytes : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return value
}

const InstructorDocuments = () => {
  const [documents, setDocuments] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') || {}
    } catch (e) {
      return {}
    }
  })()

  useEffect(() => {
    try {
      const docs = DocumentService.getInstructorDocuments()
      setDocuments(docs)
    } catch (e) {
      console.error('Failed to load documents', e)
    }
  }, [])

  const normalizedSearch = search.trim().toLowerCase()

  const filtered = documents.filter((doc) => {
    const isMyDocument = doc.uploaderId === user.id || doc.uploader === user.name
    const matchesSearch = doc.name.toLowerCase().includes(normalizedSearch) || doc.type.toLowerCase().includes(normalizedSearch)
    const matchesFilter = filter === 'all' || doc.status.toLowerCase() === filter.toLowerCase()
    return isMyDocument && matchesSearch && matchesFilter
  })

  const statusCounts = {
    Pending: documents.filter((d) => d.status === 'Pending').length,
    'Under Review': documents.filter((d) => d.status === 'Under Review').length,
    Approved: documents.filter((d) => d.status === 'Approved').length,
    Rejected: documents.filter((d) => d.status === 'Rejected').length
  }

  const handleDelete = (role, slotId) => {
    if (window.confirm('Delete this document?')) {
      DocumentService.deleteDocument(role, slotId)
      setDocuments(DocumentService.getInstructorDocuments())
    }
  }

  const handleEdit = (role, slotId) => {
    alert('Edit functionality coming soon. Currently you can delete and re-upload.')
  }

  return (
    <SkeletonA
      header={<HeaderA role="Instructor" name={user.name || 'User'} />}
      nav={<SideNavigation mode="instructor" />}
      content={
        <div className={uploadStyles.pageGrid}>
          <div>
            <h2>My Submitted Documents</h2>
            <p>View and manage all your submitted documents and their review status.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Total Documents</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{documents.length}</div>
            </div>
            <div style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Pending</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{statusCounts.Pending}</div>
            </div>
            <div style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Under Review</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{statusCounts['Under Review']}</div>
            </div>
            <div style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Approved</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{statusCounts.Approved}</div>
            </div>
          </div>

          <div className={uploadStyles.searchRow}>
            <input
              className={uploadStyles.searchInput}
              placeholder="Search documents by name, type, or uploader..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={uploadStyles.filterSelect} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Documents</option>
              <option value="Pending">Pending Review</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            {filtered.length === 0 ? (
              <p className={uploadStyles.emptyState}>
                {documents.length === 0 ? 'No documents submitted yet.' : 'No documents match your search.'}
              </p>
            ) : (
              <table className={uploadStyles.table}>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Role</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.name}</td>
                      <td>{doc.type}</td>
                      <td>{formatBytes(doc.size)}</td>
                      <td>{doc.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                      <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`${uploadStyles.pill} ${
                            doc.status === 'Approved'
                              ? uploadStyles.pillApproved
                              : doc.status === 'Under Review'
                                ? uploadStyles.pillReview
                                : doc.status === 'Rejected'
                                  ? uploadStyles.pillRejected
                                  : uploadStyles.pillPending
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td>
                        <button className={uploadStyles.tableAction} type="button" onClick={() => handleEdit(doc.role, doc.slotId)}>
                          Edit
                        </button>
                        <button
                          className={uploadStyles.tableAction}
                          type="button"
                          style={{ color: '#dc2626' }}
                          onClick={() => handleDelete(doc.role, doc.slotId)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      }
    />
  )
}

export default InstructorDocuments
