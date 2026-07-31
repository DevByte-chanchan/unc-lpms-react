import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Link, useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, MessageSquare, Inbox, Download, MoreVertical, Check, Clock } from 'react-feather'
import styles from '../styles/ApprovalSyllabusSections.module.sass'
import subStyles from '../styles/SyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass'
import stylesC from '../styles/SyllabusSections.module.sass'
import ApprovalCommentBox from './ApprovalCommentBox.jsx'
import { getWorkflow, setWorkflow, advanceWorkflow } from '../utils/workflowHelpers'
import { getSuggestions, addSuggestion, acceptSuggestion, rejectSuggestion, getSyllabus } from '../utils/dataStore'
import { getReferences, getReferenceById } from '../utils/referenceLibrary'
import { normalizeRoleKey } from '../utils/approvalHelpers.js'
import { fetchJson } from "../utils/api.js"
import { seedDummyComments } from "../utils/seedDummyComments.js"

import Revisions from './Revisions.jsx'
import PDFViewerModal from './PDFViewerModal'
import { buildSyllabusHtml } from "../utils/syllabusPdfHtml.js"
import unclogo from '../assets/unclogo.png'
import CourseCoverage from './CourseCoverage'
import ReferenceSummary from './ReferenceSummary'
import OutcomeAlignment from './OutcomeAlignment'
import CriteriaForGrading from './CriteriaForGrading'



const sectionLabels = {
  'Course Details': 'Course Details',
  'Course and Program Outcome Alignment': 'Course and Program Outcome Alignment',
  'Course Coverage': 'Course Coverage',
  'References Summary': 'References',
  'Criteria for Grading': 'Criteria for Grading',
}
const defaultSections = Object.keys(sectionLabels)

