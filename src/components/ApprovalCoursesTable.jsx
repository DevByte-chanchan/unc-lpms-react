import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass'
import { ChevronRight, Download } from 'react-feather'
import { getWorkflow } from '../utils/workflowHelpers'
import { syllabiData, getSyllabusByCode } from '../data/syllabiData.js'
import PDFViewerModal from './PDFViewerModal'

const getProgram = (code) => {
  if (code && code.startsWith('IT ')) return 'Information Technology';
  return 'Computer Science';
};

const ApprovalCoursesTable = ({ role = 'approver' }) => {
  const currentYear = new Date().getFullYear()
  const startYear = 2000
  const semOptions = ['1st Sem', '2nd Sem']

  const yearOptions = []
  for (let i = currentYear; i >= startYear; i--) {
    yearOptions.push(<option key={i} value={i}>{i}</option>)
  }

  const fmt = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  }

  const baseCourses = syllabiData.map(s => ({
    code: s.code,
    name: s.name,
    program: getProgram(s.code),
    lastUpdated: s.update || 'TBA',
    instructor: 'Danny Casimero'
  }))

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

  const getOverallStatus = (courseCode) => {
    const wf = getWorkflow(courseCode)
    if (wf.currentStage === 'approved') return 'APPROVED'
    if (wf.currentStage === 'returned') return 'RETURNED'
    if (wf.currentStage === 'submitted') return 'DRAFT'
    return 'PENDING'
  }

  const [tick, setTick] = useState(0)
  React.useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(interval)
  }, [])

  const Courses = useMemo(() => {
    return baseCourses
      .map(c => ({
        ...c,
        status: getOverallStatus(c.code),
        reviewers: getReviewerStatuses(c.code)
      }))
      .filter(c => c.status !== 'DRAFT')
  }, [tick])

  const [selectedStatus, setSelectedStatus] = useState('PENDING')
  const handleStatusChange = (e) => setSelectedStatus(e.target.value)
  const [previewFile, setPreviewFile] = useState(null)

  const getSyllabusData = (courseCode) => {
    return getSyllabusByCode(courseCode) || {
      code: courseCode,
      name: 'Unknown Course',
      credits: '',
      contact: '',
      prerequisites: '',
      class: '',
      cmo: '',
      revision: '0',
      year: '',
      sem: '',
      description: '',
      courseOutcomes: [],
      references: [],
      gradingSystem: [],
      ilos: [],
      topics: []
    }
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

  const getCourseLink = (course, statusParam) => {
    const base = `/role/${role}/courses/${encodeURIComponent(course.code)}`
    return statusParam ? `${base}?status=${encodeURIComponent(statusParam)}` : base
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

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'approved' || s === 'done') return { color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }
    if (s === 'pending') return { color: '#b45309', background: '#fffbeb', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }
    if (s === 'waiting') return { color: '#9ca3af', fontSize: 12 }
    if (s === 'revision' || s === 'returned') return { color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }
    return {}
  }

  const getCourseStatusBadge = (statusKey) => {
    switch (statusKey) {
      case 'APPROVED': return <span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>Approved</span>
      case 'PENDING': return <span style={{ color: '#b45309', background: '#fffbeb', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>Pending</span>
      case 'RETURNED': return <span style={{ color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>Returned</span>
      default: return <span style={{ color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>Draft</span>
    }
  }

  const pendingCourses = Courses.filter(r => r.status === 'PENDING' || r.status === 'RETURNED')
  const approvedCourses = Courses.filter(r => r.status === 'APPROVED')

  const [statusPopup, setStatusPopup] = useState(null);
  const [popupPos, setPopupPos] = useState(null);

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
        <div className={'filter-container'}>
          <p>Filter by <strong>Status</strong>:</p>
          <select onChange={handleStatusChange} value={selectedStatus}>
            <option value="PENDING">For Review ({pendingCourses.length})</option>
            <option value="APPROVED">Approved ({approvedCourses.length})</option>
          </select>
        </div>
      </div>

      <div className={styles['table-container']}>
        <table>
          <thead>
            <tr>
              <th width={150}>CODE</th>
              <th width={220}>COURSE NAME</th>
              <th width={140}>PROGRAM</th>
              <th width={140}>LAST UPDATED</th>
              <th width={120}>STATUS</th>
              <th className={styles.fill} style={{ background: '#edeff2', position: 'sticky', right: 0, zIndex: 2 }}></th>
            </tr>
          </thead>
          <tbody>
            {(selectedStatus === 'PENDING' ? pendingCourses : approvedCourses).length > 0 ? (
              (selectedStatus === 'PENDING' ? pendingCourses : approvedCourses).map((row, i) => (
                <tr key={i}>
                  <td width={150}>{row.code}</td>
                  <td width={220}>{row.name}</td>
                  <td width={140}>{row.program}</td>
                  <td width={140}>{row.lastUpdated}</td>
                  <td width={120}>{getCourseStatusBadge(row.status)}</td>
                  <td className={styles.fill} style={{ background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                      {selectedStatus === 'APPROVED' && (role === 'dean' || role === 'instructor') && (
                        <button
                          onClick={() => openPreview(row)}
                          className={'actionLink'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: 13, fontWeight: 500, color: '#111827' }}
                        >
                          Export <Download size={16} />
                        </button>
                      )}
                      <Link className={'actionLink'} to={getCourseLink(row, selectedStatus === 'APPROVED' ? 'approved' : undefined)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: '#111827' }}
                      >
                        View <ChevronRight size={16} />
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
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                  {selectedStatus === 'PENDING' ? 'All courses have been approved!' : 'No approved courses yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    {statusPopup && popupPos && (() => {
      const popupCourse = Courses.find(c => c.code === statusPopup)
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
