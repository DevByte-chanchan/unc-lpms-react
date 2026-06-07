import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass'
import { ChevronRight, Download } from 'react-feather'
import { getWorkflow } from '../utils/workflowHelpers'
import { syllabiData, getSyllabusByCode } from '../data/syllabiData.js'
import { fetchJson } from '../utils/api.js'
import PDFViewerModal from './PDFViewerModal'

const getProgram = (code) => {
  if (code && code.startsWith('IT ')) return 'Information Technology';
  return 'Computer Science';
};

const STATUSES = ["DRAFT", "PENDING", "RETURNED", "APPROVED"];

const ApprovalCoursesTable = ({ role = 'approver' }) => {
  const currentYear = new Date().getFullYear()
  const startYear = 2000

  const yearOptions = []
  for (let i = currentYear; i >= startYear; i--) {
    yearOptions.push(<option key={i} value={i}>{i}</option>)
  }
  const semOptions = ['1st Sem', '2nd Sem']

  const [selectedStatus, setSelectedStatus] = useState('PENDING')
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [statusPopup, setStatusPopup] = useState(null)
  const [popupPos, setPopupPos] = useState(null)

  useEffect(() => {
    loadAssignments()
  }, [])

  const mapStaticToRows = () => {
    const now = new Date().toISOString()
    return syllabiData.map((s, i) => {
      const wf = getWorkflow(s.code)
      const stage = wf.currentStage || 'submitted'
      let status = 'DRAFT'
      if (stage === 'approved') status = 'APPROVED'
      else if (stage === 'returned') status = 'RETURNED'
      else if (stage === 'submitted') status = 'DRAFT'
      else status = 'PENDING'

      const mod = i % 4
      let date_submitted = null
      let d_date_accepted = null
      let d_date_returned = null
      let ph_date_returned = null
      let ic_date_returned = null
      let ld_date_returned = null

      if (mod === 1) {
        date_submitted = s.update || now
      } else if (mod === 2) {
        date_submitted = s.update || now
        d_date_accepted = now
      } else if (mod === 3) {
        date_submitted = s.update || now
        ld_date_returned = now
      }

      return {
        code: s.code,
        name: s.name,
        program: getProgram(s.code),
        lastUpdated: s.update || 'TBA',
        instructor: 'Danny Casimero',
        status,
        date_assigned: s.update || now,
        date_submitted,
        d_date_accepted,
        d_date_returned,
        ph_date_returned,
        ic_date_returned,
        ld_date_returned,
        reviewers: getReviewerStatuses(s.code),
      }
    })
  }

  const getReviewerStatuses = (courseCode) => {
    const wf = getWorkflow(courseCode)
    const stage = wf.currentStage || 'submitted'

    const mapStatus = (raw, activeStages) => {
      if (raw === 'done') return 'approved'
      if (raw === 'returned') return 'returned'
      return activeStages ? 'pending' : 'waiting'
    }

    const icStatus = mapStatus(wf.parallelReview?.industry_consultant?.status, stage === 'parallel_review' || stage === 'program_head' || stage === 'dean' || stage === 'approved')
    const libStatus = mapStatus(wf.parallelReview?.library_director?.status, stage === 'parallel_review' || stage === 'program_head' || stage === 'dean' || stage === 'approved')
    const phStatus = mapStatus(wf.programHead?.status, stage === 'program_head')
    const deanStatus = mapStatus(wf.dean?.status, stage === 'dean')

    return [
      { role: 'Industry Consultant',    name: 'Roberto Cruz',   status: icStatus,  completedAt: wf.parallelReview?.industry_consultant?.completedAt },
      { role: 'Director of Libraries',  name: 'Maria Santos',   status: libStatus, completedAt: wf.parallelReview?.library_director?.completedAt },
      { role: 'Program Head',           name: 'Junar Danila',   status: phStatus,  completedAt: wf.programHead?.completedAt },
      { role: 'Dean',                   name: 'Agnes Reyes',    status: deanStatus, completedAt: wf.dean?.completedAt },
    ]
  }

  async function loadAssignments() {
    setLoading(true)
    try {
      const data = await fetchJson('/api/assignments')
      const rows = Array.isArray(data) ? data : (data.data || data.rows || [])
      setAssignments(rows.map(r => ({
        code: r.ProgramCourseOffering?.Course?.course_no || r.code || '-',
        name: r.ProgramCourseOffering?.Course?.course_title || r.name || '-',
        program: getProgram(r.ProgramCourseOffering?.Course?.course_no || r.code || ''),
        lastUpdated: r.date_updated || r.date_assigned || 'TBA',
        status: r.d_date_accepted ? 'APPROVED' : (r.d_date_returned || r.ph_date_returned || r.ic_date_returned || r.ld_date_returned ? 'RETURNED' : (r.date_submitted ? 'PENDING' : 'DRAFT')),
        date_assigned: r.date_assigned || '',
        reviewers: getReviewerStatuses(r.ProgramCourseOffering?.Course?.course_no || r.code || ''),
        instructor: r.instructor || 'Danny Casimero',
      })))
    } catch (err) {
      console.warn("API unavailable, using static syllabiData as fallback")
      setAssignments(mapStaticToRows())
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    return assignments.filter(row => row.status === selectedStatus)
  }, [assignments, selectedStatus])

  const getStatusCount = (statusName) => {
    return assignments.filter(row => row.status === statusName).length
  }

  const getCourseStatusBadge = (statusKey) => {
    switch (statusKey) {
      case 'APPROVED': return <span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>Approved</span>
      case 'PENDING': return <span style={{ color: '#b45309', background: '#fffbeb', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>Pending</span>
      case 'RETURNED': return <span style={{ color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>Returned</span>
      default: return <span style={{ color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>Draft</span>
    }
  }

  const getCourseLink = (course) => {
    return `/role/${role}/courses/${encodeURIComponent(course.code)}?status=${course.status.toLowerCase()}`
  }

  const openPreview = (course) => {
    try {
      const syllabus = getSyllabusByCode(course.code)
      if (!syllabus) return
      setPreviewFile({
        file_url: 'https://pdfobject.com/pdf/sample.pdf',
        file_name: `SYLLABUS_${course.code}.pdf`,
        instructor_name: syllabus.instructor || '—',
        course_id: course.code,
        course_name: course.name,
        submission_date: syllabus.update || '',
        period_label: (syllabus.year || '') + ' — ' + (syllabus.sem || ''),
      })
    } catch (e) {
      console.error('Export preview failed:', e)
    }
  }

  const mapStatusToLabel = (status) => {
    if (!status) return ''
    const s = status.toLowerCase()
    if (s === 'approved' || s === 'done') return 'Approved'
    if (s === 'pending') return 'Pending'
    if (s === 'waiting') return '\u2014'
    if (s === 'revision' || s === 'returned') return 'Returned'
    return status
  }

  return (
    <>
    <div className={styles['courses-table']}>
      <div className={styles.header}>
        <h2>ASSIGNED COURSES</h2>
        <div className={styles.filterA}>
          <select className={styles['header-select']}>
            {yearOptions}
          </select>
          <select className={styles['header-select']}>
            {semOptions.map(sem => <option key={sem} value={sem}>{sem}</option>)}
          </select>
        </div>
        <div className={styles.fill}></div>
        <div className={styles['filter-container']}>
          <div className={styles['segmented-control']}>
            {STATUSES.map(status => (
              <button
                key={status}
                type="button"
                className={`${styles['control-item']} ${selectedStatus === status ? styles['active'] : ''}`}
                onClick={() => setSelectedStatus(status)}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles['table-container']}>
        {loading && <div>Loading...</div>}

        {(selectedStatus === 'DRAFT' || selectedStatus === 'APPROVED') && (
          <table>
            <thead>
              <tr>
                <th width={200}>DATE ASSIGNED</th>
                <th width={150}>CODE</th>
                <th width={350}>COURSE NAME</th>
                {selectedStatus === 'APPROVED' && <th width={200}>DATE APPROVED</th>}
                <th className={styles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? filteredRows.map((row, index) => (
                <tr key={index}>
                  <td width={200}>{row.date_assigned ? new Date(row.date_assigned).toLocaleDateString() : '-'}</td>
                  <td width={150}>{row.code}</td>
                  <td width={350}>{row.name}</td>
                  {selectedStatus === 'APPROVED' && <td width={200}>{row.d_date_accepted ? new Date(row.d_date_accepted).toLocaleDateString() : '-'}</td>}
                  <td className={styles.fill}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                      {selectedStatus === 'APPROVED' && (
                        <button
                          onClick={() => openPreview(row)}
                          className={'actionLink'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: 13, fontWeight: 500, color: '#111827' }}
                        >
                          Export <Download size={16} />
                        </button>
                      )}
                      <Link className={'actionLink'} to={getCourseLink(row)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: '#111827' }}
                      >
                        View <ChevronRight size={18} />
                      </Link>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); const rect = e.target.getBoundingClientRect(); setPopupPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right }); setStatusPopup(statusPopup === row.code ? null : row.code); }}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: '#f1f5f9', border: '1px solid #cbd5e1',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, color: '#64748b', fontSize: 14, fontWeight: 700,
                          }}
                          title="View approval status"
                        >
                          ?
                        </button>
                        {statusPopup === row.code && popupPos && (
                          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => { setStatusPopup(null); setPopupPos(null); }} />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={selectedStatus === 'APPROVED' ? 5 : 4} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                    {selectedStatus === 'DRAFT' ? 'No draft courses.' : 'No approved courses yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {(selectedStatus === 'PENDING' || selectedStatus === 'RETURNED') && (
          <table>
            <thead>
              <tr>
                <th width={200}>DATE ASSIGNED</th>
                <th width={150}>CODE</th>
                <th width={300}>COURSE NAME</th>
                <th width={250}>STATUS</th>
                <th className={styles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? filteredRows.map((row, index) => (
                <tr key={index}>
                  <td width={200}>{row.date_assigned ? new Date(row.date_assigned).toLocaleDateString() : '-'}</td>
                  <td width={150}>{row.code}</td>
                  <td width={300}>{row.name}</td>
                  <td width={250}>
                    <div style={{ fontWeight: 500 }}>{getCourseStatusBadge(row.status)}</div>
                  </td>
                  <td className={styles.fill}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Link className={'actionLink'} to={getCourseLink(row)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: '#111827' }}
                      >
                        View <ChevronRight size={18} />
                      </Link>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); const rect = e.target.getBoundingClientRect(); setPopupPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right }); setStatusPopup(statusPopup === row.code ? null : row.code); }}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: '#f1f5f9', border: '1px solid #cbd5e1',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, color: '#64748b', fontSize: 14, fontWeight: 700,
                          }}
                          title="View approval status"
                        >
                          ?
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                    {selectedStatus === 'PENDING' ? 'All courses reviewed.' : 'No returned courses.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>

    {statusPopup && popupPos && (() => {
      const popupCourse = assignments.find(c => c.code === statusPopup)
      if (!popupCourse) return null
      return (
        <div
          style={{
            position: 'fixed', top: popupPos.top, right: popupPos.right, marginTop: 0,
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999,
            padding: '12px 0', minWidth: 220,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '0 14px 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>
            Approval Chain
          </div>
          {popupCourse.reviewers.map((r, i) => (
            <div key={i} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{r.role}</div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
                color: r.status === 'approved' ? '#047857' : r.status === 'pending' ? '#b45309' : r.status === 'returned' ? '#dc2626' : '#94a3b8',
                background: r.status === 'approved' ? '#ecfdf5' : r.status === 'pending' ? '#fffbeb' : r.status === 'returned' ? '#fef2f2' : '#f1f5f9',
              }}>
                {mapStatusToLabel(r.status)}
              </div>
            </div>
          ))}
          <div style={{ padding: '8px 14px 0', borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 8 }}>
            <button
              onClick={() => { setStatusPopup(null); setPopupPos(null); }}
              style={{ width: '100%', padding: '6px 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )
    })()}

    {previewFile && (
      <PDFViewerModal
        file={previewFile}
        kind="Syllabus"
        onClose={() => setPreviewFile(null)}
        onExport={(f) => {
          const a = document.createElement('a')
          a.href = f.file_url
          a.download = f.file_name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }}
      />
    )}
  </>
  )
}

export default ApprovalCoursesTable
