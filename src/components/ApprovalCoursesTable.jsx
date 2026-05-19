import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass'
import { ChevronRight, Download } from 'react-feather'
import { getWorkflow } from '../utils/workflowHelpers'
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
    const syllabus = getSyllabusData(course.code)
    
    const calculateTotal = (period) => {
      let total = 0
      syllabus.gradingSystem.forEach(group => {
        if (group.ilos) {
          group.ilos.forEach(ilo => {
            total += Number(ilo.weight?.[period] || 0)
          })
        }
      })
      return total
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${course.code}_syllabus_report</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; line-height: 1.4; }
          h1 { color: #1e3a5f; font-size: 18pt; border-bottom: 3px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 15px; text-align: center; }
          h2 { color: #1e3a5f; font-size: 13pt; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #9ca3af; padding-bottom: 5px; }
          .section { margin-bottom: 20px; page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          tr { page-break-inside: avoid; }
          th { background-color: #1e3a5f; color: white; padding: 8px; text-align: left; font-size: 9pt; font-weight: bold; border: 1px solid #1e3a5f; }
          td { padding: 6px 8px; border: 1px solid #ddd; font-size: 9pt; vertical-align: top; }
          .course-details-table th { background-color: #f3f4f6; color: #374151; font-weight: 600; width: 30%; }
          .center { text-align: center; }
          .bold { font-weight: 600; }
          .legend { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin-bottom: 15px; font-size: 9pt; }
          .total-row td { background-color: #e5e7eb !important; border-top: 2px solid #1e3a5f; }
          .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 8pt; color: #6b7280; text-align: center; }
        </style>
      </head>
      <body>
        <h1>COURSE SYLLABUS</h1>
        <div class="section">
          <h2>Course Details</h2>
          <table class="course-details-table">
            <tr><th>Course No.</th><td>${syllabus.code}</td></tr>
            <tr><th>Course Title</th><td class="bold">${syllabus.name}</td></tr>
            <tr><th>Credit</th><td>${syllabus.credits}</td></tr>
            <tr><th>Contact Hours/Week</th><td>${syllabus.contact}</td></tr>
            <tr><th>Pre-requisites</th><td>${syllabus.prerequisites}</td></tr>
            <tr><th>Year Level</th><td>${syllabus.year}</td></tr>
            <tr><th>Term</th><td>${syllabus.sem}</td></tr>
          </table>
        </div>
        <div class="section">
          <h2>Course and Program Outcome Alignment</h2>
          <div class="legend"><strong>Legend:</strong> I – Introductory | E – Enabling | D – Demonstrative</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">After completion of the course, the student should be able to:</th>
                ${['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'].map(po => 
                  `<th class="center" style="width: 6%;">${po}</th>`
                ).join('')}
              </tr>
            </thead>
            <tbody>
              ${syllabus.courseOutcomes.map(co => `
                <tr>
                  <td><strong>${co.id}:</strong> ${co.description}</td>
                  ${co.poMappings.map(mapping => `<td class="center">${mapping}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="section">
          <h2>References</h2>
          <table>
            <thead><tr><th>ID</th><th>TITLE</th><th>AUTHOR/S</th><th>YEAR</th></tr></thead>
            <tbody>
              ${syllabus.references.map((ref, i) => `
                <tr><td class="center">${ref.id}</td><td>${ref.title}</td><td>${ref.authors}</td><td class="center">${ref.year}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="section">
          <h2>Criteria for Grading</h2>
          <table>
            <thead>
              <tr>
                <th rowspan="2">CO</th><th rowspan="2">ILO #</th><th rowspan="2">ASSESSMENTS</th>
                <th colspan="4" class="center">WEIGHT %</th><th rowspan="2">MIN PASSING %</th>
              </tr>
              <tr><th class="center">Prelim</th><th class="center">Midterm</th><th class="center">Semi</th><th class="center">Final</th></tr>
            </thead>
            <tbody>
              ${syllabus.gradingSystem.map(group => 
                group.ilos.map((ilo, index) => `
                  <tr>
                    ${index === 0 ? `<td rowspan="${group.ilos.length}" class="center bold">${group.co}</td>` : ''}
                    <td class="center bold">${ilo.id}</td>
                    <td>${Array.isArray(ilo.assessments) ? ilo.assessments.join(', ') : ilo.assessments}</td>
                    <td class="center">${ilo.weight?.prelim || ''}</td>
                    <td class="center">${ilo.weight?.midterm || ''}</td>
                    <td class="center">${ilo.weight?.semi || ''}</td>
                    <td class="center">${ilo.weight?.final || ''}</td>
                    <td class="center">${ilo.minPassing}</td>
                  </tr>
                `).join('')
              ).join('')}
              <tr class="total-row">
                <td colspan="3" class="center">TOTAL</td>
                <td class="center">${calculateTotal('prelim')}%</td>
                <td class="center">${calculateTotal('midterm')}%</td>
                <td class="center">${calculateTotal('semi')}%</td>
                <td class="center">${calculateTotal('final')}%</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Course Code: ${course.code} | ${course.name}</p>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '', 'width=1024,height=768')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.print()
    }, 500)
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
                <th width={350}>COURSE NAME</th>
                <th width={200}>DATE SUBMITTED</th>
                <th width={200}>DATE APPROVED</th>
                <th width={120}>STATUS</th>
                {role === 'dean' && <th width={100}>EXPORT</th>}
                <th className={styles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {approvedCourses.length > 0 ? approvedCourses.map((row, i) => (
                <tr key={i}>
                  <td width={150}>{row.code}</td>
                  <td width={350}>{row.name}</td>
                  <td width={200}>{row.submittedDate}</td>
                  <td width={200}>{row.approved}</td>
                  <td width={120}><span style={getStatusBadgeStyle('approved')}>Approved</span></td>
                  {role === 'dean' && (
                    <td width={100}>
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
                <th width={350}>COURSE NAME</th>
                <th width={200}>DATE SUBMITTED</th>
                <th className={styles.status} width={800}>STATUS</th>
                <th className={styles.fill}></th>
              </tr>
              <tr className={styles['sub-column']}>
                <th width={150}></th>
                <th width={350}></th>
                <th width={200}></th>
                {reviewerRoles.map((roleName, idx) => (
                  <th key={idx} className={styles.lighten} width={200}>{roleName}</th>
                ))}
                <th className={styles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {pendingCourses.length > 0 ? pendingCourses.map((row, i) => {
                return (
                  <tr key={i}>
                    <td width={150}>{row.code}</td>
                    <td width={350}>{row.name}</td>
                    <td width={200}>{row.submittedDate}</td>

                    {row.reviewers.map((r, idx) => {
                      const isDean = r.role.toLowerCase() === 'dean'
                      if (isDean) {
                        const firstThreeApproved = row.reviewers
                          .slice(0, 3)
                          .every(rr => rr.status.toLowerCase() === 'approved')
                        return (
                          <td key={idx} className={styles.lighten} width={200}>
                            <span style={getStatusBadgeStyle(firstThreeApproved ? r.status : 'waiting')}>
                              {firstThreeApproved ? mapStatusToLabel(r.status) : '—'}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={idx} className={styles.lighten} width={200}>
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