const ApprovalSyllabusSections = ({ status = 'pending', currentRole = '', courseCode = '', embedded = false, externalSelectedSection = null, workflow: workflowProp = null, pcId = null, revNum = null }) => {
  const [searchParams] = useSearchParams()
  const [selectedSection, setSelectedSection] = useState(defaultSections[0])
  const statusParam = searchParams.get('status')
  const effectiveFromUrl = (statusParam || status || '').toLowerCase()
  const fallbackStage = (() => { try { const wf = getWorkflow(courseCode || ''); return wf?.currentStage || '' } catch { return '' } })()
  const effectiveStatus = effectiveFromUrl || fallbackStage || 'submitted'
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [isRevisionsOpen, setIsRevisionsOpen] = useState(false)

  const [showCommentModal, setShowCommentModal] = useState(false)
  const [readOnlyCommentModal, setReadOnlyCommentModal] = useState(false)
  const [workflowState, setWorkflowState] = useState(() => workflowProp || getWorkflow(courseCode || ''))
  // Approve confirmation flow (matches the instructor's submit modal):
  // IDLE → CONFIRM → WAITING (undo countdown) → DONE
  const [approvePhase, setApprovePhase] = useState('IDLE')
  const [approveTimeLeft, setApproveTimeLeft] = useState(5)
  const approveTimerRef = useRef(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const [globalComments, setGlobalComments] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Shared export routine so the Export action can live both as a standalone
  // button and inside the "more" dropdown stack (next to Revisions).
  const runExport = async () => {
    setExportingPdf(true)
    try {
      const logoUrl = new URL(unclogo, window.location.origin).href
      const wf = getWorkflow(codeToUse)
      const html = buildSyllabusHtml(syllabus, codeToUse, wf, logoUrl)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      setPreviewFile({
        file_url: url,
        file_name: `Syllabus_${codeToUse}.html`,
        instructor_name: syllabus?.instructor || '—',
        course_id: codeToUse,
        course_name: syllabus?.name || '',
        submission_date: syllabus?.update || '',
        period_label: (syllabus?.year || '') + ' — ' + (syllabus?.sem || ''),
      })
    } catch (err) {
      console.warn('Export generation failed:', err)
      alert('Failed to generate export: ' + (err?.message || err))
    } finally {
      setExportingPdf(false)
    }
  }

  const [cpaData, setCpaData] = useState({ course: { code: '', title: '' }, programOutcomes: [], courseOutcomes: [] })
  const [cpaLoading, setCpaLoading] = useState(false)
  const [cpaError, setCpaError] = useState(null)
  const [courseDetails, setCourseDetails] = useState(null)
  const [courseDetailsLoading, setCourseDetailsLoading] = useState(true)
  const [coverageData, setCoverageData] = useState(null)
  const [coverageLoading, setCoverageLoading] = useState(false)
  const [criteriaData, setCriteriaData] = useState(null)
  const [criteriaLoading, setCriteriaLoading] = useState(false)
  const [refData, setRefData] = useState(null)
  const [refLoading, setRefLoading] = useState(false)

  // refs to sections for auto-scroll (coverage + references still inline)
  const courseDetailsRef = useRef(null)
  const alignmentRef = useRef(null)
  const criteriaRef = useRef(null)
  const coverageRef = useRef(null)
  const referencesRef = useRef(null)
  const containerRef = useRef(null)

  const { code: routeCode } = useParams();
  const codeToUse = routeCode || courseCode
  const validPcId = pcId && !Number.isNaN(Number(pcId)) && String(Number(pcId)) === String(pcId) ? pcId : null
  const validRevNum = revNum && !Number.isNaN(Number(revNum)) && String(Number(revNum)) === String(revNum) ? revNum : null

  const initialLoading = !codeToUse || (validPcId && validRevNum && courseDetailsLoading && courseDetails === null)

  const toggleMenu = (event) => {
    event.stopPropagation()
    setIsOpen(prev => !prev)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value)
  }

  // Normalize the workflow stage on load (e.g. returned → dean once all
  // parallel reviewers have re-accepted) so button gating reflects reality
  // without waiting for someone to perform another action.
  useEffect(() => {
    if (!codeToUse) return
    try {
      const wf = advanceWorkflow(codeToUse)
      if (wf) setWorkflowState(wf)
    } catch (e) { /* non-fatal */ }
  }, [codeToUse, refreshKey])

  useEffect(() => {
    try {
      // Sweep any leftover demo seed comments (all courses), then load real ones
      seedDummyComments()

      const refreshed = JSON.parse(localStorage.getItem('approval_comments_v1') || '[]')
      const courseComments = (Array.isArray(refreshed) ? refreshed : []).filter(c => c.courseCode === codeToUse)
      setGlobalComments(courseComments)
    } catch (e) {
      setGlobalComments([])
    }
  }, [codeToUse, refreshKey])

  // Merge server-side comments into localStorage so approvers see the same comments as the instructor.
  // Fetches by course code (works even without pcId/revNum in the URL) and keeps
  // CO/ILO/target connections from the enriched endpoint.
  useEffect(() => {
    if (!codeToUse) return
    let mounted = true

    const roleToLabel = {
      'INDUSTRY_CONSULTANT': 'Industry Consultant',
      'DIRECTOR_OF_LIBRARIES': 'Director of Libraries',
      'PROGRAM_HEAD': 'Program Head',
      'DEAN': 'Dean',
      'INSTRUCTOR': 'Instructor',
    }
    const roleToName = {
      'INDUSTRY_CONSULTANT': 'CRUZ, ROBERTO',
      'DIRECTOR_OF_LIBRARIES': 'SANTOS, MARIA',
      'LIBRARY_DIRECTOR': 'SANTOS, MARIA',
      'PROGRAM_HEAD': 'DANILA, JUNAR',
      'DEAN': 'REYES, AGNES',
      'INSTRUCTOR': 'CASIMERO, DANNY',
    }
    const coverageMap = { 'references': 'References', 'topics': 'Topic', 'tlas': 'TLA' }

    async function syncServerComments() {
      try {
        const qs = validPcId ? `?pcId=${validPcId}` : ''
        const rows = await fetchJson(`/api/comments/by-course/${encodeURIComponent(codeToUse)}${qs}`)
        if (!mounted || !Array.isArray(rows) || rows.length === 0) return

        const raw = localStorage.getItem('approval_comments_v1') || '[]'
        const all = JSON.parse(raw)
        const list = Array.isArray(all) ? all : []
        // Content-based dedup: skip server rows whose text already exists as a
        // seed/manual comment for this course so the sidebar never shows duplicates.
        const existingTexts = new Set(
          list
            .filter(c => c.courseCode === codeToUse && !String(c.id || '').startsWith('server-'))
            .map(c => (c.comment || '').trim().toLowerCase())
        )

        const converted = rows
          .filter(r => {
            const full = (r.message || '').trim().toLowerCase()
            // server copies of DOL comments carry an appended suggestion line —
            // compare the base text too so they don't duplicate in the sidebar
            const base = (r.message || '').split('\n\nSuggested reference')[0].trim().toLowerCase()
            return !existingTexts.has(full) && !existingTexts.has(base)
          })
          .map(r => {
            const co = r.co_no ? `CO${r.co_no}` : null
            const ilo = r.co_no && r.ilo_no ? `CO${r.co_no}-ILO${r.ilo_no}` : null
            return {
              id: `server-${r.comment_id}`,
              courseCode: codeToUse,
              section: 'Course Coverage',
              submissionId: `server-${codeToUse}`,
              submissionLabel: 'Review Corrections',
              submittedAt: r.createdAt,
              createdAt: r.createdAt,
              reviewer: roleToName[r.commenter_role] || r.commenter_role,
              role: roleToLabel[r.commenter_role] || r.commenter_role,
              recipientRole: r.commenter_role === 'INSTRUCTOR' ? 'industry-consultant' : 'instructor',
              components: {},
              comment: r.message,
              courseOutcome: co,
              ilo,
              coverageType: coverageMap[r.comment_for] || null,
              coverageDetail: r.target_title || null,
              suggestedRefs: [],
              status: r.resolved_status ? 'resolved' : 'pending',
              resolved: !!r.resolved_status,
              resolvedAt: null,
            }
          })

        // Upsert: replace this course's previous server- entries so resolution
        // status changes made by the instructor stay in sync on reload.
        const others = list.filter(c => !(c.courseCode === codeToUse && String(c.id || '').startsWith('server-')))
        const merged = [...others, ...converted]
        localStorage.setItem('approval_comments_v1', JSON.stringify(merged))

        if (mounted) {
          setGlobalComments(merged.filter(c => c.courseCode === codeToUse))
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Server comment sync skipped:', e.message)
      }
    }

    syncServerComments()
    return () => { mounted = false }
  }, [validPcId, codeToUse, refreshKey])

  // load suggestions
  useEffect(() => {
    setSuggestions(getSuggestions(codeToUse))
  }, [codeToUse, refreshKey])

  // CPA data loading (Course & Program Outcome Alignment)
  useEffect(() => {
    if (!validPcId || !validRevNum) return;
    let mounted = true;
    async function fetchCPA() {
      setCpaLoading(true);
      setCpaError(null);
      try {
        const data = await fetchJson(`/api/course-outcome-alignment/${validPcId}/${validRevNum}`);
        if (!mounted) return;
        setCpaData({
          course: data.course ?? { code: '', title: '' },
          programOutcomes: data.programOutcomes ?? [],
          courseOutcomes: data.courseOutcomes ?? []
        });
      } catch (err) {
        if (!mounted) return;
        setCpaError(err.message);
      } finally {
        if (mounted) setCpaLoading(false);
      }
    }
    fetchCPA();
    return () => { mounted = false; };
  }, [validPcId, validRevNum]);

  // API load: Course Details
  useEffect(() => {
    if (!validPcId || !validRevNum) return;
    let mounted = true;
    async function fetchCourseDetails() {
      setCourseDetailsLoading(true);
      try {
        const data = await fetchJson(`/api/course-details/${validPcId}/${validRevNum}`);
        if (mounted) setCourseDetails(data);
      } catch (err) {
        if (mounted) setCourseDetails(null);
      } finally {
        if (mounted) setCourseDetailsLoading(false);
      }
    }
    fetchCourseDetails();
    return () => { mounted = false; };
  }, [validPcId, validRevNum]);

  // API load: Course Coverage (ilos + topics + assessments)
  useEffect(() => {
    if (!validPcId || !validRevNum) return;
    let mounted = true;
    async function fetchCoverage() {
      setCoverageLoading(true);
      try {
        const data = await fetchJson(`/api/course-coverage/${validPcId}/${validRevNum}`);
        if (mounted) setCoverageData(data);
      } catch (err) {
        if (mounted) setCoverageData(null);
      } finally {
        if (mounted) setCoverageLoading(false);
      }
    }
    fetchCoverage();
    return () => { mounted = false; };
  }, [validPcId, validRevNum]);

  // API load: Criteria for Grading
  useEffect(() => {
    if (!validPcId || !validRevNum) return;
    let mounted = true;
    async function fetchCriteria() {
      setCriteriaLoading(true);
      try {
        const data = await fetchJson(`/api/course-criteria/${validPcId}/${validRevNum}`);
        if (mounted) setCriteriaData(data);
      } catch (err) {
        if (mounted) setCriteriaData(null);
      } finally {
        if (mounted) setCriteriaLoading(false);
      }
    }
    fetchCriteria();
    return () => { mounted = false; };
  }, [validPcId, validRevNum]);

  // API load: References
  useEffect(() => {
    if (!validPcId || !validRevNum) return;
    let mounted = true;
    async function fetchRefs() {
      setRefLoading(true);
      try {
        const data = await fetchJson(`/api/courses/${validPcId}/${validRevNum}/references`);
        if (mounted) setRefData(data);
      } catch (err) {
        if (mounted) setRefData(null);
      } finally {
        if (mounted) setRefLoading(false);
      }
    }
    fetchRefs();
    return () => { mounted = false; };
  }, [validPcId, validRevNum]);

  // resolve data: API first, fall back to empty
  const resolvedCourse = courseDetails
  const coverage = coverageData || { ilos: [], topics: [], assessments: [] }
  const criteria = criteriaData || { gradingSystem: [] }
  const resolvedRefs = (() => {
    if (refData) {
      if (Array.isArray(refData)) return refData
      if (refData.data) {
        if (Array.isArray(refData.data)) return refData.data
        const merged = [...(refData.data.Textbook || []), ...(refData.data['Open Educational Resources'] || []), ...(refData.data['Online Resources'] || [])]
        if (merged.length) return merged
        return refData.data.references || []
      }
      if (refData.Textbook || refData['Open Educational Resources'] || refData['Online Resources']) {
        return [...(refData.Textbook || []), ...(refData['Open Educational Resources'] || []), ...(refData['Online Resources'] || [])]
      }
      return refData.references || []
    }
    return []
  })()

  // safe access to syllabus references
  const allReferences = resolvedRefs

  // build a composite syllabus object for buildSyllabusHtml (PDF export)
  const syllabus = React.useMemo(() => {
    const rawSyl = getSyllabus(codeToUse || '')
    return {
      ...resolvedCourse,
      instructor: resolvedCourse?.instructor || rawSyl?.instructor || '',
      courseOutcomes: cpaData?.courseOutcomes || [],
      ilos: coverage?.ilos || [],
      topics: coverage?.topics || [],
      assessments: coverage?.assessments || [],
      gradingSystem: criteria?.gradingSystem || [],
      references: resolvedRefs,
      code: codeToUse,
      course_no: resolvedCourse?.code || '',
      course_title: resolvedCourse?.name || '',
    }
  }, [resolvedCourse, coverage, criteria, resolvedRefs, codeToUse, cpaData])

  const libraryRefs = React.useMemo(() => getReferences(), [refreshKey])

  // derive role
  let storedUser = null
  try { storedUser = JSON.parse(localStorage.getItem('user') || 'null') } catch (e) { storedUser = null }

  const rawRoleSource = (currentRole && currentRole.toString()) || params?.approver || storedUser?.role || storedUser?.roles?.[0] || 'approver'
  const roleSource = String(rawRoleSource).toLowerCase()

  const roleKey = roleSource.includes('program')
    ? 'program-head'
    : roleSource.includes('dean')
      ? 'dean'
      : roleSource.includes('industry')
        ? 'industry-consultant'
        : (roleSource.includes('library') || roleSource.includes('libraries'))
          ? 'director-of-libraries'
          : roleSource.includes('instructor')
            ? 'instructor'
            : roleSource.includes('oic') || roleSource.includes('ovpaa') || roleSource.includes('vpaa')
              ? 'vpaa'
              : roleSource.includes('approver')
                ? 'approver'
                : 'approver'

  const hasApproverComments = useMemo(() => {
    try {
      const raw = localStorage.getItem('approval_comments_v1')
      if (!raw) return false
      const all = JSON.parse(raw)
      return (Array.isArray(all) ? all : []).some(c => normalizeRoleKey(c.role) === roleKey)
    } catch { return false }
  }, [roleKey])

  const defaultBack = (() => {
    const fromTab = location.state?.fromTab
    const fromStatus = location.state?.fromStatus || searchParams.get('fromStatus')
    const explicitFrom = location.state?.from

    if (explicitFrom && explicitFrom !== '/') return explicitFrom

    if (roleKey === 'instructor') {
      if (fromTab === 'approved') return '/?tab=approved'
      if (fromTab === 'assigned') return '/?tab=assigned'
      if (fromStatus) return `/?status=${fromStatus}`
      return '/'
    }
    const base = (() => {
      if (roleKey === 'vpaa') return '/role/vpaa?page=Approved%20Plans'
      if (roleKey === 'dean') return '/role/dean?page=Syllabus'
      if (roleKey === 'director-of-libraries') return '/role/director-of-libraries/approval-course-table?page=Syllabus'
      if (roleKey === 'industry-consultant') return '/role/industry-consultant/approval-course-table?page=Syllabus'
      if (roleKey === 'program-head') return '/role/program-head/approval-course-table?page=Syllabus'
      return `/role/${roleKey}/approval-course-table`
    })()
    return fromStatus ? `${base}&status=${fromStatus}` : base
  })()
  const backPath = defaultBack

  const visibleComments = React.useMemo(() => {
    if (roleKey === 'instructor') {
      return globalComments.filter(c => !(c.recipientRole === 'program_head' && !c.resolved))
    }
    // Approvers see their own comments + comments addressed to them (instructor responses)
    const approverRoles = ['program-head', 'dean', 'industry-consultant', 'director-of-libraries']
    if (approverRoles.includes(roleKey)) {
      return globalComments.filter(c =>
        normalizeRoleKey(c.role) === roleKey || c.recipientRole === roleKey
      )
    }
    return globalComments
  }, [globalComments, roleKey])

  const previousComments = React.useMemo(() => {
    return globalComments
      .filter(c => normalizeRoleKey(c.role) === roleKey)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [globalComments, roleKey])

  const enrichRef = (ref) => {
    const libRef = libraryRefs.find(r => r.id === ref.id)
    return libRef ? { ...ref, ...libRef } : ref
  }
  // ponytail: displayRefs uses API data only, no mock refPool
  const displayRefs = allReferences.map(enrichRef)

  // scroll to selected section when it changes (respect externalSelectedSection when embedded)
  useEffect(() => {
    const active = externalSelectedSection || selectedSection
    const mapping = {
      'Course Coverage': coverageRef,
      'References': referencesRef,
    }

    const targetRef = mapping[active]
    if (!targetRef || !targetRef.current) return

    const container = containerRef.current
    const el = targetRef.current

    if (container && container.scrollTo) {
      const containerTop = container.getBoundingClientRect().top
      const elTop = el.getBoundingClientRect().top
      const offset = elTop - containerTop + container.scrollTop - 8
      container.scrollTo({ top: offset, behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedSection, externalSelectedSection])

  const openComment = () => setShowCommentModal(true)
  const closeComment = () => setShowCommentModal(false)

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Module 2 integration: persist workflow actions (submit / return / approve)
  // to the server so course-table statuses reflect real state across sessions.
  const ACTOR_ROLE_MAP = {
    'instructor': 'INSTRUCTOR',
    'industry-consultant': 'INDUSTRY_CONSULTANT',
    'director-of-libraries': 'LIBRARY_DIRECTOR',
    'program-head': 'PROGRAM_HEAD',
    'dean': 'DEAN',
  }
  const recordWorkflowAction = (actionType) => {
    const actor = ACTOR_ROLE_MAP[roleKey]
    if (!actor || !codeToUse) return
    fetchJson('/api/assignments/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_role: actor, action_type: actionType, pcId: validPcId, code: codeToUse })
    }).catch(e => { if (import.meta.env.DEV) console.warn('Workflow action not persisted to server:', e?.message) })
  }

  const handleApprove = () => {
    try {
      const wf = getWorkflow(codeToUse || '')
      const nowIso = new Date().toISOString()
      if (roleKey === 'director-of-libraries') {
        wf.parallelReview = wf.parallelReview || {}
        wf.parallelReview.library_director = { status: 'done', completedAt: nowIso }
      }
      if (roleKey === 'industry-consultant') {
        wf.parallelReview = wf.parallelReview || {}
        wf.parallelReview.industry_consultant = { status: 'done', completedAt: nowIso }
      }
      if (roleKey === 'program-head') {
        wf.parallelReview = wf.parallelReview || {}
        wf.parallelReview.program_head = { status: 'done', completedAt: nowIso }
        wf.programHead = { status: 'done', completedAt: nowIso }
      }
      if (roleKey === 'dean') {
        wf.dean = { status: 'done', completedAt: nowIso }
      }
      setWorkflow(codeToUse, wf)
      advanceWorkflow(codeToUse)
      setWorkflowState(getWorkflow(codeToUse))
      setRefreshKey(k => k + 1)
      recordWorkflowAction('ACCEPTED')
    } catch (e) {
      console.error('Failed to approve', e)
    }
  }

  // Approve countdown: gives the approver a window to undo before it takes effect
  useEffect(() => {
    if (approvePhase === 'WAITING' && approveTimeLeft > 0) {
      approveTimerRef.current = setTimeout(() => setApproveTimeLeft(t => t - 1), 1000)
    } else if (approvePhase === 'WAITING' && approveTimeLeft === 0) {
      handleApprove()
      setApprovePhase('DONE')
      setTimeout(() => setApprovePhase('IDLE'), 1500)
    }
    return () => clearTimeout(approveTimerRef.current)
  }, [approvePhase, approveTimeLeft])

  const confirmApprove = () => { setApprovePhase('WAITING'); setApproveTimeLeft(5) }
  const cancelApprove = () => { setApprovePhase('IDLE'); setApproveTimeLeft(5) }

  const handleSubmitForReview = () => {
    try {
      const existing = getWorkflow(codeToUse)
      const wf = existing
        ? {
            ...existing,
            currentStage: 'parallel_review',
            submittedAt: new Date().toISOString(),
            parallelReview: {
              library_director: existing.parallelReview?.library_director?.status === 'done'
                ? existing.parallelReview.library_director
                : { status: 'pending', completedAt: null },
              industry_consultant: existing.parallelReview?.industry_consultant?.status === 'done'
                ? existing.parallelReview.industry_consultant
                : { status: 'pending', completedAt: null },
              program_head: existing.parallelReview?.program_head?.status === 'done'
                ? existing.parallelReview.program_head
                : { status: 'pending', completedAt: null }
            },
            programHead: existing.programHead?.status === 'done' ? existing.programHead : { status: 'pending', completedAt: null },
            dean: existing.dean?.status === 'done' ? existing.dean : { status: 'pending', completedAt: null }
          }
        : {
            courseCode: codeToUse || '',
            currentStage: 'parallel_review',
            submittedAt: new Date().toISOString(),
            parallelReview: {
              library_director: { status: 'pending', completedAt: null },
              industry_consultant: { status: 'pending', completedAt: null },
              program_head: { status: 'pending', completedAt: null }
            },
            programHead: { status: 'pending', completedAt: null },
            dean: { status: 'pending', completedAt: null }
          }
      setWorkflow(codeToUse, wf)
      setWorkflowState(getWorkflow(codeToUse))
      setRefreshKey(k => k + 1)
      recordWorkflowAction('SUBMITTED')
    } catch (e) {
      console.error('Failed to submit', e)
    }
    setShowSubmitModal(false)
    showToastMsg('Learning Plan submitted for review!')
    navigate(backPath)
  }

  // determine whether actions are allowed for this role per workflow
  const isRoleActive = () => {
    const wf = getWorkflow(codeToUse || '')
    const stage = wf?.currentStage || 'submitted'
    if (roleKey === 'program-head') return true
    if (stage === 'returned') return roleKey === 'instructor' || roleKey === 'director-of-libraries' || roleKey === 'industry-consultant'
    if (stage === 'submitted') return roleKey === 'instructor' || roleKey === 'director-of-libraries' || roleKey === 'industry-consultant'
    if (stage === 'parallel_review') return roleKey === 'director-of-libraries' || roleKey === 'industry-consultant'
    if (stage === 'dean') {
      if (roleKey !== 'dean') return false
      const pr = wf?.parallelReview || {}
      return pr.library_director?.status === 'done' && pr.industry_consultant?.status === 'done' && pr.program_head?.status === 'done'
    }
    return false
  }

  const hasRoleApproved = () => {
    const wf = getWorkflow(codeToUse || '')
    if (!wf) return false
    if (roleKey === 'director-of-libraries') return wf.parallelReview?.library_director?.status === 'done'
    if (roleKey === 'industry-consultant') return wf.parallelReview?.industry_consultant?.status === 'done'
    if (roleKey === 'program-head') return wf.programHead?.status === 'done'
    if (roleKey === 'dean') return wf.dean?.status === 'done'
    return false
  }

  // COURSE & PROGRAM ALIGNMENT data — use API/fetched data
  const courseOutcomes = cpaData.courseOutcomes.length > 0
    ? cpaData.courseOutcomes
    : (cpaLoading
        ? []
        : [{ id: '—', description: 'No course outcomes loaded.', poMappings: [] }]
      )
  const programOutcomes = cpaData.programOutcomes.length > 0
    ? cpaData.programOutcomes
    : (['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9','PO10','PO11','PO12','PO13'].map(key => ({ key })))

  const realILOs = React.useMemo(() => {
    if (!coverage?.ilos || coverage.ilos.length === 0) return []
    return coverage.ilos.map(ilo => ilo.id).filter(Boolean)
  }, [coverage])

  const realCoToIlos = React.useMemo(() => {
    const map = {}
    if (!coverage?.ilos || cpaData.courseOutcomes.length === 0) return map
    // Key by the same 1-based position used for the CO dropdown's option value
    // and the persisted co_index, not by the ILO id's embedded CO prefix.
    cpaData.courseOutcomes.forEach((co, idx) => {
      const coLabel = `CO${idx + 1}`
      const matches = coverage.ilos.map(ilo => ilo.id).filter(id => id && id.split('-')[0] === coLabel)
      if (matches.length) map[coLabel] = matches
    })
    return map
  }, [coverage, cpaData.courseOutcomes])

  const handleSubmitComment = (payload) => {
    if (import.meta.env.DEV) console.log('Submitted approval comment', { ...payload, role: roleKey })
    setSidebarCollapsed(false)

    try {
      const storageKey = 'approval_comments_v1'
      const raw = localStorage.getItem(storageKey)
      const all = raw ? JSON.parse(raw) : []
      const allArray = Array.isArray(all) ? all : []

      const code = codeToUse
      if (!code) {
        console.warn('No syllabus code available to attach comment')
        return
      }

      // ── Duplicate check: same content + same target ──
      const incoming = (payload.comments || []).filter(c => c.text?.trim())
      for (const inc of incoming) {
        const dup = allArray.find(ex =>
          ex.courseCode === code &&
          ex.courseOutcome === (inc.courseOutcome || null) &&
          ex.ilo === (inc.ilo || null) &&
          ex.coverageType === (inc.coverageType || null) &&
          (Array.isArray(ex.coverageDetail) ? ex.coverageDetail.join('|') : (ex.coverageDetail || '')) === (Array.isArray(inc.coverageDetail) ? inc.coverageDetail.join('|') : (inc.coverageDetail || '')) &&
          (ex.comment || '').trim().toLowerCase() === (inc.text || '').trim().toLowerCase()
        )
        if (dup) {
          showToastMsg('Duplicate comment: identical content already exists for this target.', 'warning')
          return
        }
      }

      // create a submission id shared by all comments being submitted now
      const now = new Date()
      const submissionId = `${code}-${now.getTime()}`
      const submittedAt = payload.createdAt || now.toISOString()
      const submissionLabel = 'Submission'

      const reviewerNames = { 'instructor': 'CASIMERO, DANNY', 'program-head': 'DANILA, JUNAR', 'dean': 'REYES, AGNES', 'director-of-libraries': 'SANTOS, MARIA', 'industry-consultant': 'CRUZ, ROBERTO' }
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
      const reviewer = reviewerNames[roleKey] || storedUser?.name || 'Approver'
      const roleLabel = roleKey === 'program-head' ? 'Program Head'
        : roleKey === 'dean' ? 'Dean'
        : roleKey === 'industry-consultant' ? 'Industry Consultant'
        : roleKey === 'director-of-libraries' ? 'Director of Libraries'
        : roleKey === 'instructor' ? 'Instructor'
        : 'Department Head'

      const sectionToSave = externalSelectedSection || selectedSection
      const prepared = (payload.comments || []).map((c, i) => ({
        id: `${submissionId}-${c.id}`,
        courseCode: code,
        section: sectionToSave,
        submissionId,
        submissionLabel,
        submittedAt,
        createdAt: new Date().toISOString(),
        reviewer,
        role: roleLabel,
        recipientRole: roleKey === 'dean' ? 'program_head' : 'instructor',
        components: c.components || {},
        comment: c.text || '',
        courseOutcome: c.courseOutcome || null,
        ilo: c.ilo || null,
        coverageType: c.coverageType || null,
        coverageDetail: (Array.isArray(c.coverageDetail) ? (c.coverageDetail.length ? c.coverageDetail : null) : (c.coverageDetail || null)),
        status: 'pending',
        resolved: false,
        suggestedRefs: (payload.suggestedReferences || []).map(r => ({
          title: r.title || '',
          authors: r.authors || '',
          type: r.type || '',
          year: r.year || '',
          isbn: r.isbn || '',
          link: r.link || ''
        }))
      }))

      // DOL comments target references directly — attach the reference titles
      // so the sidebar shows [REFERENCES: ...] chips like other roles' comments.
      const dolRefTitles = roleKey === 'director-of-libraries'
        ? (payload.commentedReferences || []).map(id => getReferenceById(id)?.title).filter(Boolean)
        : []
      if (dolRefTitles.length > 0) {
        prepared.forEach(p => {
          if (!p.coverageType) p.coverageType = 'References'
          if (!p.coverageDetail || (Array.isArray(p.coverageDetail) && p.coverageDetail.length === 0)) p.coverageDetail = dolRefTitles
        })
      }

      const newComments = [...allArray, ...prepared]
      localStorage.setItem(storageKey, JSON.stringify(newComments))

      // Persist each comment to the SERVER too, so the instructor sees it in
      // Review Corrections and the notif badges count it. CO/ILO labels are
      // resolved to real ids server-side.
      const forMap = { 'Topic': 'topics', 'References': 'references', 'TLA': 'tlas' }
      prepared.forEach(c => {
        const coIndex = c.courseOutcome ? parseInt(String(c.courseOutcome).replace(/\D/g, ''), 10) : null
        const iloIndex = c.ilo && String(c.ilo).includes('ILO') ? parseInt(String(c.ilo).split('ILO')[1], 10) : null
        if (!coIndex || !iloIndex) return // untargeted comments stay local-only
        const targetTitles = Array.isArray(c.coverageDetail) ? c.coverageDetail : (c.coverageDetail ? [c.coverageDetail] : [])
        fetchJson('/api/comments/by-course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            commenter_role: ACTOR_ROLE_MAP[roleKey] || roleKey.toUpperCase(),
            message: c.comment,
            co_index: coIndex,
            ilo_index: iloIndex,
            comment_for: forMap[c.coverageType] || null,
            target_titles: targetTitles,
          })
        }).catch(e => { if (import.meta.env.DEV) console.warn('Comment not persisted to server:', e?.message) })
      })

      // Director of Libraries flow: no CO/ILO pickers — the comment targets a
      // reference directly, and the server resolves the ILO from that reference.
      // Suggested references are appended to the message so the instructor
      // sees them in Review Corrections too.
      const commentedRefIds = (payload.commentedReferences || []).filter(Boolean)
      const suggested = payload.suggestedReferences || []
      if (roleKey === 'director-of-libraries' && (commentedRefIds.length > 0 || suggested.length > 0)) {
        const text = (payload.comments || []).map(c => c.text).filter(t => t && t.trim()).join('\n')
        const suggestionLine = suggested.length > 0
          ? `Suggested reference${suggested.length > 1 ? 's' : ''}: ` +
            suggested.map(r => `${r.title}${r.authors ? ' — ' + r.authors : ''}`).join('; ')
          : ''
        // Message = comment text (+ suggestions), or the suggestions alone
        const message = text
          ? (suggestionLine ? `${text}\n\n${suggestionLine}` : text)
          : suggestionLine
        if (message) {
          const postToServer = (targetTitles) => fetchJson('/api/comments/by-course', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              commenter_role: 'LIBRARY_DIRECTOR',
              message,
              comment_for: 'references',
              target_titles: targetTitles,
            })
          }).catch(e => { if (import.meta.env.DEV) console.warn('DOL comment not persisted to server:', e?.message) })

          const targetTitles = commentedRefIds.map(id => getReferenceById(id)?.title).filter(Boolean)
          if (targetTitles.length > 0) targetTitles.forEach(t => postToServer([t]))
          else postToServer([]) // suggestion-only — server attaches to the course's first reference ILO
        }
      }

      console.debug('Saved approver comments', { code, section: selectedSection, count: prepared.length })

      // Save suggested references from payload
      if (payload.suggestedReferences && payload.suggestedReferences.length > 0) {
        payload.suggestedReferences.forEach(ref => {
          addSuggestion(codeToUse, ref, reviewer)
        })
        console.debug('Saved suggestions', { code, count: payload.suggestedReferences.length })
      }

      setRefreshKey(k => k + 1)

      const wf = getWorkflow(codeToUse)
      if (wf && wf.currentStage !== 'returned') {
        wf.currentStage = 'returned'
        setWorkflow(codeToUse, wf)
        advanceWorkflow(codeToUse)
        setWorkflowState(getWorkflow(codeToUse))
        recordWorkflowAction('RETURNED')
      }
    } catch (e) {
      console.error('Failed to persist approval comment', e)
    }
  }

  const handleAcceptSuggestion = (id) => {
    acceptSuggestion(id);
    setRefreshKey(k => k + 1);
    showToastMsg('Reference added to learning plan!');
  }

  const handleRejectSuggestion = (id) => {
    rejectSuggestion(id);
    setRefreshKey(k => k + 1);
    showToastMsg('Suggestion rejected.');
  }

  useEffect(() => {
    if (!defaultSections.includes(selectedSection)) setSelectedSection(defaultSections[0])
  }, [selectedSection])

  const activeSelectedSection = (externalSelectedSection || selectedSection) === 'References' ? 'References Summary' : (externalSelectedSection || selectedSection)

  // getRoleColor, getComponentTags, isRecent imported from approvalHelpers

  const saveGlobalCommentsToStorage = (updatedGlobalComments) => {
    try {
      const raw = localStorage.getItem('approval_comments_v1')
      const all = raw ? JSON.parse(raw) : []
      const commentsArray = Array.isArray(all) ? all : []
      const newAll = commentsArray.map(c => {
        const updated = updatedGlobalComments.find(u => u.id === c.id)
        return updated || c
      })
      localStorage.setItem('approval_comments_v1', JSON.stringify(newAll))
    } catch (e) {
      console.error('Failed to persist global comments', e)
    }
  }

  const markCommentResolved = (commentId) => {
    const updated = (globalComments || []).map(c => c.id === commentId ? { ...c, resolved: true, status: 'resolved', resolvedAt: new Date().toISOString() } : c)
    setGlobalComments(updated)
    saveGlobalCommentsToStorage(updated)
    // Server-synced comment: persist the resolution to the database too, so the
    // approver sees the check from any session (and the next sync doesn't revert it).
    const idStr = String(commentId)
    if (idStr.startsWith('server-')) {
      const serverId = Number(idStr.replace('server-', ''))
      if (!Number.isNaN(serverId)) {
        fetchJson('/api/comments/update-resolution', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: [{ comment_id: serverId, resolved_status: true }] })
        }).catch(e => { if (import.meta.env.DEV) console.warn('Failed to sync resolution to server:', e?.message) })
      }
    }
  }

  return (
    <div className={styles.container}>
      {!embedded && (
        <div className={styles.navi}>
          <Link to={backPath} className={'actionLink'}>
            <div className={styles.return}>
              <ChevronLeft size={22} />
            </div>
          </Link>

          <div className={styles['section-select']}>
            <select value={selectedSection} onChange={handleSectionChange}>
              {defaultSections.map((s) => <option key={s} value={s}>{sectionLabels[s]}</option>)}
            </select>
          </div>

          {/* approval controls — direct children of .navi like instructor */}
          {(() => {
            if (effectiveStatus !== 'approved' && roleKey === 'instructor') {
              const wf = workflowState || getWorkflow(codeToUse || '')
              const stage = wf?.currentStage || 'submitted'
              const isReturned = stage === 'returned'
              const hasUnresolved = globalComments.some(c => c.recipientRole === 'instructor' && !c.resolved)
              return (
                <div className={styles.submit} onClick={() => {
                  if (!isRoleActive()) {
                    showToastMsg('Previous approvers have not completed their review yet.', 'warning')
                    return
                  }
                  if (isReturned && hasUnresolved) {
                    showToastMsg('Please address all reviewer comments first before submitting your revision.', 'warning')
                    return
                  }
                  setShowSubmitModal(true)
                }}>
                  {isReturned ? 'Submit Revision' : 'Submit for Review'}
                </div>
              )
            }
            if (effectiveStatus !== 'approved' && roleKey !== 'instructor') {
              return (<>
                <div className={`${styles.draft} ${!(isRoleActive() || hasRoleApproved()) ? styles['disabled-btn'] : ''}`} onClick={() => {
                  // Approvers can always ADD comments while the plan is in review —
                  // including in the returned stage or after their own approval.
                  if (isRoleActive() || hasRoleApproved()) { setReadOnlyCommentModal(false); openComment() }
                  else if (roleKey === 'dean') showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
                  else showToastMsg('Commenting is not available until the workflow reaches your review stage.', 'warning')
                }}><MessageSquare size={16} /> Add Comment</div>
                <div className={`${styles.submit} ${(!isRoleActive() || hasRoleApproved()) ? styles['disabled-btn'] : ''}`} onClick={() => {
                  if (hasRoleApproved()) showToastMsg('You have already approved this learning plan.', 'warning')
                  else if (isRoleActive()) setApprovePhase('CONFIRM')
                  else if (roleKey === 'dean') showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
                }}><Check size={16} /> Approve</div>
              </>)
            }
            if (effectiveStatus === 'approved' && roleKey === 'vpaa') {
              return (<>
                <div className={styles.submit} style={{ marginLeft: 'auto' }} onClick={async () => {
                  setExportingPdf(true)
                  try {
                    const logoUrl = new URL(unclogo, window.location.origin).href
                    const wf = getWorkflow(codeToUse)
                    const html = buildSyllabusHtml(syllabus, codeToUse, wf, logoUrl)
                    const blob = new Blob([html], { type: 'text/html' })
                    const url = URL.createObjectURL(blob)
                    setPreviewFile({
                      file_url: url,
                      file_name: `Syllabus_${codeToUse}.html`,
                      instructor_name: syllabus?.instructor || '—',
                      course_id: codeToUse,
                      course_name: syllabus?.name || '',
                      submission_date: syllabus?.update || '',
                      period_label: (syllabus?.year || '') + ' — ' + (syllabus?.sem || ''),
                    })
                  } catch (err) {
                    console.warn('Export generation failed:', err)
                    alert('Failed to generate export: ' + (err?.message || err))
                  } finally {
                    setExportingPdf(false)
                  }
                }}>
                  <Download size={16} /> Export
                </div>
              </>)
            }
            if (effectiveStatus === 'approved' && (roleKey === 'instructor' || roleKey === 'dean')) {
              return (<>
                <div className={styles.divider}>
                  <div className={styles.line}></div>
                </div>
                <div onClick={toggleMenu} ref={dropdownRef} className={`${styles.more} ${isOpen ? styles.active : ''}`}>
                  <div className={styles.moreIcon}>
                    <MoreVertical strokeWidth={2} size={16} />
                  </div>
                  <div className={styles.dropdownMenu}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRevisionsOpen(true); setIsOpen(false); }}>
                      <Clock strokeWidth={2} size={14} /> Revisions
                    </button>
                    <button type="button" disabled={exportingPdf} onClick={(e) => { e.stopPropagation(); setIsOpen(false); runExport(); }}>
                      <Download strokeWidth={2} size={14} /> {exportingPdf ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
              </>)
            }
            if (effectiveStatus === 'approved') {
              return (<>
                <div className={styles.divider}>
                  <div className={styles.line}></div>
                </div>
                <div onClick={toggleMenu} ref={dropdownRef} className={`${styles.more} ${isOpen ? styles.active : ''}`}>
                  <div className={styles.moreIcon}>
                    <MoreVertical strokeWidth={2} size={16} />
                  </div>
                  <div className={styles.dropdownMenu}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRevisionsOpen(true); setIsOpen(false); }}>
                      <Clock strokeWidth={2} size={14} /> Revisions
                    </button>
                    <button type="button" disabled={exportingPdf} onClick={(e) => { e.stopPropagation(); setIsOpen(false); runExport(); }}>
                      <Download strokeWidth={2} size={14} /> {exportingPdf ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
              </>)
            }
            return null
          })()}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className={styles['dynamic-sections']} ref={containerRef}>
            {initialLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
              </div>
            ) : (
            <>
            {activeSelectedSection === 'Course Details' && (
              <section ref={courseDetailsRef}>
                <div className={stylesB.courseDetailsContainer}>
                  <table className={stylesB.documentTable}>
                    <tbody>
                    <tr>
                      <th className={stylesB.labelCell}>Course No.</th>
                      <td className={stylesB.valueCell}>{resolvedCourse?.code || ''}</td>
                      <th className={stylesB.descHeader}>Course Description</th>
                    </tr>
                    <tr>
                      <th className={stylesB.labelCell}>Course Title</th>
                      <td className={stylesB.valueCell}><strong>{resolvedCourse?.name || ''}</strong></td>
                      <td rowSpan="9" className={stylesB.descCell}>{resolvedCourse?.description || ''}</td>
                    </tr>
                    <tr><th className={stylesB.labelCell}>Credit</th><td className={stylesB.valueCell}>{resolvedCourse?.credits || ''}</td></tr>
                    <tr><th className={stylesB.labelCell}>Contact Hours/Week</th><td className={stylesB.valueCell}>{resolvedCourse?.contact || ''}</td></tr>
                    <tr><th className={stylesB.labelCell}>Pre-requisites</th><td className={stylesB.valueCell}>{resolvedCourse?.prerequisites || ''}</td></tr>
                    <tr><th className={stylesB.labelCell}>Classification/Field</th><td className={stylesB.valueCell}>{resolvedCourse?.class || ''}</td></tr>
                    <tr><th className={stylesB.labelCell}>CMO</th><td className={stylesB.valueCell}>{resolvedCourse?.cmo || ''}</td></tr>
                    <tr><th className={stylesB.labelCell}>Syllabus Revision No.</th><td className={stylesB.valueCell}>{resolvedCourse?.revision ?? 0}</td></tr>
                    <tr><th className={stylesB.labelCell}>Year Level</th><td className={stylesB.valueCell}>{resolvedCourse?.year || ''}</td></tr>
                    <tr><th className={stylesB.labelCell}>Term</th><td className={stylesB.valueCell}>{resolvedCourse?.sem || ''}</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSelectedSection === 'Course and Program Outcome Alignment' && (
              <section ref={alignmentRef}>
                <OutcomeAlignment
                  offeringID={validPcId}
                  revisionNum={validRevNum}
                  styles={stylesC}
                  stylesB={stylesB}
                  fetchJson={fetchJson}
                />
              </section>
            )}

            {/* Course Coverage */}
            {activeSelectedSection === 'Course Coverage' && (
              <section ref={coverageRef}>
                <CourseCoverage
                  offeringID={validPcId}
                  revisionNum={validRevNum}
                  status={effectiveStatus}
                  selectedSection={activeSelectedSection}
                  styles={stylesC}
                  stylesB={stylesB}
                  fetchJson={fetchJson}
                />
              </section>
            )}

            {/* References */}
            {activeSelectedSection === 'References Summary' && (
              <section ref={referencesRef}>
                <ReferenceSummary
                  offeringID={validPcId}
                  revisionNum={validRevNum}
                  status={effectiveStatus}
                  selectedSection={activeSelectedSection}
                  styles={stylesC}
                  stylesB={stylesB}
                  fetchJson={fetchJson}
                />
              </section>
            )}

            {/* Criteria for Grading */}
            {activeSelectedSection === 'Criteria for Grading' && (
              <section ref={criteriaRef}>
                <CriteriaForGrading
                  offeringID={validPcId}
                  revisionNum={validRevNum}
                  status={effectiveStatus}
                  styles={stylesC}
                  stylesB={stylesB}
                  fetchJson={fetchJson}
                />
              </section>
            )}


            {/* Reference suggestions for instructor */}
            {roleKey === 'instructor' && activeSelectedSection === 'References Summary' && suggestions.filter(s => s.status === 'pending').length > 0 && (
              <div style={{ marginTop: 24, padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, color: '#92400e' }}>
                  Suggested References from Director of Libraries
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {suggestions.filter(s => s.status === 'pending').map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', borderRadius: 6, border: '1px solid #fde68a' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{s.reference.title}</div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>{s.reference.authors} &middot; {s.reference.year || 'N/A'} &middot; Suggested by {s.suggestedBy} on {new Date(s.suggestedAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                        <button onClick={() => handleAcceptSuggestion(s.id)} style={{ padding: '6px 14px', background: '#047857', color: 'white', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Accept</button>
                        <button onClick={() => handleRejectSuggestion(s.id)} style={{ padding: '6px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>)}
          </div>
        </div>

        {!embedded && roleKey !== 'vpaa' && activeSelectedSection === 'Course Coverage' && (
          <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', flexShrink: 0 }}>
            <button onClick={() => setSidebarCollapsed(c => !c)} style={{
              width: 26, border: 'none', borderLeft: '1px solid #e2e8f0', background: '#fafafa',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: sidebarCollapsed ? '#2563eb' : '#94a3b8', padding: 0, fontSize: 13, borderRadius: 0,
              transition: 'color 0.2s', position: 'relative', flexShrink: 0
            }}>
              {sidebarCollapsed ? (
                <>
                  {'<'}
                  {visibleComments.length > 0 && (
                    <span style={{
                      position: 'absolute', top: 4, right: 3, width: 8, height: 8, borderRadius: '50%',
                      background: '#2563eb'
                    }} />
                  )}
                </>
              ) : '>'}
            </button>
            <div style={{
              overflow: 'hidden',
              width: sidebarCollapsed ? 0 : 380,
              transition: 'width 0.2s ease',
              flexShrink: 0
            }}>
            <aside style={{
              width: 380,
              flexShrink: 0,
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: '100%',
              borderLeft: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '16px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid #e0e4ec'
              }}>
                <MessageSquare size={18} color="#475569" />
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', flex: 1 }}>
                  Comments
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                  {visibleComments.length} {visibleComments.length === 1 ? 'comment' : 'comments'}
                </span>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '10px 0' }}>
                {visibleComments.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
                    <Inbox size={40} strokeWidth={1.5} style={{ margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ margin: 0 }}>No comments yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {visibleComments.map((comment) => {
                      const roleKeyToLabel = { 'instructor': 'Instructor', 'program-head': 'Program Head', 'dean': 'Dean', 'director-of-libraries': 'Director of Libraries', 'industry-consultant': 'Industry Consultant' }
                      const isRecipient = ({ 'instructor': 'instructor', 'program-head': 'program_head' }[roleKey]) === comment.recipientRole
                      const coverageType = comment.coverageType || ''
                      return (
                        <div key={comment.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 14,
                          padding: '16px 20px',
                          borderBottom: '1px solid #f1f5f9',
                          opacity: comment.resolved ? 0.65 : 1,
                          transition: 'background 0.2s ease, opacity 0.2s ease'
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                          <div style={{ position: 'relative', width: 18, height: 18, marginTop: 3, flexShrink: 0 }}>
                            {comment.resolved ? (
                              <span style={{
                                display: 'inline-block', width: 18, height: 18, borderRadius: 4,
                                backgroundColor: '#2e7d32', border: '2px solid #2e7d32',
                                position: 'relative', boxSizing: 'border-box'
                              }}>
                                <span style={{
                                  position: 'absolute', left: 4, top: 1, width: 5, height: 9,
                                  border: 'solid white', borderWidth: '0 2px 2px 0',
                                  transform: 'rotate(45deg)'
                                }} />
                              </span>
                            ) : isRecipient ? (
                              <label style={{ cursor: 'pointer', display: 'block', width: 18, height: 18 }}
                                title="Mark as fixed — the approver will see this comment checked"
                                onClick={(e) => { e.stopPropagation(); markCommentResolved(comment.id) }}>
                                <input type="checkbox"
                                  style={{ position: 'absolute', opacity: 0, cursor: 'pointer', width: 0, height: 0 }}
                                  onChange={() => markCommentResolved(comment.id)} />
                                <span style={{
                                  position: 'absolute', top: 0, left: 0, width: 18, height: 18,
                                  backgroundColor: '#fff', border: '2px solid #cbd5e1', borderRadius: 4,
                                  boxSizing: 'border-box', transition: 'all 0.2s'
                                }} />
                              </label>
                            ) : null}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                            {(coverageType || comment.courseOutcome || comment.ilo) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                                {comment.courseOutcome && (
                                  <span style={{ background: comment.resolved ? '#f1f5f9' : '#edf2f7', padding: '4px 10px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 500, letterSpacing: '-0.01em', color: comment.resolved ? '#94a3b8' : '#4a5568' }}>
                                    [CO: {comment.courseOutcome}]
                                  </span>
                                )}
                                {comment.ilo && (
                                  <span style={{ background: comment.resolved ? '#f1f5f9' : '#edf2f7', padding: '4px 10px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 500, letterSpacing: '-0.01em', color: comment.resolved ? '#94a3b8' : '#4a5568' }}>
                                    [ILO: {comment.ilo}]
                                  </span>
                                )}
                                {(() => {
                                  // coverageDetail may be an array (UI comments) or a string (server-synced comments)
                                  const details = Array.isArray(comment.coverageDetail)
                                    ? comment.coverageDetail
                                    : (comment.coverageDetail ? [comment.coverageDetail] : [])
                                  const ct = comment.coverageType || 'Topic'
                                  const colors = comment.resolved
                                    ? { background: '#f1f5f9', color: '#94a3b8' }
                                    : {
                                        background: ct === 'Topic' ? '#e0f2fe' : ct === 'TLA' ? '#ede9fe' : ct === 'References' ? '#fef3c7' : '#edf2f7',
                                        color: ct === 'Topic' ? '#0369a1' : ct === 'TLA' ? '#6d28d9' : ct === 'References' ? '#92400e' : '#4a5568',
                                      }
                                  const chipStyle = {
                                    ...colors, padding: '4px 10px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 500,
                                    letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240
                                  }
                                  if (details.length === 0) {
                                    // no target name — still show the coverage type so the comment stays connected
                                    return comment.coverageType ? (
                                      <span style={chipStyle}>[{ct.toUpperCase()}]</span>
                                    ) : null
                                  }
                                  return details.map((detail, di) => (
                                    <span key={di} style={chipStyle}>
                                      [{ct.toUpperCase()}: {detail}]
                                    </span>
                                  ))
                                })()}
                              </div>
                            )}

                            <p style={{
                              margin: 0, fontSize: '0.92rem', lineHeight: 1.45, color: comment.resolved ? '#94a3b8' : '#334155',
                              wordBreak: 'break-word',
                              textDecoration: comment.resolved ? 'line-through' : 'none'
                            }}>
                              {comment.comment}
                            </p>

                            {comment.suggestedRefs && comment.suggestedRefs.length > 0 && (
                              <div style={{ padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4, fontSize: '0.75rem' }}>
                                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 2 }}>Suggested References:</div>
                                {comment.suggestedRefs.map((sr, si) => (
                                  <div key={si} style={{ color: '#78350f' }}>
                                    {sr.title}{sr.authors ? ` — ${sr.authors}` : ''}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: '#475569' }}>{comment.reviewer || 'Reviewer'}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span style={{ fontSize: '0.78rem' }}>{comment.createdAt || comment.submittedAt ? new Date(comment.createdAt || comment.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                              {comment.resolved && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: '#dcfce7', color: '#166534',
                                  padding: '2px 10px', borderRadius: 10,
                                  fontSize: '0.75rem', fontWeight: 600, marginLeft: 'auto'
                                }}>
                                  <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>✓</span>
                                  Fixed by instructor
                                  {comment.resolvedAt ? ` · ${new Date(comment.resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </aside>
            </div>
          </div>
        )}
      </div>

      {/* Approval comment box (preserved) */}
      <ApprovalCommentBox
        show={showCommentModal}
        onClose={closeComment}
        onSubmit={handleSubmitComment}
        courseOutcomes={courseOutcomes}
        ilos={realILOs}
        approverRole={currentRole}
        coverageEntries={coverage?.ilos || []}
        syllabusTopics={coverage?.topics || []}
        syllabusReferences={displayRefs}
        readOnly={readOnlyCommentModal}
        previousComments={previousComments}
        coToIlosProp={Object.keys(realCoToIlos).length ? realCoToIlos : undefined}
      />

      {/* ── APPROVE CONFIRMATION (matches instructor submit modal, with undo countdown) ── */}
      {approvePhase !== 'IDLE' && (
        <div className={subStyles.submitOverlay}>
          {approvePhase === 'CONFIRM' && (
            <div className={subStyles.submitModal}>
              <div className={subStyles.submitModalHeader}>
                Approve Learning Plan
              </div>
              <div className={subStyles.submitModalBody}>
                Are you sure you want to approve this learning plan for <strong>{codeToUse}</strong>? This will advance the workflow to the next stage.
              </div>
              <div className={subStyles.submitModalActions}>
                <button className={subStyles.btnCancelPlain} onClick={cancelApprove}>Cancel</button>
                <button className={subStyles.btnConfirmDark} onClick={confirmApprove}>Yes, Approve</button>
              </div>
            </div>
          )}

          {approvePhase === 'WAITING' && (
            <div className={subStyles.submitModal}>
              <div className={subStyles.waitingBody}>
                <div className={subStyles.waitingText}>
                  Approving in <strong>{approveTimeLeft}</strong> seconds...
                </div>
                <div className={subStyles.progressContainer}>
                  <div className={subStyles.progressBar} style={{ animationDuration: '5s' }}></div>
                </div>
              </div>
              <div className={subStyles.submitModalActionsFull}>
                <button className={subStyles.btnUndoBlock} onClick={cancelApprove}>Cancel Approval</button>
              </div>
            </div>
          )}

          {approvePhase === 'DONE' && (
            <div className={subStyles.submitModal}>
              <div className={subStyles.waitingBodyCenter}>
                <div className={subStyles.successIcon}>✓</div>
                <div className={subStyles.waitingTextSmall}>Learning Plan Approved!</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUBMIT / REVISION MODAL ────────────────────────────────────── */}
      {showSubmitModal && (() => {
        const wf = workflowState || getWorkflow(codeToUse || '')
        const stage = wf?.currentStage || 'submitted'
        const isReturned = stage === 'returned'
        return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }} onClick={() => setShowSubmitModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, width: 420, maxWidth: '90vw', padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'Poppins', sans-serif" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'black', margin: '0 0 10px' }}>{isReturned ? 'Submit Revision' : 'Submit for Review'}</h3>
            <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 300, margin: '0 0 24px', lineHeight: 1.5 }}>
              {isReturned
                ? `Are you sure you want to re-submit your revision for ${codeToUse}? It will be re-sent to the Director of Libraries and Industry Consultant for review.`
                : `Are you sure you want to submit ${codeToUse} for review? It will be sent to the Director of Libraries and Industry Consultant for parallel review.`}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={{ padding: '10px 24px', background: 'transparent', color: 'black', border: '1px solid #A4A9AF', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }} onClick={() => setShowSubmitModal(false)}>Cancel</button>
              <button style={{ padding: '10px 24px', background: '#19282C', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }} onClick={handleSubmitForReview}>{isReturned ? 'Submit Revision' : 'Submit'}</button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ── REVISIONS OVERLAY ──────────────────────────────────────────────── */}
      <Revisions
        isOpen={isRevisionsOpen}
        onClose={() => setIsRevisionsOpen(false)}
        pcId={validPcId}
        revNum={validRevNum}
      />

      {/* ── PDF VIEWER MODAL ───────────────────────────────────────────── */}
      {previewFile && (
        <PDFViewerModal
          file={previewFile}
          kind="Learning Plan"
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

      {/* ── TOAST NOTIFICATION ─────────────────────────────────────────── */}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 1100,
          background: toast.type === 'warning' ? '#dc2626' : '#047857',
          color: 'white', padding: '14px 24px',
          borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.type === 'warning' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="16 8 10 16 7 13" /></svg>
          )}
          {toast.msg}
        </div>
      )}

    </div>
  )
}

export default ApprovalSyllabusSections
