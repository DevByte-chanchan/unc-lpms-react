import React, { useMemo, useState, useEffect } from 'react'
import SkeletonA from '../layouts/SkeletonA.jsx'
import HeaderA from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import { DocumentService } from '../services/documentService.js'
import styles from '../styles/UploadPages.module.sass'

const normalizeRoleKey = (raw) => {
  if (!raw) return ''
  const r = String(raw).toLowerCase()
  return r.replace(/_/g, '-').replace(/ /g, '-')
}

const prettyRoleLabel = {
  'instructor': 'Instructor',
  'program-head': 'Program Head',
  'director-of-libraries': 'Director of Libraries',
  'industry-consultant': 'Industry Consultant',
  'dean': 'Dean',
  'vpaa': 'VPAA',
  'reviewer': 'Reviewer'
}

const SharedDocuments = () => {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null') || {}
    } catch (e) {
      return {}
    }
  })()
  const roleKey = normalizeRoleKey(user.role || 'reviewer')
  const headerRole = prettyRoleLabel[roleKey] || 'Reviewer'
  const name = user.name || 'USER'
  const navigationMode = ['instructor', 'program-head', 'director-of-libraries', 'industry-consultant', 'dean', 'vpaa'].includes(roleKey) ? roleKey : 'program-head'

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await DocumentService.getAllDocumentsFlat()
        setDocuments(docs)
      } catch (error) {
        console.error('Failed to fetch documents:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [])

  const normalizedSearch = search.trim().toLowerCase()

  const programDocs = useMemo(() => {
    return documents.filter(doc => doc.role === 'program-head' && doc.name.toLowerCase().includes(normalizedSearch))
  }, [documents, normalizedSearch])

  const referenceDocs = useMemo(() => {
    return documents.filter(doc => doc.role === 'director-of-libraries' && doc.name.toLowerCase().includes(normalizedSearch))
  }, [documents, normalizedSearch])

  const showProgramSection = filter === 'all' || filter === 'program'
  const showReferenceSection = filter === 'all' || filter === 'references'
  const showReviewerActions = roleKey !== 'instructor'

  if (loading) {
    return (
      <SkeletonA
        header={<HeaderA role={headerRole} name={name} />}
        nav={<SideNavigation mode={navigationMode} />}
        content={<div style={{ padding: 20 }}>Loading documents...</div>}
      />
    )
  }

  return (
    <SkeletonA
      header={<HeaderA role={headerRole} name={name} />}
      nav={<SideNavigation mode={navigationMode} />}
      content={
        <div className={styles.pageGrid}>
          <div>
            <h2>Learning Plan Documents</h2>
            <p>View all submitted documents for this learning plan.</p>
          </div>

          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className={styles.filterSelect} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Documents</option>
              <option value="program">Program Documents</option>
              <option value="references">References</option>
            </select>
          </div>

          {showProgramSection && (
            <div>
              <p className={styles.sectionLabel}>Program Documents</p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Uploaded By</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.name}</td>
                      <td>{doc.type}</td>
                      <td>{doc.uploader}</td>
                      <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`${styles.pill} ${doc.status === 'Approved' ? styles.pillApproved : doc.status === 'Under Review' ? styles.pillReview : doc.status === 'Rejected' ? styles.pillRejected : styles.pillPending}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td>
                        <button className={styles.tableAction} type="button">View</button>
                        <button className={styles.tableAction} type="button">Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showReferenceSection && (
            <div>
              <p className={styles.sectionLabel}>Reference Materials</p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Uploaded By</th>
                    <th>Upload Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referenceDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.name}</td>
                      <td>{doc.type}</td>
                      <td>{doc.uploader}</td>
                      <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                      <td>
                        <button className={styles.tableAction} type="button">View</button>
                        <button className={styles.tableAction} type="button">Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showReviewerActions && (
            <div className={styles.bottomActions}>
              <button className={styles.btnOutline} type="button">Add Comment</button>
              <button className={styles.btnOutline} type="button" style={{ borderColor: '#f59e0b', color: '#b45309' }}>
                Request Changes
              </button>
              <button className={styles.btnPrimary} type="button" style={{ background: '#16a34a' }}>
                Approve All Documents
              </button>
            </div>
          )}
        </div>
      }
    />
  )
}

export default SharedDocuments