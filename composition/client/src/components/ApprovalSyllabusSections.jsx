import Select from './Select.jsx'
import React, { useEffect, useState, useRef } from 'react'
import { offeringKey } from '../utils/offeringKey.js'
import { Link, useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MessageSquare, Download, MoreVertical, Check, Clock, FileText, UserPlus, Lock, AlertTriangle, X } from 'react-feather'
import EmptyState from './EmptyState.jsx'
import Spinner from './Spinner.jsx'
import TableScrollRegion from './TableScrollRegion.jsx'
import styles from '../styles/ApprovalSyllabusSections.module.sass'
import subStyles from '../styles/SyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass'
import stylesC from '../styles/SyllabusSections.module.sass'
import dialogStyles from '../styles/DueDateDialog.module.sass'
import ApprovalCommentBox from './ApprovalCommentBox.jsx'
import { useServerWorkflow } from '../utils/useServerWorkflow.js'
import { fetchFormInfo } from '../utils/formSettings.js'
import { fetchProgramAlignment } from '../utils/programAlignment.js'
import { buildReviewRecordFile } from '../utils/exportSyllabus.js'
import { getSuggestions, addSuggestion, acceptSuggestion, rejectSuggestion } from '../utils/suggestions.js'
import { loadLibrary, serverId } from '../utils/referenceStore.js'
import { normalizeRoleKey } from '../utils/approvalHelpers.js'
import { getSession } from '../utils/session'
import ApprovalChainStatus from './ApprovalChainStatus.jsx'
import SendBackDialog from './SendBackDialog.jsx'
import {
  validateReturn,
  canActOnStage,
  canAcceptOnStage,
  exportEligibility,
  encodeCommentType,
  parseApprovalCommentDisplay,
  compactCommentIlo,
  reviewerRoleLabel,
} from '../utils/reviewGate.js'
import { fetchJson, apiErrorMessage } from "../utils/api.js"
import { describeCourseLoadError } from '../utils/courseLoadError.js'
import { canReviewLoadedCourse } from '../utils/reviewAssignments.js'
import { toPanelComments, isDuplicateComment, LEGACY_STORAGE_KEY } from "../utils/serverComments.js"

import Revisions from './Revisions.jsx'
import PDFViewerModal from './PDFViewerModal'
import { buildSyllabusHtml } from "../utils/syllabusPdfHtml.js"
import unclogo from '../assets/unclogo.png'
import CourseCoverage from './CourseCoverage'
import ReferenceSummary from './ReferenceSummary'
import EarlierConsultantNotes from './EarlierConsultantNotes'
import OutcomeAlignment from './OutcomeAlignment'
import CriteriaForGrading from './CriteriaForGrading'
import { sectionsForRole, canSeeWholePlan } from '../utils/sectionAccess.js'
import ConsultantDialog from './ConsultantDialog.jsx'



const sectionLabels = {
  'Course Details': 'Course Details',
  'Course and Program Outcome Alignment': 'Course and Program Outcome Alignment',
  'Course Coverage': 'Course Coverage',
  'References Summary': 'References',
  'Criteria for Grading': 'Criteria for Grading',
}
const defaultSections = Object.keys(sectionLabels)
// The Industry Consultant has no workflow role: they read and comment, but never accept or return.
const ACTOR_ROLE_MAP = {
  instructor: 'INSTRUCTOR',
  'director-of-libraries': 'LIBRARY_DIRECTOR',
  'program-head': 'PROGRAM_HEAD',
  dean: 'DEAN',
}

// The role a comment is attributed to. The consultant comments but is not part of the approval chain,
// so they stay out of ACTOR_ROLE_MAP (which gates workflow actions).
const COMMENT_ROLE_MAP = { ...ACTOR_ROLE_MAP, 'industry-consultant': 'INDUSTRY_CONSULTANT' }


