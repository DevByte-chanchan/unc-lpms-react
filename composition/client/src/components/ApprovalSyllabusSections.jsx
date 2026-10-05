import React, { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, MessageSquare, Download, MoreVertical, Check, Clock, FileText } from 'react-feather'
import EmptyState from './EmptyState.jsx'
import Spinner from './Spinner.jsx'
import TableScrollRegion from './TableScrollRegion.jsx'
import styles from '../styles/ApprovalSyllabusSections.module.sass'
import subStyles from '../styles/SyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass'
import stylesC from '../styles/SyllabusSections.module.sass'
import ApprovalCommentBox from './ApprovalCommentBox.jsx'
import { useServerWorkflow } from '../utils/useServerWorkflow.js'
import { getSuggestions, addSuggestion, acceptSuggestion, rejectSuggestion, getSyllabus } from '../utils/dataStore'
import { getReferences, getReferenceById } from '../utils/referenceLibrary'
import { normalizeRoleKey } from '../utils/approvalHelpers.js'
import { getSession, nameForRoleWithSession } from '../utils/session'
import ApprovalChainStatus from './ApprovalChainStatus.jsx'
import {
  validateReturn,
  canActOnStage,
  encodeCommentType,
  parseApprovalCommentDisplay,
  compactCommentIlo,
  reviewerRoleLabel,
} from '../utils/reviewGate.js'
import { fetchJson, apiErrorMessage } from "../utils/api.js"
import { describeCourseLoadError } from '../utils/courseLoadError.js'
import { canReviewLoadedCourse } from '../utils/reviewAssignments.js'
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
const ACTOR_ROLE_MAP = {
  instructor: 'INSTRUCTOR',
  'industry-consultant': 'INDUSTRY_CONSULTANT',
  'director-of-libraries': 'LIBRARY_DIRECTOR',
  'program-head': 'PROGRAM_HEAD',
  dean: 'DEAN',
}


