import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, Inbox } from 'react-feather'
import SkeletonA from '../layouts/SkeletonA.jsx'
import HeaderA from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import ApprovalCoursesTable from '../components/ApprovalCoursesTable.jsx'
import vpaaStyles from '../styles/VPAA.module.scss'
import { UserAccountsPanel } from './UserAccounts.jsx'
import { fetchJson } from '../utils/api.js'
import { loadReviewAssignments } from '../utils/reviewAssignments.js'
import { computeOverallStatus } from '../utils/assignmentStatus.js'
import { ScopedPeriodProvider, usePeriod } from '../../course-assignment/services/period.jsx'
import { DepartmentsAPI } from '../../course-assignment/services/api.js'
import { prettifyLabel } from '../../course-assignment/services/periodLabel.js'
import { partitionByArchive } from '../../course-assignment/services/statusPolicy.js'
import { resolveDeptLogo } from '../../course-assignment/services/deptLogos.js'
import PeriodSelector from '../../course-assignment/components/PeriodSelector.jsx'
import DepartmentRepositoryGrid from '../../course-assignment/components/DepartmentRepositoryGrid.jsx'
import LogoUploadModal from '../../course-assignment/components/LogoUploadModal.jsx'

const ACCENT = '#B91C1C'
const SLATE_900 = '#0F172A'
const SLATE_600 = '#475569'
const SLATE_500 = '#64748B'
const SLATE_200 = '#E2E8F0'

const parseTermFromPeriod = (period) => {
  const today = new Date()
  const fallbackYear = today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1
  if (!period) return { year: String(fallbackYear), sem: '1st Sem' }

  const syMatch = String(period.school_year || period.label || '').match(/(\d{4})/)
  const year = syMatch ? syMatch[1] : String(fallbackYear)

  const rawSem = String(period.semester || period.label || '').trim().toLowerCase()
  let sem = '1st Sem'
  if (rawSem.includes('summer') || rawSem === '3') sem = 'Summer'
  else if (rawSem.startsWith('2') || rawSem.includes('2nd') || rawSem.includes('second')) sem = '2nd Sem'

  return { year, sem }
}

const getCourseCode = (row) => {
  const pco = row.ProgramCourseOffering || {}
  const course = pco.Course || {}
  return course.course_no || course.code || course.course_id || pco.course_id || row.pc_offering_id || row.code || '-'
}

const rowMatchesDept = (row, dept) => {
  if (!dept) return false
  const pco = row.ProgramCourseOffering || {}
  const deptObj = pco.Department || pco.department || {}
  const rowDeptId = pco.dept_id ?? deptObj.dept_id ?? deptObj.id ?? pco.Program?.dept_id ?? null
  const targetId = dept.id ?? dept.dept_id ?? null
  if (targetId != null && rowDeptId != null && Number(rowDeptId) === Number(targetId)) return true

  const rowCode = String(row.department_code || deptObj.code || '').trim().toUpperCase()
  const targetCode = String(dept.code || '').trim().toUpperCase()
  if (targetCode && rowCode && rowCode === targetCode) return true

  const rowName = String(row.department_name || deptObj.name || '').trim().toLowerCase()
  const targetName = String(dept.name || '').trim().toLowerCase()
  if (targetName && rowName && rowName === targetName) return true

  return false
}

const dedupeLatestApproved = (rows) => {
  const byCourse = new Map()
  rows.forEach((r) => {
    if (computeOverallStatus(r).toUpperCase() !== 'APPROVED') return
    const key = getCourseCode(r)
    const rev = (r.ProgramCourseOffering || {}).revision_number || 1
    const prev = byCourse.get(key)
    const prevRev = prev ? ((prev.ProgramCourseOffering || {}).revision_number || 1) : -1
    if (rev > prevRev) byCourse.set(key, r)
  })
  return [...byCourse.values()]
}

