import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass'
import { ChevronRight, Download } from 'react-feather'
import { getWorkflow } from '../utils/workflowHelpers'
import { exportSyllabusToPDF } from '../utils/pdfExport';
import { syllabiData, getSyllabusByCode } from '../data/syllabiData.js'

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

  // ── COURSE DATA ─────────────────────────────────────────────────────
  // All courses from unified syllabiData — statuses derived live from workflow
  const baseCourses = syllabiData.map(s => ({
    code: s.code,
    name: s.name,
    instructor: 'Danny Casimero'
  }))

  // ── DERIVE STATUS FROM WORKFLOW ─────────────────────────────────────
  const getReviewerStatuses = (courseCode) => {
    const wf = getWorkflow(courseCode)
    const stage = wf.currentStage || 'submitted'

    const mapStatus = (raw, activeStages) => {
      if (raw === 'done') return 'approved'
      if (raw === 'returned') return 'returned'
      return activeStages ? 'pending' : 'waiting'
    }

    const libStatus = mapStatus(wf.parallelReview?.library_director?.status, stage === 'parallel_review' || stage === 'program_head' || stage === 'dean' || stage === 'approved')
    const icStatus = mapStatus(wf.parallelReview?.industry_consultant?.status, stage === 'parallel_review' || stage === 'program_head' || stage === 'dean' || stage === 'approved')
    const phStatus = mapStatus(wf.programHead?.status, stage === 'program_head')
    const deanStatus = mapStatus(wf.dean?.status, stage === 'dean')

    return [
      { role: 'Director of Libraries', name: 'Maria Santos', status: libStatus, completedAt: wf.parallelReview?.library_director?.completedAt },
      { role: 'Industry Consultant', name: 'Roberto Cruz', status: icStatus, completedAt: wf.parallelReview?.industry_consultant?.completedAt },
      { role: 'Program Head', name: 'Junar Danila', status: phStatus, completedAt: wf.programHead?.completedAt },
      { role: 'Dean', name: 'Agnes Reyes', status: deanStatus, completedAt: wf.dean?.completedAt },
    ]
  }

  const getOverallStatus = (courseCode) => {
    const wf = getWorkflow(courseCode)
    if (wf.currentStage === 'approved') return 'APPROVED'
    if (wf.currentStage === 'returned') return 'RETURNED'
    if (wf.currentStage === 'submitted') return 'DRAFT'
    return 'PENDING'
  }

  const getSubmittedDate = (courseCode) => {
    const wf = getWorkflow(courseCode)
    return fmt(wf.submittedAt)
  }

  const getApprovedDate = (courseCode) => {
    const wf = getWorkflow(courseCode)
    if (wf.currentStage === 'approved') return fmt(wf.dean?.completedAt)
    return ''
  }

  // Force re-render on interval to catch workflow changes
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
        submittedDate: getSubmittedDate(c.code),
        approved: getApprovedDate(c.code),
        reviewers: getReviewerStatuses(c.code)
      }))
      .filter(c => c.status !== 'DRAFT')
  }, [tick])

  const [selectedStatus, setSelectedStatus] = useState('PENDING')
  const handleStatusChange = (e) => setSelectedStatus(e.target.value)

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

  const generatePDF = (course) => {
    const syllabus = getSyllabusByCode(course.code)
    if (syllabus) {
      exportSyllabusToPDF(syllabus, course.code)
    }
  }

  const getCourseLink = (course, statusParam) => {
    const base = `/role/${role}/courses/${encodeURIComponent(course.code)}`
    return statusParam ? `${base}?status=${encodeURIComponent(statusParam)}` : base
  }

  const reviewerRoles = ['Director of Libraries', 'Industry Consultant', 'Program Head', 'Dean']

  const mapStatusToLabel = (status) => {
    if (!status) return ''
    const s = status.toLowerCase()
    if (s === 'approved' || s === 'done') return 'Approved'
    if (s === 'pending') return 'Pending'
    if (s === 'waiting') return '—'
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

  const pendingCourses = Courses.filter(r => r.status === 'PENDING' || r.status === 'RETURNED')
  const approvedCourses = Courses.filter(r => r.status === 'APPROVED')

  return (
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
        {selectedStatus === 'APPROVED' && (
          <table>
            <thead>
                <tr>
                  <th width={150}>CODE</th>
                  <th width={220}>COURSE NAME</th>
                  <th width={140}>DATE SUBMITTED</th>
                  <th width={140}>DATE APPROVED</th>
                  <th width={140}>STATUS</th>
                  {role === 'dean' && <th width={120}>EXPORT</th>}
                  <th className={styles.fill}></th>
                </tr>
              </thead>
              <tbody>
                {approvedCourses.length > 0 ? approvedCourses.map((row, i) => (
                  <tr key={i}>
                    <td width={150}>{row.code}</td>
                    <td width={220}>{row.name}</td>
                    <td width={140}>{row.submittedDate}</td>
                    <td width={140}>{row.approved}</td>
                    <td width={140}><span style={getStatusBadgeStyle('approved')}>Approved</span></td>
                    {role === 'dean' && (
                      <td width={120}>
                      <button 
                        onClick={() => generatePDF(row)}
                        className={'actionLink'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Export <Download size={18} />
                      </button>
                    </td>
                  )}
                  <td className={styles.fill}>
                    <Link className={'actionLink'} to={getCourseLink(row, 'approved')}>
                      View <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={role === 'dean' ? 7 : 6} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No approved courses yet</td></tr>
              )}
            </tbody>
          </table>
        )}

        {selectedStatus === 'PENDING' && (
          <table>
            <thead>
              <tr>
                <th width={150}>CODE</th>
                <th width={250}>COURSE NAME</th>
                <th width={140}>DATE SUBMITTED</th>
                <th className={styles.status} width={650}>STATUS</th>
                <th className={styles.fill}></th>
              </tr>
              <tr className={styles['sub-column']}>
                <th width={150}></th>
                <th width={250}></th>
                <th width={140}></th>
                {reviewerRoles.map((roleName, idx) => (
                  <th key={idx} className={styles.lighten} width={162.5}>{roleName}</th>
                ))}
                <th className={styles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {pendingCourses.length > 0 ? pendingCourses.map((row, i) => {
                return (
                  <tr key={i}>
                    <td width={150}>{row.code}</td>
                    <td width={250}>{row.name}</td>
                    <td width={140}>{row.submittedDate}</td>

                    {row.reviewers.map((r, idx) => {
                      const isDean = r.role.toLowerCase() === 'dean'
                      if (isDean) {
                        const firstThreeApproved = row.reviewers
                          .slice(0, 3)
                          .every(rr => rr.status.toLowerCase() === 'approved')
                        return (
                          <td key={idx} className={styles.lighten} width={162.5}>
                            <span style={getStatusBadgeStyle(firstThreeApproved ? r.status : 'waiting')}>
                              {firstThreeApproved ? mapStatusToLabel(r.status) : '—'}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={idx} className={styles.lighten} width={162.5}>
                          <span style={getStatusBadgeStyle(r.status)}>
                            {mapStatusToLabel(r.status)}
                          </span>
                        </td>
                      )
                    })}

                    <td className={styles.fill}>
                      <Link className={'actionLink'} to={getCourseLink(row)}>
                        View <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>All courses have been approved!</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ApprovalCoursesTable