const ApprovalSyllabusSections = ({ status = 'pending', currentRole = '', courseCode = '', embedded = false, externalSelectedSection = null, workflow: workflowProp = null, pcId = null, revNum = null }) => {
  const [searchParams] = useSearchParams()
  const [selectedSection, setSelectedSection] = useState(defaultSections[0])
  const statusParam = searchParams.get('status')
  const effectiveFromUrl = (statusParam || status || '').toLowerCase()
  // A plan's stage and who may act come from the server workflow log, never from local storage.
  const validPcId = pcId && !Number.isNaN(Number(pcId)) && String(Number(pcId)) === String(pcId) ? pcId : null
  const { workflow: serverWorkflow, reload: reloadWorkflow } = useServerWorkflow(validPcId, courseCode)
  const workflowState = workflowProp || serverWorkflow
  const fallbackStage = workflowState.currentStage === 'draft' ? '' : (workflowState.currentStage || '')
  const effectiveStatus = effectiveFromUrl || fallbackStage || 'submitted'
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [isRevisionsOpen, setIsRevisionsOpen] = useState(false)

  const [showCommentModal, setShowCommentModal] = useState(false)
  const [readOnlyCommentModal, setReadOnlyCommentModal] = useState(false)
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
  // The panel is 380px wide. Open by default it would swallow a phone screen
  // whole, so on a narrow viewport it starts collapsed and the approver opens
  // it deliberately.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 1024
  )
  const [previewFile, setPreviewFile] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Shared export routine so the Export action can live both as a standalone
  // button and inside the "more" dropdown stack (next to Revisions).
  const runExport = async () => {
    setExportingPdf(true)
    try {
      const logoUrl = new URL(unclogo, window.location.origin).href
      const html = buildSyllabusHtml(syllabus, codeToUse, workflowState, logoUrl)
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
  const [, setCpaError] = useState(null)
  const [courseDetails, setCourseDetails] = useState(null)
  const [courseDetailsLoading, setCourseDetailsLoading] = useState(true)
  // WHY it is empty, not just THAT it is. The catch below used to discard the
  // error, so "nothing has been entered yet" and "the server never answered"
  // produced the same screen — and the second one is not the user's problem to
  // guess at.
  const [courseDetailsError, setCourseDetailsError] = useState('')
  const [coverageData, setCoverageData] = useState(null)
  const [, setCoverageLoading] = useState(false)
  const [criteriaData, setCriteriaData] = useState(null)
  const [, setCriteriaLoading] = useState(false)
  const [refData, setRefData] = useState(null)
  const [, setRefLoading] = useState(false)

  // refs to sections for auto-scroll (coverage + references still inline)
  const courseDetailsRef = useRef(null)
  const alignmentRef = useRef(null)
  const criteriaRef = useRef(null)
  const coverageRef = useRef(null)
  const referencesRef = useRef(null)
  const containerRef = useRef(null)

  const { code: routeCode } = useParams();
  const codeToUse = routeCode || courseCode
  const validRevNum = revNum && !Number.isNaN(Number(revNum)) && String(Number(revNum)) === String(revNum) ? revNum : null
  const reviewRecordAvailable = canReviewLoadedCourse({
    pcId: validPcId,
    revNum: validRevNum,
    code: codeToUse,
    details: courseDetails,
    error: courseDetailsError,
  })

  // A SPINNER MUST HAVE SOMETHING TO WAIT FOR.
  //
  // This used to start with `!codeToUse ||` — so a screen opened without a
  // course code showed the spinner FOREVER. Nothing was in flight; nothing
  // would ever arrive to end it. That is the spinning circle over an empty
  // panel: not a slow server, a wait for something that was never requested.
  //
  // Now it is true only while a request is genuinely outstanding.
  const initialLoading = !!(validPcId && validRevNum && courseDetailsLoading && courseDetails === null)

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value)
  }

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

  useEffect(() => {
    try {
      // Sweep any leftover demo seed comments (all courses), then load real ones
      seedDummyComments()

      const refreshed = JSON.parse(localStorage.getItem('approval_comments_v1') || '[]')
      const courseComments = (Array.isArray(refreshed) ? refreshed : []).filter(c => c.courseCode === codeToUse)
      setGlobalComments(courseComments)
    } catch {
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

    // A row written by whoever is signed in must keep showing their name, not the
    // demo name for that role — re-labelling it on reload is the account switch
    // the panel flagged [45:27].
    const nameForRole = (rawRole) =>
      nameForRoleWithSession(getSession(), rawRole, roleToName[rawRole] || rawRole)

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
              reviewer: nameForRole(r.commenter_role),
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
        if (mounted) { setCourseDetails(data); setCourseDetailsError(''); }
      } catch (err) {
        if (mounted) {
          setCourseDetails(null);
          setCourseDetailsError(describeCourseLoadError(err));
        }
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
      } catch {
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
      } catch {
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
      } catch {
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
  const coverage = React.useMemo(
    () => coverageData || { ilos: [], topics: [], assessments: [] },
    [coverageData]
  )
  const criteria = React.useMemo(
    () => criteriaData || { gradingSystem: [] },
    [criteriaData]
  )
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

  const libraryRefs = getReferences()

  // derive role
  let storedUser = null
  try { storedUser = JSON.parse(localStorage.getItem('user') || 'null') } catch { storedUser = null }

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
  // The server's workflow log is the single source of truth for a plan's status,
  // so callers update their local view only after this resolves. Rejects when the
  // server refuses the action (e.g. the plan is not at this reviewer's stage).
  const recordWorkflowAction = React.useCallback((actionType) => {
    const actor = ACTOR_ROLE_MAP[roleKey]
    if (!actor || !codeToUse) return Promise.reject(new Error('This role cannot record a workflow action for this course.'))
    return fetchJson('/api/assignments/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_role: actor, action_type: actionType, pcId: validPcId, code: codeToUse })
    })
  }, [codeToUse, roleKey, validPcId])

  const handleApprove = React.useCallback(() => {
    if (!reviewRecordAvailable) return
    // The server records the approval (and who signed it: "pwede ba naka-attach na digital
    // signature?" [53:41]); the screen then re-reads the log instead of keeping its own copy.
    recordWorkflowAction('ACCEPTED').then(() => {
      reloadWorkflow()
      setRefreshKey(k => k + 1)
    }).catch(e => alert(apiErrorMessage(e, 'Could not record your approval.')))
  }, [recordWorkflowAction, reloadWorkflow, reviewRecordAvailable])

  // Approve countdown: gives the approver a window to undo before it takes effect
  useEffect(() => {
    if (approvePhase === 'WAITING' && approveTimeLeft > 0) {
      approveTimerRef.current = setTimeout(() => setApproveTimeLeft(t => t - 1), 1000)
    } else if (approvePhase === 'WAITING' && approveTimeLeft === 0) {
      if (reviewRecordAvailable) {
        handleApprove()
        setApprovePhase('DONE')
        setTimeout(() => setApprovePhase('IDLE'), 1500)
      } else {
        setApprovePhase('IDLE')
      }
    }
    return () => clearTimeout(approveTimerRef.current)
  }, [approvePhase, approveTimeLeft, handleApprove, reviewRecordAvailable])

  const cancelApprove = () => { setApprovePhase('IDLE'); setApproveTimeLeft(5) }

  const handleSubmitForReview = () => {
    recordWorkflowAction('SUBMITTED').then(() => {
      reloadWorkflow()
      setRefreshKey(k => k + 1)
      setShowSubmitModal(false)
      showToastMsg('Learning Plan submitted for review!')
      navigate(backPath)
    }).catch(e => {
      setShowSubmitModal(false)
      alert(apiErrorMessage(e, 'Could not submit the learning plan.'))
    })
  }

  // Whether this role may act on the plan at its current stage. One rule for the
  // whole chain — Program Head → Director of Libraries → Industry Consultant →
  // Dean (final) → VPAA (read-only) — so this component is reused per role
  // without any role acting out of turn. `canActOnStage` in reviewGate.js owns
  // it; this component only asks.
  const isRoleActive = () => canActOnStage(roleKey, workflowState)

  const hasRoleApproved = () => {
    const wf = workflowState
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

    // Returning to sender is a disapproval, and a disapproval has to say why
    // [1:23:33] [1:23:40]. Suggested references on their own are not a reason.
    const gate = validateReturn(payload)
    if (!gate.ok) {
      showToastMsg(gate.error, 'warning')
      return
    }

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
      // The signed-in user is the one acting, so their name wins; the demo names
      // are only a fallback for a build with no session.
      const reviewer = nameForRoleWithSession(getSession(), roleKey, reviewerNames[roleKey] || 'Approver')
      const roleLabel = roleKey === 'program-head' ? 'Program Head'
        : roleKey === 'dean' ? 'Dean'
        : roleKey === 'industry-consultant' ? 'Industry Consultant'
        : roleKey === 'director-of-libraries' ? 'Director of Libraries'
        : roleKey === 'instructor' ? 'Instructor'
        : 'Department Head'

      const sectionToSave = externalSelectedSection || selectedSection
      const prepared = (payload.comments || []).map((c) => ({
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
        commentType: c.commentType || null,
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
            // The type rides along in the message — the server stores one
            // string, and the instructor's forms parse the tag back into a
            // labelled, actionable suggestion [48:30].
            message: encodeCommentType(c.commentType, c.comment),
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

      if (workflowState.currentStage !== 'returned') {
        recordWorkflowAction('RETURNED').then(() => {
          reloadWorkflow()
        }).catch(e => alert(apiErrorMessage(e, 'Could not record the return.')))
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

  // Approving used to be a confirm modal AND a countdown — two confirmations
  // for one decision [17:15] [50:56]. The countdown alone is enough: it is
  // still undoable, and it costs one click instead of two.
  const startApprove = () => { setApprovePhase('WAITING'); setApproveTimeLeft(5) }

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
          <Link to={backPath} className={'actionLink'} aria-label="Back to assigned course offerings">
            <div className={styles.return}>
              <ChevronLeft size={22} />
            </div>
          </Link>

          <div className={styles.reviewIdentity} title={resolvedCourse?.name || codeToUse || ''}>
            <strong>{codeToUse || 'Course'}</strong>
            {resolvedCourse?.name && <span>{resolvedCourse.name}</span>}
          </div>

          <div className={styles['section-select']}>
            <select value={selectedSection} onChange={handleSectionChange} aria-label="Learning plan section">
              {defaultSections.map((s) => <option key={s} value={s}>{sectionLabels[s]}</option>)}
            </select>
          </div>

          {/* approval controls — direct children of .navi like instructor */}
          {(() => {
            if (effectiveStatus !== 'approved' && roleKey === 'instructor') {
              const stage = workflowState.currentStage || 'submitted'
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
                <button type="button" className={`${styles.draft} ${(!reviewRecordAvailable || !(isRoleActive() || hasRoleApproved())) ? styles['disabled-btn'] : ''}`} aria-disabled={!reviewRecordAvailable || !(isRoleActive() || hasRoleApproved())} onClick={() => {
                  if (!reviewRecordAvailable) { showToastMsg('This course revision could not be loaded, so it cannot be reviewed.', 'warning'); return }
                  // Approvers can always ADD comments while the plan is in review —
                  // including in the returned stage or after their own approval.
                  if (isRoleActive() || hasRoleApproved()) { setReadOnlyCommentModal(false); openComment() }
                  else if (roleKey === 'dean') showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
                  else showToastMsg('Commenting is not available until the workflow reaches your review stage.', 'warning')
                }}><MessageSquare size={16} /> Add Comment</button>
                <button type="button" className={`${styles.submit} ${(!reviewRecordAvailable || !isRoleActive() || hasRoleApproved()) ? styles['disabled-btn'] : ''}`} aria-disabled={!reviewRecordAvailable || !isRoleActive() || hasRoleApproved()} onClick={() => {
                  if (!reviewRecordAvailable) { showToastMsg('This course revision could not be loaded, so it cannot be approved.', 'warning'); return }
                  if (hasRoleApproved()) showToastMsg('You have already approved this learning plan.', 'warning')
                  else if (isRoleActive()) startApprove()
                  else if (roleKey === 'dean') showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
                }}><Check size={16} /> Approve</button>
              </>)
            }
            if (effectiveStatus === 'approved' && roleKey === 'vpaa') {
              return (<>
                <div className={styles.submit} style={{ marginLeft: 'auto' }} onClick={async () => {
                  setExportingPdf(true)
                  try {
                    const logoUrl = new URL(unclogo, window.location.origin).href
                    const html = buildSyllabusHtml(syllabus, codeToUse, workflowState, logoUrl)
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

      {/* One consolidated view of the chain — who has approved, who has not,
          and the Dean's date approved [53:22]. It stays compact at the top of
          the screen so the step in front of the approver keeps the space; the
          full version, with the live chip, is on the Decision step. */}
      {!embedded && roleKey !== 'vpaa' && (
        <div className={styles['chain-strip']}>
          <ApprovalChainStatus
            workflow={workflowState}
            activeRole={roleKey}
            onActivate={() => {
              if (!reviewRecordAvailable) {
                showToastMsg('This course revision could not be loaded, so it cannot be approved.', 'warning')
              } else if (hasRoleApproved()) {
                showToastMsg('You have already approved this learning plan.', 'warning')
              } else if (isRoleActive()) {
                startApprove()
              } else {
                showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
              }
            }}
          />
        </div>
      )}

      <div className={styles['review-workspace']}>
        <div className={styles['plan-pane']}>
          <div className={styles['dynamic-sections']} ref={containerRef}>
            {initialLoading ? (
              <Spinner label="Loading learning plan…" minHeight={320} />
            ) : (
            <>
            {/* A table of blank rows is the worst of both worlds — it looks
                like the screen loaded but lost the data. Say plainly that
                there is nothing recorded instead. */}
            {activeSelectedSection === 'Course Details' && !resolvedCourse?.code && !resolvedCourse?.name && (
              <section>
                <EmptyState
                  icon={<FileText size={22} strokeWidth={1.6} />}
                  title={courseDetailsError ? 'Could not load the course details' : 'No course details recorded'}
                  hint={courseDetailsError
                    ? courseDetailsError
                    : (validPcId && validRevNum)
                      ? `Nothing has been entered for ${codeToUse || 'this course'} yet.`
                      : `This plan was opened without a revision reference, so there is nothing to load. Reach it from the approvals table rather than by typing the address.`}
                />
              </section>
            )}

            {activeSelectedSection === 'Course Details' && (resolvedCourse?.code || resolvedCourse?.name) && (
              <section ref={courseDetailsRef}>
                <TableScrollRegion label="Course details" minWidth={720} className={stylesB.courseDetailsContainer}>
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
                </TableScrollRegion>
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
          {/* Reading-order navigation. The dropdown above is the
              jump-anywhere control; the dots show where you are in the plan and
              are shortcuts in their own right; Back / Next walk it in order —
              "meron ka nalang nung parang Next" [17:23]. All three write the
              same `selectedSection`, so they cannot disagree about where you
              are. A button that could never do anything here is not rendered
              at all, rather than sitting permanently greyed out. */}
          {!embedded && (() => {
            const idx = defaultSections.indexOf(activeSelectedSection)
            const prev = idx > 0 ? defaultSections[idx - 1] : null
            const next = idx >= 0 && idx < defaultSections.length - 1 ? defaultSections[idx + 1] : null
            return (
              <div className={styles['section-nav']}>
                {prev ? (
                  <button
                    type="button"
                    title={`Back to ${sectionLabels[prev]}`}
                    onClick={() => setSelectedSection(prev)}
                    className={`${styles['section-nav-btn']} ${styles['nav-prev']}`}
                  >
                    <span aria-hidden="true">&#8592;</span>
                    <span className={styles['nav-full']}>{sectionLabels[prev]}</span>
                    <span className={styles['nav-short']}>Back</span>
                  </button>
                ) : <span />}

                <div className={styles['nav-dots']} role="tablist" aria-label="Sections">
                  {defaultSections.map((sec, i) => {
                    const current = sec === activeSelectedSection
                    return (
                      <button
                        key={sec}
                        type="button"
                        role="tab"
                        aria-selected={current}
                        aria-label={`${sectionLabels[sec]} (section ${i + 1} of ${defaultSections.length})`}
                        title={sectionLabels[sec]}
                        onClick={() => setSelectedSection(sec)}
                        className={`${styles['nav-dot']} ${current ? styles['nav-dot-active'] : ''}`}
                      >
                        <span />
                      </button>
                    )
                  })}
                </div>

                {next ? (
                  <button
                    type="button"
                    title={`Continue to ${sectionLabels[next]}`}
                    onClick={() => setSelectedSection(next)}
                    className={`${styles['section-nav-btn']} ${styles['nav-next']}`}
                  >
                    <span className={styles['nav-full']}>{`Next: ${sectionLabels[next]}`}</span>
                    <span className={styles['nav-short']}>Next</span>
                    <span aria-hidden="true">&#8594;</span>
                  </button>
                ) : <span />}
              </div>
            )
          })()}
        </div>

        {/* The comments panel used to be shown only on Course Coverage, but
            Add Comment is available on every section and the comment box can
            target references and TLAs too — so a comment raised anywhere else
            was saved and then never shown. It belongs on every section. */}
        {!embedded && roleKey !== 'vpaa' && (
          <div className={styles['comments-shell']} data-collapsed={sidebarCollapsed}>
            <button
              type="button"
              className={styles['comments-toggle']}
              onClick={() => setSidebarCollapsed(value => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSidebarCollapsed(value => !value)
                }
              }}
              aria-expanded={!sidebarCollapsed}
              aria-controls="approval-comments-panel"
            >
              <span aria-hidden="true">{sidebarCollapsed ? '<' : '>'}</span>
              <span className={styles['comments-toggle-label']}>
                {sidebarCollapsed ? `Show comments (${visibleComments.length})` : 'Hide comments'}
              </span>
            </button>
            <div
              className={styles['comments-viewport']}
              inert={sidebarCollapsed}
              aria-hidden={sidebarCollapsed}
            >
            <aside id="approval-comments-panel" className={styles['comments-panel']}>
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

              <div className={styles.commentsScroller}>
                {visibleComments.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare size={22} strokeWidth={1.6} />}
                    title="No comments yet"
                    hint={roleKey === 'instructor'
                      ? 'Comments from your reviewers will appear here once they have looked at this section.'
                      : 'Use Add Comment above to raise a revision, suggest a topic, a TLA or an AI tool.'}
                  />
                ) : (
                  <div className={styles.commentsList}>
                    {visibleComments.map((comment) => {
                      const isRecipient = ({ 'instructor': 'instructor', 'program-head': 'program_head' }[roleKey]) === comment.recipientRole
                      const coverageType = comment.coverageType || ''
                      const details = Array.isArray(comment.coverageDetail)
                        ? comment.coverageDetail.filter(Boolean)
                        : (comment.coverageDetail ? [comment.coverageDetail] : [])
                      const display = parseApprovalCommentDisplay(comment.comment, comment.suggestedRefs)
                      const compactIlo = compactCommentIlo(comment.ilo, comment.courseOutcome)
                      const roleLabel = reviewerRoleLabel(comment.role)
                      const submittedAt = comment.createdAt || comment.submittedAt
                      return (
                        <article
                          key={comment.id}
                          className={`${styles.commentCard} ${comment.resolved ? styles.commentCardResolved : ''}`}
                        >
                          <header className={styles.commentCardHeader}>
                            <div className={styles.commentContext} aria-label="Comment context">
                              {comment.courseOutcome && <span>{comment.courseOutcome}</span>}
                              {comment.courseOutcome && compactIlo && <span className={styles.contextSeparator}>›</span>}
                              {compactIlo && <span>{compactIlo}</span>}
                            </div>
                            <div className={styles.commentStatusArea}>
                              <span className={`${styles.commentStatus} ${comment.resolved ? styles.statusResolved : styles.statusPending}`}>
                                {comment.resolved ? 'Resolved' : 'Pending'}
                              </span>
                              {!comment.resolved && isRecipient && (
                                <button
                                  type="button"
                                  className={styles.resolveCommentButton}
                                  onClick={() => markCommentResolved(comment.id)}
                                >
                                  <Check size={13} /> Mark resolved
                                </button>
                              )}
                            </div>
                          </header>

                          {(coverageType || details.length > 0) && (
                            <div className={styles.commentTarget}>
                              <span className={styles.commentTargetLabel}>{coverageType || 'Target'}</span>
                              <div className={styles.commentTargetValues}>
                                {details.length > 0
                                  ? details.map((detail, index) => (
                                      <span key={`${detail}-${index}`} title={detail}>{detail}</span>
                                    ))
                                  : <span>{coverageType}</span>}
                              </div>
                            </div>
                          )}

                          <div className={styles.commentMessage}>
                            <span className={styles.commentSectionLabel}>Reviewer comment</span>
                            <p>{display.body || 'No written comment provided.'}</p>
                          </div>

                          {display.suggestions.length > 0 && (
                            <div className={styles.commentSuggestions}>
                              <span className={styles.commentSectionLabel}>Suggested references</span>
                              <ul>
                                {display.suggestions.map((reference, index) => (
                                  <li key={`${reference.title}-${index}`}>
                                    <span>{reference.title}</span>
                                    {reference.authors && <small>{reference.authors}</small>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <footer className={styles.commentMeta}>
                            <span>{roleLabel}</span>
                            <span aria-hidden="true">·</span>
                            <span>{comment.reviewer || 'Reviewer'}</span>
                            {submittedAt && (
                              <>
                                <span aria-hidden="true">·</span>
                                <time dateTime={submittedAt}>
                                  {new Date(submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </time>
                              </>
                            )}
                            {comment.resolvedAt && (
                              <span className={styles.resolvedDate}>
                                Fixed {new Date(comment.resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </footer>
                        </article>
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
          {/* No separate "are you sure?" step — the countdown below IS the
              confirmation, and it can be cancelled for the whole 5 seconds.
              Two confirmations for one decision was the click count the panel
              objected to [17:15] [50:56]. */}
          {approvePhase === 'WAITING' && (
            <div className={subStyles.submitModal}>
              <div className={subStyles.waitingBody}>
                <div className={subStyles.waitingText}>
                  Approving <strong>{codeToUse}</strong> in <strong>{approveTimeLeft}</strong> seconds...
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
        const stage = workflowState.currentStage || 'submitted'
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
      {isRevisionsOpen && (
        <Revisions
          onClose={() => setIsRevisionsOpen(false)}
          pcId={validPcId}
          revNum={validRevNum}
        />
      )}

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