const VPAAApprovedPlansRepository = () => {
  const { currentPeriod } = usePeriod()
  const [searchParams, setSearchParams] = useSearchParams()
  const periodId = currentPeriod && currentPeriod.id
  const periodLabel = currentPeriod ? prettifyLabel(currentPeriod.label) : null
  const { year: selectedYear, sem: selectedSem } = useMemo(
    () => parseTermFromPeriod(currentPeriod),
    [currentPeriod]
  )

  // Master active department list
  const [departments, setDepartments] = useState([])
  const [deptsLoading, setDeptsLoading] = useState(false)

  const refreshDepts = useCallback(() => {
    setDeptsLoading(true)
    DepartmentsAPI.list(periodId || undefined)
      .then((rows) => {
        const safe = Array.isArray(rows) ? rows : []
        setDepartments(partitionByArchive(safe, 'department').main)
      })
      .catch(() => setDepartments([]))
      .finally(() => setDeptsLoading(false))
  }, [periodId])

  useEffect(() => { refreshDepts() }, [refreshDepts])

  // Real Dean-approved learning plans for the selected term
  const [assignments, setAssignments] = useState([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [assignmentsError, setAssignmentsError] = useState(false)

  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true)
    setAssignmentsError(false)
    try {
      const rows = await loadReviewAssignments(fetchJson, selectedYear, selectedSem)
      setAssignments(rows)
    } catch (err) {
      console.error('Error loading VPAA approved learning plans:', err)
      setAssignments([])
      setAssignmentsError(true)
    } finally {
      setAssignmentsLoading(false)
    }
  }, [selectedYear, selectedSem])

  useEffect(() => { loadAssignments() }, [loadAssignments])

  // Per-department approved learning plan counts (deduplicated to latest revision per course)
  const counts = useMemo(() => {
    const map = {}
    departments.forEach((dept) => {
      const deptRows = assignments.filter((row) => rowMatchesDept(row, dept))
      map[dept.code] = dedupeLatestApproved(deptRows).length
    })
    return map
  }, [departments, assignments])

  const totalApproved = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts]
  )

  // Drill-down state persisted in ?dept=<CODE> so returning from a learning plan preserves context
  const deptParam = searchParams.get('dept') || ''
  const selectedDept = useMemo(() => {
    if (!deptParam) return null
    const upper = deptParam.trim().toUpperCase()
    return departments.find((d) => String(d.code || '').trim().toUpperCase() === upper) || null
  }, [deptParam, departments])

  const [animKey, setAnimKey] = useState(0)
  const goToDept = (dept) => {
    const next = new URLSearchParams(searchParams)
    next.set('dept', dept.code)
    setSearchParams(next, { replace: false })
    setAnimKey((k) => k + 1)
  }
  const backToGrid = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('dept')
    setSearchParams(next, { replace: false })
    setAnimKey((k) => k + 1)
  }

  // Logo editor modal state
  const [logoDept, setLogoDept] = useState(null)
  const [logoBump, setLogoBump] = useState(0)

  const selectedDeptLogo = useMemo(
    () => (selectedDept ? resolveDeptLogo(selectedDept.code) : null),
    [selectedDept, logoBump]
  )
  const selectedDeptCount = selectedDept ? (counts[selectedDept.code] || 0) : totalApproved

  return (
    <div style={{
      padding: '24px 30px',
      background: '#FFFFFF',
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {selectedDept && (
            <button
              type="button"
              onClick={backToGrid}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: SLATE_500, fontSize: 12, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: 0, marginBottom: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT }}
              onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500 }}
            >
              <ChevronLeft size={14} /> All Departments
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selectedDept && selectedDeptLogo && (
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#FFFFFF', border: '1px solid ' + SLATE_200,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                <img
                  src={selectedDeptLogo}
                  alt={`${selectedDept.code} logo`}
                  style={{ maxWidth: '86%', maxHeight: '86%', objectFit: 'contain' }}
                />
              </div>
            )}
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: SLATE_900 }}>
              {selectedDept
                ? `Approved Learning Plans · ${selectedDept.code || selectedDept.name}`
                : 'Approved Learning Plans'}
            </h2>
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: SLATE_600 }}>
            {selectedDept
              ? `${selectedDept.name || ''} · Showing learning plans approved for ${periodLabel || `SY ${selectedYear}-${Number(selectedYear) + 1}`}.`
              : 'Approved learning plan submissions, organized by department. Click a card to view its learning plans.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: SLATE_500, fontWeight: 500,
            background: '#FFFFFF', border: '1px solid ' + SLATE_200,
            borderRadius: 9999, padding: '6px 12px',
          }}>
            <Inbox size={12} />
            <strong style={{ color: SLATE_900 }}>{selectedDeptCount}</strong>{' '}
            approved {selectedDeptCount === 1 ? 'plan' : 'plans'} this term
          </div>
        </div>
      </div>

      {/* Term selector matching the VPAA Course Assignment pages */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PeriodSelector prominent />
      </div>

      {/* Body — cross-fades between Department Grid and Department's Approved Learning Plans */}
      <div
        key={selectedDept ? `dept-${selectedDept.code}-${animKey}` : `grid-${animKey}`}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          animation: 'ovpaaRepoFade 220ms ease',
        }}
      >
        {!selectedDept ? (
          <DepartmentRepositoryGrid
            departments={departments}
            counts={counts}
            onOpen={goToDept}
            onInsertLogo={(d) => setLogoDept(d)}
            logoRefreshKey={logoBump}
            unitLabel={{ singular: 'plan', plural: 'plans' }}
            emptyMessage={
              deptsLoading
                ? 'Loading departments…'
                : 'Add departments on the Department List page to populate this repository.'
            }
          />
        ) : (
          <ApprovalCoursesTable
            role="vpaa"
            embedded
            department={selectedDept}
            externalYear={selectedYear}
            externalSem={selectedSem}
            externalAssignments={assignments}
            externalLoading={assignmentsLoading}
            externalError={assignmentsError}
            onReload={loadAssignments}
            styleHooks={{
              root: vpaaStyles.courseList,
              header: vpaaStyles.courseHeader,
              filters: vpaaStyles.courseFilters,
            }}
          />
        )}
      </div>

      {/* Editable department logo modal */}
      {logoDept && (
        <LogoUploadModal
          dept={logoDept}
          departments={departments}
          onClose={() => setLogoDept(null)}
          onSaved={() => setLogoBump((n) => n + 1)}
        />
      )}

      <style>{
        '@keyframes ovpaaRepoFade {' +
        '  from { opacity: 0; transform: translateY(6px); }' +
        '  to   { opacity: 1; transform: translateY(0);   }' +
        '}'
      }</style>
    </div>
  )
}

const VPAA = () => {
  const [params] = useSearchParams()
  // ?page=User Accounts: the account administration (feature/course-assignment); otherwise the approved plans repository.
  const accounts = params.get('page') === 'User Accounts'
  return (
    <SkeletonA
      header={<HeaderA role="VPAA" />}
      nav={<SideNavigation mode="vpaa" />}
      content={accounts ? <UserAccountsPanel /> : (
        <ScopedPeriodProvider>
          <div className={vpaaStyles.container}>
            <VPAAApprovedPlansRepository />
          </div>
        </ScopedPeriodProvider>
      )}
    />
  )
}

export default VPAA
