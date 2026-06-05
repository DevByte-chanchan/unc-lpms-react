import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import SkeletonA from '../layouts/SkeletonA.jsx'
import HeaderA from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import { Search, Package, Layers, Calendar, ChevronRight, Download } from 'react-feather'
import { getWorkflow } from '../utils/workflowHelpers'
import { syllabiData, getSyllabusByCode } from '../data/syllabiData.js'
import { exportSyllabusToPDF } from '../utils/pdfExport'
import oicStyles from '../styles/OICOVPAA.module.scss'
import tableStyles from '../styles/CoursesTable.module.sass'

const OICOVPAA = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(interval)
  }, [])

  const currentYear = new Date().getFullYear()
  const yearOptions = []
  for (let i = currentYear; i >= 2000; i--) {
    yearOptions.push(<option key={i} value={i}>{i}</option>)
  }
  const semOptions = ['1st Sem', '2nd Sem']

  const approvedCourses = useMemo(() => {
    return syllabiData
      .filter(s => getWorkflow(s.code).currentStage === 'approved')
      .map(s => {
        const wf = getWorkflow(s.code)
        return {
          code: s.code,
          name: s.name,
          submittedDate: wf.submittedAt
            ? new Date(wf.submittedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
            : '',
          approvedDate: wf.dean?.completedAt
            ? new Date(wf.dean.completedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
            : '',
        }
      })
  }, [tick])

  const filtered = useMemo(() => {
    if (!searchTerm) return approvedCourses
    const q = searchTerm.toLowerCase()
    return approvedCourses.filter(c =>
      c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    )
  }, [approvedCourses, searchTerm])

  const generatePDF = (course) => {
    const syllabus = getSyllabusByCode(course.code)
    if (syllabus) exportSyllabusToPDF(syllabus, course.code)
  }

  const stats = {
    total: approvedCourses.length,
    bySemester: { '1st': approvedCourses.length, '2nd': 0 }
  }

  const getStatusBadgeStyle = () => {
    return { color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }
  }

  return (
    <SkeletonA
      header={<HeaderA role="OIC-OVPAA" name="GARCIA, CARLOS" />}
      nav={<SideNavigation mode="oic-ovpaa" />}
      content={
        <div className={oicStyles.container}>
          {/* Title with year/sem dropdowns */}
          <div className={tableStyles.header}>
            <h2 style={{ margin: 0, fontWeight: 600, fontSize: 20, color: 'black' }}>APPROVED COURSES</h2>
            <div className={tableStyles.filterA}>
              <select className={tableStyles['header-select']}>
                {yearOptions}
              </select>
              <select className={tableStyles['header-select']}>
                {semOptions.map(sem => <option key={sem} value={sem}>{sem}</option>)}
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className={oicStyles.statsGrid}>
            <div className={oicStyles.statCard}>
              <div className={`${oicStyles.statIconWrap} ${oicStyles.statIconBlue}`}>
                <Package size={20} />
              </div>
              <div className={oicStyles.statContent}>
                <div className={oicStyles.statValue}>{stats.total}</div>
                <div className={oicStyles.statLabel}>Total Approved</div>
              </div>
            </div>
            <div className={oicStyles.statCard}>
              <div className={`${oicStyles.statIconWrap} ${oicStyles.statIconGreen}`}>
                <Layers size={20} />
              </div>
              <div className={oicStyles.statContent}>
                <div className={oicStyles.statValue}>{stats.bySemester['1st']}</div>
                <div className={oicStyles.statLabel}>1st Semester</div>
              </div>
            </div>
            <div className={oicStyles.statCard}>
              <div className={`${oicStyles.statIconWrap} ${oicStyles.statIconTeal}`}>
                <Calendar size={20} />
              </div>
              <div className={oicStyles.statContent}>
                <div className={oicStyles.statValue}>{stats.bySemester['2nd']}</div>
                <div className={oicStyles.statLabel}>2nd Semester</div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className={oicStyles.controlsBar}>
            <div className={oicStyles.searchWrapper} style={{ maxWidth: 'none', flex: 1 }}>
              <Search size={16} className={oicStyles.searchIconSvg} />
              <input
                type="text"
                placeholder="Search by course code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={oicStyles.searchInput}
              />
            </div>
          </div>

          {/* Table - same as other approvers approved view */}
          <div className={tableStyles['table-container']}>
            <table>
              <thead>
                <tr>
                  <th width={150}>CODE</th>
                  <th width={220}>COURSE NAME</th>
                  <th width={140}>DATE SUBMITTED</th>
                  <th width={140}>DATE APPROVED</th>
                  <th width={140}>STATUS</th>
                  <th width={120}>EXPORT</th>
                  <th className={tableStyles.fill}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((row, i) => (
                  <tr key={row.code}>
                    <td width={150}>{row.code}</td>
                    <td width={220}>{row.name}</td>
                    <td width={140}>{row.submittedDate}</td>
                    <td width={140}>{row.approvedDate}</td>
                    <td width={140}>
                      <span style={getStatusBadgeStyle('approved')}>Approved</span>
                    </td>
                    <td width={120}>
                      <button
                        onClick={() => generatePDF(row)}
                        className="actionLink"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Export <Download size={18} />
                      </button>
                    </td>
                    <td className={tableStyles.fill}>
                      <a
                        href="javascript:void(0)"
                        onClick={() => navigate(`/role/oic-ovpaa/courses/${encodeURIComponent(row.code)}?status=approved`)}
                        className="actionLink"
                      >
                        View <ChevronRight size={18} />
                      </a>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                      No approved courses yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      }
    />
  )
}

export default OICOVPAA