const ApprovalSyllabusSections = ({ status = 'pending', currentRole = '', courseCode = '', embedded = false, externalSelectedSection = null, workflow: workflowProp = null, pcId = null, revNum = null }) => {
  const [searchParams] = useSearchParams()
  const [selectedSection, setSelectedSection] = useState(defaultSections[0])
  const statusParam = searchParams.get('status')
  const effectiveFromUrl = (statusParam || status || '').toLowerCase()
  // A plan's stage and who may act come from the server workflow log, never from local storage.
  const validPcId = pcId && !Number.isNaN(Number(pcId)) && String(Number(pcId)) === String(pcId) ? pcId : null
  const { workflow: serverWorkflow, plan: workflowPlan, error: workflowError, reload: reloadWorkflow } = useServerWorkflow(validPcId, courseCode)
  const workflowState = workflowProp || serverWorkflow
  // Exportable once the Director of Libraries and the Program Head have accepted, even before the Dean.
  const exportInfo = exportEligibility(workflowState)
  const fallbackStage = workflowState.currentStage === 'draft' ? '' : (workflowState.currentStage || '')
  const effectiveStatus = effectiveFromUrl || fallbackStage || 'submitted'
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()

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

  // Only the sections this role covers; the server refuses the rest (config/sectionAccess.js).
  const visibleSections = React.useMemo(() => sectionsForRole(roleKey, defaultSections), [roleKey])
  const wholePlanAccess = canSeeWholePlan(roleKey)


  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [isRevisionsOpen, setIsRevisionsOpen] = useState(false)
  const [isConsultantOpen, setIsConsultantOpen] = useState(false)
  // The comments panel's Open / Resolved / All switch.
  const [commentFilter, setCommentFilter] = useState('all')
  // Comment cards are one size; a long one is cut short until its reader opens it.
  const [expandedComments, setExpandedComments] = useState(() => new Set())
  const toggleComment = (id) => setExpandedComments(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })

  const [showCommentModal, setShowCommentModal] = useState(false)
  const [readOnlyCommentModal, setReadOnlyCommentModal] = useState(false)
  // The Program Head sending a Dean return back to the Dean (with a reason).
  const [sendBackOpen, setSendBackOpen] = useState(false)
  const closeSendBack = React.useCallback(() => setSendBackOpen(false), [])
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
  // The accreditation review record: every comment, workflow action and the final approvers.
  // Why a review action is not available right now: the plan is with the instructor, or it is not this role's turn.
  const notYourTurnMessage = (verb) => {
    if (workflowState.currentStage === 'returned') return `This plan was returned to the instructor. You can ${verb} again once it is resubmitted.`
    if (workflowState.currentStage === 'draft') return 'The instructor has not submitted this plan yet.'
    return `${verb.charAt(0).toUpperCase()}${verb.slice(1)} is not available until the workflow reaches your review stage.`
  }

  const runReviewRecord = async () => {
    setExportingPdf(true)
    try {
      setPreviewFile(await buildReviewRecordFile({ pcId: validPcId, code: codeToUse }))
    } catch (err) {
      alert('Failed to generate the review record: ' + (err?.message || err))
    } finally {
      setExportingPdf(false)
    }
  }

  const runExport = async () => {
    setExportingPdf(true)
    try {
      const logoUrl = new URL(unclogo, window.location.origin).href
      const formInfo = await fetchFormInfo()
      const programAlignment = await fetchProgramAlignment(validPcId)
      const html = buildSyllabusHtml(syllabus, codeToUse, workflowState, logoUrl, { formInfo, programAlignment, pendingApproval: exportInfo.pendingDean })
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      setPreviewFile({
        file_url: url,
        file_name: `Syllabus_${codeToUse}${exportInfo.pendingDean ? '_PENDING_DEAN_APPROVAL' : ''}.html`,
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
    // A role whose sections leave out Course Details (the Director of Libraries) never loads it; the workflow
    // endpoint names the same plan, so check against that instead.
    details: visibleSections.includes('Course Details') ? courseDetails : workflowPlan,
    error: visibleSections.includes('Course Details') ? courseDetailsError : workflowError,
  })

  // A SPINNER MUST HAVE SOMETHING TO WAIT FOR.
  //
  // This used to start with `!codeToUse ||` — so a screen opened without a
  // course code showed the spinner FOREVER. Nothing was in flight; nothing
  // would ever arrive to end it. That is the spinning circle over an empty
  // panel: not a slow server, a wait for something that was never requested.
  //
  // Now it is true only while a request is genuinely outstanding. A role that does not cover the
  // course details never requests them, so it never waits for them.
  const initialLoading = !!(validPcId && visibleSections.includes('Course Details') && courseDetailsLoading && courseDetails === null)

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

  // The comments come from the server only, for this exact plan (pcId): the server decides who may see which,
  // and names their authors. Nothing is kept in this browser, so the next person signed in here sees only their own.
  useEffect(() => {
    try { localStorage.removeItem(LEGACY_STORAGE_KEY) } catch { /* storage unavailable: nothing to clear */ }
  }, [])

  useEffect(() => {
    if (!codeToUse) { setGlobalComments([]); return undefined }
    let mounted = true
    const qs = validPcId ? `?pcId=${validPcId}` : ''
    fetchJson(`/api/comments/by-course/${encodeURIComponent(codeToUse)}${qs}`)
      .then(rows => { if (mounted) setGlobalComments(toPanelComments(rows, codeToUse)) })
      .catch(err => {
        if (!mounted) return
        setGlobalComments([])
        if (import.meta.env.DEV) console.warn('Comments could not be loaded:', err?.message)
      })
    return () => { mounted = false }
  }, [validPcId, codeToUse, refreshKey])

  // load suggestions
  useEffect(() => {
    setSuggestions(getSuggestions(codeToUse))
  }, [codeToUse, refreshKey])

  // CPA data loading (Course & Program Outcome Alignment)
  useEffect(() => {
    if (!validPcId || !visibleSections.includes('Course and Program Outcome Alignment')) return;
    let mounted = true;
    async function fetchCPA() {
      setCpaLoading(true);
      setCpaError(null);
      try {
        const data = await fetchJson(`/api/course-outcome-alignment/${offeringKey(validPcId, validRevNum)}`);
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
  }, [validPcId, validRevNum, visibleSections]);

  // API load: Course Details
  useEffect(() => {
    if (!validPcId || !visibleSections.includes('Course Details')) return;
    let mounted = true;
    async function fetchCourseDetails() {
      setCourseDetailsLoading(true);
      try {
        const data = await fetchJson(`/api/course-details/${offeringKey(validPcId, validRevNum)}`);
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
  }, [validPcId, validRevNum, visibleSections]);

  // API load: Course Coverage (ilos + topics + assessments)
  useEffect(() => {
    if (!validPcId || !visibleSections.includes('Course Coverage')) return;
    let mounted = true;
    async function fetchCoverage() {
      setCoverageLoading(true);
      try {
        const data = await fetchJson(`/api/course-coverage/${offeringKey(validPcId, validRevNum)}`);
        if (mounted) setCoverageData(data);
      } catch {
        if (mounted) setCoverageData(null);
      } finally {
        if (mounted) setCoverageLoading(false);
      }
    }
    fetchCoverage();
    return () => { mounted = false; };
  }, [validPcId, validRevNum, visibleSections]);

  // API load: Criteria for Grading
  useEffect(() => {
    if (!validPcId || !visibleSections.includes('Criteria for Grading')) return;
    let mounted = true;
    async function fetchCriteria() {
      setCriteriaLoading(true);
      try {
        const data = await fetchJson(`/api/course-criteria/${offeringKey(validPcId, validRevNum)}`);
        if (mounted) setCriteriaData(data);
      } catch {
        if (mounted) setCriteriaData(null);
      } finally {
        if (mounted) setCriteriaLoading(false);
      }
    }
    fetchCriteria();
    return () => { mounted = false; };
  }, [validPcId, validRevNum, visibleSections]);

  // API load: References
  useEffect(() => {
    if (!validPcId || !visibleSections.includes('References Summary')) return;
    let mounted = true;
    async function fetchRefs() {
      setRefLoading(true);
      try {
        const data = await fetchJson(`/api/courses/${offeringKey(validPcId, validRevNum)}/references`);
        if (mounted) setRefData(data);
      } catch {
        if (mounted) setRefData(null);
      } finally {
        if (mounted) setRefLoading(false);
      }
    }
    fetchRefs();
    return () => { mounted = false; };
  }, [validPcId, validRevNum, visibleSections]);

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
    return {
      ...resolvedCourse,
      instructor: resolvedCourse?.instructor || '',
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

  // The reference library, from the server: used to name the references a Director comment points at.
  const [libraryRefs, setLibraryRefs] = useState([])
  useEffect(() => {
    let live = true
    loadLibrary().then(refs => { if (live) setLibraryRefs(refs) }).catch(() => { if (live) setLibraryRefs([]) })
    return () => { live = false }
  }, [])

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


  // The server decides who sees which comment (utils/commentVisibility.js): each approver their own, the Dean all
  // of them, the Program Head also the Dean's. The panel shows exactly what it was sent.
  const visibleComments = React.useMemo(() => {
    if (roleKey === 'instructor') {
      return globalComments.filter(c => !(c.recipientRole === 'program_head' && !c.resolved))
    }
    return globalComments
  }, [globalComments, roleKey])

  const previousComments = React.useMemo(() => {
    return globalComments
      .filter(c => normalizeRoleKey(c.role) === roleKey)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [globalComments, roleKey])

  // Library records are keyed "srv-48", a plan's references by the bare number 48: compare them as numbers.
  const libraryRefById = (id) => libraryRefs.find(r => serverId(r.id) === serverId(id))
  // The plan's references as the server returns them (the library's copy differs only in how it names types).
  const displayRefs = allReferences

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

  // "Show in plan": open the section, then scroll to the exact row the comment is about and flash it.
  const [focusTarget, setFocusTarget] = useState(null)
  const showCommentInPlan = (comment) => {
    const section = sectionOfComment(comment)
    if (!section) return
    setSelectedSection(section)
    const details = Array.isArray(comment.coverageDetail) ? comment.coverageDetail : (comment.coverageDetail ? [comment.coverageDetail] : [])
    setFocusTarget({ section, ilo: comment.ilo, details, nonce: Date.now() })
  }
  useEffect(() => {
    if (!focusTarget || selectedSection !== focusTarget.section) return undefined
    let tries = 0
    let timer
    // The exact items the comment names (a topic, a TLA, a reference), in the comment's own ILO row when it is
    // there; the ILO row itself when the items are not found.
    const find = () => {
      const iloRow = document.querySelector(`[data-ilo-id="${CSS.escape(String(focusTarget.ilo || ''))}"]`)
      const wanted = focusTarget.details.map(detail => String(detail).trim()).filter(Boolean)
      const match = (scope) => wanted.flatMap(detail => [...scope.querySelectorAll('[data-target]')]
        .filter(el => el.dataset.target === detail || detail.includes(el.dataset.target)))
      const exact = (iloRow && match(iloRow)).length ? match(iloRow) : match(document)
      if (exact.length) return exact
      return iloRow ? [iloRow] : []
    }
    const attempt = () => {
      const found = find()
      if (found.length) {
        found[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
        found.forEach(el => {
          el.removeAttribute('data-flash')
          void el.offsetWidth // restart the animation if it is the same item again
          el.setAttribute('data-flash', '')
          window.setTimeout(() => el.removeAttribute('data-flash'), 2600)
        })
        setFocusTarget(null)
      } else if (tries++ < 15) {
        timer = window.setTimeout(attempt, 120) // the section is still loading its rows
      } else {
        setFocusTarget(null) // no row to point at: the section itself is already open
      }
    }
    timer = window.setTimeout(attempt, 350) // after the section's own scroll has started
    return () => window.clearTimeout(timer)
  }, [focusTarget, selectedSection])

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
  const recordWorkflowAction = React.useCallback((actionType, note) => {
    const actor = ACTOR_ROLE_MAP[roleKey]
    if (!actor || !codeToUse) return Promise.reject(new Error('This role cannot record a workflow action for this course.'))
    return fetchJson('/api/assignments/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_role: actor, action_type: actionType, pcId: validPcId, code: codeToUse, ...(note ? { note } : {}) })
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
  // whole chain — Director of Libraries and Program Head in parallel, then the
  // Dean (final); the Industry Consultant and VPAA are view-only — so this component is reused per role
  // without any role acting out of turn. `canActOnStage` in reviewGate.js owns
  // it; this component only asks.
  const isRoleActive = () => canActOnStage(roleKey, workflowState)

  const hasRoleApproved = () => {
    const wf = workflowState
    if (roleKey === 'director-of-libraries') return wf.parallelReview?.library_director?.status === 'done'
    if (roleKey === 'program-head') return wf.programHead?.status === 'done'
    if (roleKey === 'dean') return wf.dean?.status === 'done'
    return false
  }

  // What the comment box does for this reviewer right now: a required reviewer's comments return the plan
  // (handleSubmitComment), unless it is already returned; the consultant's are suggestions only.
  // After their own approval a reviewer may still add comments, but no longer return the plan (the server refuses it).
  const commentMode = roleKey === 'industry-consultant' ? 'suggest' : (['returned', 'with_program_head'].includes(workflowState.currentStage) || hasRoleApproved()) ? 'comment' : 'return'
  // A Dean return waiting on this Program Head: they forward it to the instructor or send it back to the Dean.
  const deanReturnWithMe = roleKey === 'program-head' && workflowState.currentStage === 'with_program_head'
  const forwardToInstructor = () => recordWorkflowAction('FORWARDED')
    .then(() => { reloadWorkflow(); setRefreshKey(k => k + 1); showToastMsg('Forwarded to the instructor, with the Dean’s comments.') })
    .catch(e => showToastMsg(apiErrorMessage(e, 'The plan could not be forwarded.'), 'error'))
  const sendBackToDean = (note) => recordWorkflowAction('COUNTERED', note)
    .then(() => { reloadWorkflow(); setRefreshKey(k => k + 1); showToastMsg('Sent back to the Dean.'); return true })
    .catch(e => apiErrorMessage(e, 'The plan could not be sent back.'))
  // An approved plan takes no new comments (the server refuses them); changes go into a new revision.
  const planClosed = workflowState.currentStage === 'approved'
  const canComment = !planClosed && (roleKey === 'industry-consultant' || isRoleActive() || hasRoleApproved())
  const commentButtonLabel = commentMode === 'return' ? 'Return with comments' : commentMode === 'suggest' ? 'Add suggestion' : 'Add comment'

  // Said on the page, not only in a toast after a click: why this approver cannot act on the plan yet.
  const isApprover = ['director-of-libraries', 'program-head', 'dean'].includes(roleKey)
  const waitingNotice = (isApprover && effectiveStatus !== 'approved' && reviewRecordAvailable && !isRoleActive() && !hasRoleApproved())
    ? (roleKey === 'dean' && !['returned', 'draft'].includes(workflowState.currentStage)
      ? 'Your review opens once the Director of Libraries and the Program Head have approved this plan.'
      : notYourTurnMessage('review'))
    : null

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

  // The ILO ids from Course Coverage ("CO1-ILO1") count the orientation ILO, but the plan does not number it: it
  // shows the orientation ILO unnumbered and the next one as ILO1. Label every ILO the way the plan does, so a
  // reviewer picks (and later reads) the same ILO the instructor sees. The id stays the value sent to the server.
  const iloLabels = React.useMemo(() => {
    const labels = {}
    const seen = {}
    for (const ilo of coverage?.ilos || []) {
      if (!ilo?.id) continue
      const co = String(ilo.id).split('-')[0]
      if (ilo.isOrientation) { labels[ilo.id] = `${co} · Orientation`; continue }
      seen[co] = (seen[co] || 0) + 1
      labels[ilo.id] = `${co}-ILO${seen[co]}`
    }
    return labels
  }, [coverage])

  // Saves the comments on the server, then (for a required reviewer) returns the plan. Resolves to true when it all
  // went through, false when it did not: the dialog then stays open with the draft, and the plan is NOT returned,
  // because a return the instructor cannot read the reason for is worse than no return.
  const handleSubmitComment = async (payload) => {
    // Returning to sender is a disapproval, and a disapproval has to say why
    // [1:23:33] [1:23:40]. Suggested references on their own are not a reason.
    const gate = validateReturn(payload)
    if (!gate.ok) {
      return gate.error
    }
    const code = codeToUse
    if (!code) {
      return 'This course could not be identified, so the comment was not saved.'
    }

    const incoming = (payload.comments || []).filter(c => c.text?.trim())
    if (incoming.some(inc => isDuplicateComment(globalComments, inc))) {
      return 'Duplicate comment: identical content already exists for this target.'
    }

    // What to send: one request per comment.
    const forMap = { 'Topic': 'topics', 'References': 'references', 'TLA': 'tlas' }
    const commenterRole = COMMENT_ROLE_MAP[roleKey] || roleKey.toUpperCase()
    const bodies = []
    if (roleKey === 'director-of-libraries') {
      // The Director comments on a reference (the server finds its ILO); suggested library titles ride along on
      // the first comment, or make a comment of their own when there is no text.
      const suggested = payload.suggestedReferences || []
      const suggestionLine = suggested.length > 0
        ? `Suggested reference${suggested.length > 1 ? 's' : ''}: ` + suggested.map(r => `${r.title}${r.authors ? ' — ' + r.authors : ''}`).join('; ')
        : ''
      incoming.forEach((c, index) => {
        const title = libraryRefById(c.commentedRefId)?.title
        const text = c.text.trim()
        bodies.push({
          message: index === 0 && suggestionLine ? `${text}

${suggestionLine}` : text,
          comment_for: 'references',
          target_titles: title ? [title] : []
        })
      })
      if (incoming.length === 0 && suggestionLine) bodies.push({ message: suggestionLine, comment_for: 'references', target_titles: [] })
    } else {
      for (const c of incoming) {
        const coIndex = c.courseOutcome ? parseInt(String(c.courseOutcome).replace(/\D/g, ''), 10) : null
        const iloIndex = c.ilo && String(c.ilo).includes('ILO') ? parseInt(String(c.ilo).split('ILO')[1], 10) : null
        if (!coIndex || !iloIndex) {
          return 'Pick a course outcome and an ILO for every comment.'
        }
        bodies.push({
          // The type rides along in the message — the server stores one string, and the instructor's forms parse
          // the tag back into a labelled, actionable suggestion [48:30].
          message: encodeCommentType(c.commentType, c.text),
          co_index: coIndex,
          ilo_index: iloIndex,
          comment_for: forMap[c.coverageType] || null,
          target_titles: Array.isArray(c.coverageDetail) ? c.coverageDetail : (c.coverageDetail ? [c.coverageDetail] : [])
        })
      }
    }

    // One at a time, stopping at the first failure, so it is clear what was saved.
    let saved = 0
    try {
      for (const body of bodies) {
        await fetchJson('/api/comments/by-course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, pcId: validPcId, commenter_role: commenterRole, ...body })
        })
        saved += 1
      }
    } catch (e) {
      setRefreshKey(k => k + 1)
      const reason = apiErrorMessage(e, 'The comment could not be saved.')
      return saved > 0
        ? `${saved} of ${bodies.length} comments were saved; the rest were not: ${reason} The plan was not returned.`
        : `${reason}${commentMode === 'return' ? ' The plan was not returned.' : ''}`
    }

    // Suggested references are also kept for the instructor's suggestion list.
    if (payload.suggestedReferences && payload.suggestedReferences.length > 0) {
      const reviewer = getSession()?.name || 'Reviewer'
      payload.suggestedReferences.forEach(ref => addSuggestion(codeToUse, ref, reviewer))
    }

    setSidebarCollapsed(false)
    setRefreshKey(k => k + 1)

    // Only a required reviewer's comments return the plan; the consultant's are documentation.
    if (commentMode === 'return') {
      try {
        await recordWorkflowAction('RETURNED')
        reloadWorkflow()
      } catch (e) {
        return apiErrorMessage(e, 'Your comments were saved, but the plan could not be returned.')
      }
    }
    return true
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
    if (!visibleSections.includes(selectedSection)) setSelectedSection(visibleSections[0])
  }, [selectedSection, visibleSections])

  const activeSelectedSection = (externalSelectedSection || selectedSection) === 'References' ? 'References Summary' : (externalSelectedSection || selectedSection)

  // Approving used to be a confirm modal AND a countdown — two confirmations
  // for one decision [17:15] [50:56]. The countdown alone is enough: it is
  // still undoable, and it costs one click instead of two.
  const startApprove = () => { setApprovePhase('WAITING'); setApproveTimeLeft(5) }

  // getRoleColor, getComponentTags, isRecent imported from approvalHelpers

  const markCommentResolved = (commentId) => {
    const updated = (globalComments || []).map(c => c.id === commentId ? { ...c, resolved: true, status: 'resolved', resolvedAt: new Date().toISOString() } : c)
    setGlobalComments(updated)
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

  // Export / review-record menu. Revisions only for an approved plan; Export once the Director of
  // Libraries and the Program Head have accepted (marked pending until the Dean does); the review
  // record (every comment, action and approver) is always available and is a separate document.
  const exportMenu = (approved) => (<>
    <div className={styles.divider}>
      <div className={styles.line}></div>
    </div>
    <div onClick={toggleMenu} ref={dropdownRef} className={`${styles.more} ${isOpen ? styles.active : ''}`}
      onKeyDown={(e) => { if (e.key === 'Escape' && isOpen) { e.stopPropagation(); setIsOpen(false); dropdownRef.current?.querySelector('button')?.focus() } }}>
      <button type="button" className={styles.moreIcon} aria-label="More actions" aria-haspopup="menu" aria-expanded={isOpen}>
        <MoreVertical strokeWidth={2} size={16} />
      </button>
      <div className={styles.dropdownMenu} role="menu">
        {approved && wholePlanAccess && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setIsRevisionsOpen(true); setIsOpen(false); }}>
            <Clock strokeWidth={2} size={14} /> Revisions
          </button>
        )}
        {roleKey === 'program-head' && !approved && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsConsultantOpen(true); }}>
            <UserPlus strokeWidth={2} size={14} /> Industry consultant
          </button>
        )}
        <button type="button" disabled={exportingPdf} onClick={(e) => { e.stopPropagation(); setIsOpen(false); runReviewRecord(); }}>
          <Download strokeWidth={2} size={14} /> Review record
        </button>
        {(approved || exportInfo.allowed) && wholePlanAccess && (
          <button type="button" disabled={exportingPdf} onClick={(e) => { e.stopPropagation(); setIsOpen(false); runExport(); }}>
            <Download strokeWidth={2} size={14} /> {exportingPdf ? 'Exporting...' : (exportInfo.pendingDean ? 'Export (pending Dean approval)' : 'Export')}
          </button>
        )}
      </div>
    </div>
  </>)

  // Comments panel: open ones first (newest first within each group), filtered by the switch.
  const resolvedCount = visibleComments.filter(c => c.resolved).length
  const listedComments = visibleComments
    .filter(c => commentFilter === 'all' || (commentFilter === 'open' ? !c.resolved : c.resolved))
    .slice()
    .sort((a, b) => (Number(Boolean(a.resolved)) - Number(Boolean(b.resolved)))
      || (new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0)))
  // The section a comment is about, for its "Show in plan" link.
  const sectionOfComment = (comment) => (comment.coverageType === 'References' ? 'References Summary' : comment.coverageType ? 'Course Coverage' : null)

  // No offering, or the log could not be read: say so in a window instead of showing the plan as a draft. The only way
  // out is back to the course list.
  if (workflowError && !workflowProp) {
    const noAccess = /do not have access/i.test(workflowError)
    return (
      <div className={styles.container}>
        <div role="presentation" className={dialogStyles.backdrop} />
        <div role="alertdialog" aria-modal="true" aria-labelledby="plan-unavailable-title" className={dialogStyles.window}
          onKeyDown={(event) => { if (event.key === 'Escape') navigate(backPath) }}>
          <div className="app-window-header">
            <h2 id="plan-unavailable-title" className="app-window-title">{noAccess ? 'No access to this learning plan' : 'Learning plan unavailable'}</h2>
            <button type="button" className="app-icon-close" aria-label="Close and go back to the course list" onClick={() => navigate(backPath)}>
              <X size={16} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
          <div className={dialogStyles.body}>
            <div className={dialogStyles.notice}>
              <span className={`${dialogStyles.noticeIcon} ${noAccess ? '' : dialogStyles.noticeIconWarn}`} aria-hidden="true">
                {noAccess ? <Lock size={18} /> : <AlertTriangle size={18} />}
              </span>
              <div>
                {codeToUse && <div className={dialogStyles.noticeCourse}>{codeToUse}{resolvedCourse?.name ? ` · ${resolvedCourse.name}` : ''}</div>}
                <div className={dialogStyles.noticeText}>{noAccess
                  ? 'You are no longer assigned to review this course, or this link is out of date. Your current learning plans are in your course list.'
                  : workflowError}</div>
              </div>
            </div>
          </div>
          <div className={dialogStyles.actions}>
            <button type="button" className="btn btn-primary" autoFocus onClick={() => navigate(backPath)}>Back to course list</button>
          </div>
        </div>
      </div>
    )
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
            <Select value={selectedSection} onChange={handleSectionChange} aria-label="Learning plan section" block>
              {visibleSections.map((s) => <option key={s} value={s}>{sectionLabels[s]}</option>)}
            </Select>
          </div>

          {/* approval controls — direct children of .navi like instructor */}
          {(() => {
            if (effectiveStatus !== 'approved' && roleKey === 'instructor') {
              const stage = workflowState.currentStage || 'submitted'
              const isReturned = stage === 'returned'
              // Industry Consultant comments are documentation: they never block a resubmission.
              const hasUnresolved = globalComments.some(c => c.recipientRole === 'instructor' && !c.resolved && c.role !== 'Industry Consultant')
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
            if (deanReturnWithMe) {
              return (<>
                <button type="button" className="btn btn-secondary" onClick={() => { setReadOnlyCommentModal(false); openComment() }}>
                  <MessageSquare size={16} /> Add comment
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSendBackOpen(true)}>Send back to the Dean</button>
                <button type="button" className="btn btn-primary" onClick={forwardToInstructor}>Forward to instructor</button>
              </>)
            }
            if (effectiveStatus !== 'approved' && roleKey !== 'instructor') {
              return (<>
                {/* The plan is with its instructor (not submitted, or returned): the Program Head can remind them. */}
                <button type="button" className={`btn btn-secondary ${(!reviewRecordAvailable || !canComment) ? styles['disabled-btn'] : ''}`} aria-disabled={!reviewRecordAvailable || !canComment} onClick={() => {
                  if (!reviewRecordAvailable) { showToastMsg('This course revision could not be loaded, so it cannot be reviewed.', 'warning'); return }
                  if (planClosed) { showToastMsg('This plan is already approved, so it no longer takes comments.', 'warning'); return }
                  // Approvers can always ADD comments while the plan is in review —
                  // including in the returned stage or after their own approval.
                  if (canComment) { setReadOnlyCommentModal(false); openComment() }
                  else if (roleKey === 'dean' && workflowState.currentStage !== 'returned' && workflowState.currentStage !== 'draft') showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
                  else showToastMsg(notYourTurnMessage('comment'), 'warning')
                }}><MessageSquare size={16} /> {commentButtonLabel}</button>
                {roleKey !== 'industry-consultant' && (<button type="button" className={`btn btn-primary ${(!reviewRecordAvailable || !canAcceptOnStage(roleKey, workflowState) || hasRoleApproved()) ? styles['disabled-btn'] : ''}`} aria-disabled={!reviewRecordAvailable || !canAcceptOnStage(roleKey, workflowState) || hasRoleApproved()} onClick={() => {
                  if (!reviewRecordAvailable) { showToastMsg('This course revision could not be loaded, so it cannot be approved.', 'warning'); return }
                  if (hasRoleApproved()) showToastMsg('You have already approved this learning plan.', 'warning')
                  else if (canAcceptOnStage(roleKey, workflowState)) startApprove()
                  else if (workflowState.currentStage === 'returned') showToastMsg('This plan was returned to the instructor. You can approve it after the instructor resubmits it.', 'warning')
                  else if (roleKey === 'dean' && workflowState.currentStage !== 'returned' && workflowState.currentStage !== 'draft') showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
                  else showToastMsg(notYourTurnMessage('approve'), 'warning')
                }}><Check size={16} /> Approve</button>)}
              </>)
            }
            if (effectiveStatus === 'approved' && roleKey === 'vpaa') {
              return (<>
                <div className={styles.submit} style={{ marginLeft: 'auto' }} onClick={async () => {
                  setExportingPdf(true)
                  try {
                    const logoUrl = new URL(unclogo, window.location.origin).href
                    const formInfo = await fetchFormInfo()
                    const programAlignment = await fetchProgramAlignment(validPcId)
                    const html = buildSyllabusHtml(syllabus, codeToUse, workflowState, logoUrl, { formInfo, programAlignment })
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
            if (effectiveStatus === 'approved') return exportMenu(true)
            return null
          })()}
          {effectiveStatus !== 'approved' && roleKey !== 'vpaa' && exportMenu(false)}
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
              } else if (canAcceptOnStage(roleKey, workflowState)) {
                startApprove()
              } else {
                showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
              }
            }}
          />
          {waitingNotice && <p className={styles.waitingNotice} role="status"><Clock size={14} /> {waitingNotice}</p>}
          {deanReturnWithMe && <p className={styles.waitingNotice} role="status"><Clock size={14} /> The Dean returned this plan to you. Read the Dean&apos;s comments, then forward it to the instructor or send it back to the Dean.</p>}
          {roleKey === 'dean' && workflowState.counterNote && workflowState.currentStage !== 'approved' && (
            <p className={styles.waitingNotice} role="status"><Clock size={14} /> Sent back by the Program Head: &ldquo;{workflowState.counterNote}&rdquo;</p>
          )}
        </div>
      )}

      <div className={styles['review-workspace']}>
        <div className={styles['plan-pane']}>
          <div className={styles['dynamic-sections']} ref={containerRef}>
            {initialLoading ? (
              <Spinner label="Loading learning plan…" minHeight={320} />
            ) : (
            <>
            {(roleKey === 'program-head' || roleKey === 'industry-consultant') && <EarlierConsultantNotes pcId={validPcId} />}
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
                    : (validPcId)
                      ? `Nothing has been entered for ${codeToUse || 'this course'} yet.`
                      : `This plan was opened without a revision reference, so there is nothing to load. Reach it from the approvals table rather than by typing the address.`}
                />
              </section>
            )}

            {activeSelectedSection === 'Course Details' && (resolvedCourse?.code || resolvedCourse?.name) && (
              <section ref={courseDetailsRef}>
                <TableScrollRegion label="Course details" minWidth={480} className={stylesB.courseDetailsContainer}>
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
              <div style={{ marginTop: 24, padding: '16px', background: 'var(--warn-soft)', border: '1px solid #fde68a', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, color: 'var(--warn)' }}>
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
                        <button onClick={() => handleAcceptSuggestion(s.id)} className="btn btn-primary btn-sm">Accept</button>
                        <button onClick={() => handleRejectSuggestion(s.id)} className="btn btn-danger btn-sm">Reject</button>
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
          {/* One section (the Director of Libraries sees References only) has nowhere to go: no lone dot. */}
          {!embedded && visibleSections.length > 1 && (() => {
            const idx = visibleSections.indexOf(activeSelectedSection)
            const prev = idx > 0 ? visibleSections[idx - 1] : null
            const next = idx >= 0 && idx < visibleSections.length - 1 ? visibleSections[idx + 1] : null
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
                  {visibleSections.map((sec, i) => {
                    const current = sec === activeSelectedSection
                    return (
                      <button
                        key={sec}
                        type="button"
                        role="tab"
                        aria-selected={current}
                        aria-label={`${sectionLabels[sec]} (section ${i + 1} of ${visibleSections.length})`}
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
              title={sidebarCollapsed ? 'Show comments' : 'Hide comments'}
            >
              <span aria-hidden="true" className={styles['comments-toggle-icon']}>{sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</span>
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
                  {resolvedCount > 0 && ` · ${resolvedCount} resolved`}
                </span>
              </div>
              {visibleComments.length > 0 && (
                <div className={styles.commentFilter} role="group" aria-label="Show comments">
                  {[['all', 'All'], ['open', 'Open'], ['resolved', 'Resolved']].map(([key, label]) => (
                    <button key={key} type="button" aria-pressed={commentFilter === key}
                      className={`${styles.commentFilterBtn} ${commentFilter === key ? styles.commentFilterOn : ''}`}
                      onClick={() => setCommentFilter(key)}>{label}</button>
                  ))}
                </div>
              )}

              <div className={styles.commentsScroller}>
                {visibleComments.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare size={22} strokeWidth={1.6} />}
                    title="No comments yet"
                    hint={roleKey === 'instructor'
                      ? 'Comments from your reviewers will appear here once they have looked at this section.'
                      : waitingNotice
                        ? 'Comments open when the plan reaches your review.'
                        : roleKey === 'industry-consultant'
                          ? 'Use Add suggestion above to suggest a topic, a TLA or an AI tool.'
                          : roleKey === 'director-of-libraries'
                            ? `Use ${commentButtonLabel} above to comment on a reference or suggest one from the library.`
                            : `Use ${commentButtonLabel} above to raise a revision, suggest a topic, a TLA or an AI tool.`}
                  />
                ) : listedComments.length === 0 ? (
                  <EmptyState
                    icon={<Check size={22} strokeWidth={1.6} />}
                    title={commentFilter === 'open' ? 'No open comments' : 'No resolved comments'}
                    hint="Change the switch above to see the others."
                  />
                ) : (
                  <div className={styles.commentsList}>
                    {listedComments.map((comment) => {
                      const isRecipient = ({ 'instructor': 'instructor', 'program-head': 'program_head' }[roleKey]) === comment.recipientRole
                      const coverageType = comment.coverageType || ''
                      const details = Array.isArray(comment.coverageDetail)
                        ? comment.coverageDetail.filter(Boolean)
                        : (comment.coverageDetail ? [comment.coverageDetail] : [])
                      const display = parseApprovalCommentDisplay(comment.comment, comment.suggestedRefs)
                      const compactIlo = compactCommentIlo(iloLabels[comment.ilo] || comment.ilo, comment.courseOutcome)
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
                                {comment.resolved ? 'Resolved' : 'Open'}
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

                          {(() => {
                            const text = display.body || 'No written comment provided.'
                            const isLong = text.length > 140 || text.split('\n').length > 3
                            const open = expandedComments.has(comment.id)
                            return (
                              <div className={styles.commentMessage}>
                                <p className={isLong && !open ? styles.commentClamped : isLong ? styles.commentOpen : undefined}>{text}</p>
                                {isLong && (
                                  <button type="button" className={styles.commentToggle} aria-expanded={open} onClick={() => toggleComment(comment.id)}>
                                    {open ? <>Show less <ChevronUp size={13} aria-hidden="true" /></> : <>Show more <ChevronDown size={13} aria-hidden="true" /></>}
                                  </button>
                                )}
                              </div>
                            )
                          })()}

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
                            {sectionOfComment(comment) && visibleSections.includes(sectionOfComment(comment)) && (
                              <button type="button" className={styles.commentJump} onClick={() => showCommentInPlan(comment)}>
                                Show in plan <ChevronRight size={13} aria-hidden="true" />
                              </button>
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
      <SendBackDialog open={sendBackOpen} onClose={closeSendBack} onSend={sendBackToDean} courseCode={codeToUse} />
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
        iloLabels={iloLabels}
        mode={commentMode}
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
                <button className="btn btn-secondary" onClick={cancelApprove}>Cancel Approval</button>
              </div>
            </div>
          )}

          {approvePhase === 'DONE' && (
            <div className={subStyles.submitModal}>
              <div className={subStyles.waitingBodyCenter}>
                <div className={subStyles.successIcon}>✓</div>
                <div className={subStyles.waitingTextSmall}>{roleKey === 'dean' ? 'Learning Plan Approved!' : 'Your approval is recorded.'}</div>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowSubmitModal(false)}>
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
              <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitForReview}>{isReturned ? 'Submit Revision' : 'Submit'}</button>
            </div>
          </div>
        </div>
        )
      })()}

      <ConsultantDialog open={isConsultantOpen} onClose={() => setIsConsultantOpen(false)} courseCode={codeToUse} />

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
          background: toast.type === 'warning' ? 'var(--danger-solid)' : 'var(--good)',
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
