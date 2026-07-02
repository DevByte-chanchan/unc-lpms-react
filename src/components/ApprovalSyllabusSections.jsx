import React, { useEffect, useState, useRef, useMemo } from 'react'
import { Link, useSearchParams, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Info, MessageSquare, Inbox, Download } from 'react-feather'
import styles from '../styles/ApprovalSyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass'
import ApprovalCommentBox from './ApprovalCommentBox.jsx'
import { getSyllabusByCode, syllabiData } from '../data/syllabiData.js'
import { getWorkflow, setWorkflow, advanceWorkflow, resetWorkflowStage } from '../utils/workflowHelpers'
import { getSuggestions, addSuggestion, acceptSuggestion, rejectSuggestion } from '../utils/dataStore'
import { getReferences, getReferenceById } from '../utils/referenceLibrary'
import { normalizeRoleKey, isDeprecated, hasIssues, getRoleColor, getComponentTags, isRecent, reviewerSeeds } from '../utils/approvalHelpers.js'
import { fetchJson } from "../utils/api.js"
import PDFViewerModal from './PDFViewerModal'
import { buildSyllabusHtml } from "../utils/syllabusPdfHtml.js"
import unclogo from '../assets/unclogo.png'

const defaultSections = [
  'Course Details',
  'Course and Program Outcome Alignment',
  'Course Coverage',
  'References',
  'Criteria for Grading',
]

const ApprovalSyllabusSections = ({ status = 'pending', currentRole = '', courseCode = '', embedded = false, externalSelectedSection = null, workflow: workflowProp = null }) => {
  const [searchParams] = useSearchParams()
  const [selectedSection, setSelectedSection] = useState(defaultSections[0])
  const statusParam = searchParams.get('status')
  const effectiveFromUrl = (statusParam || status || '').toLowerCase()
  const fallbackStage = (() => { try { const wf = getWorkflow(courseCode || ''); return wf?.currentStage || '' } catch { return '' } })()
  const effectiveStatus = effectiveFromUrl || fallbackStage || 'submitted'
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [showCommentModal, setShowCommentModal] = useState(false)
  const [readOnlyCommentModal, setReadOnlyCommentModal] = useState(false)
  const [workflowState, setWorkflowState] = useState(() => workflowProp || getWorkflow(courseCode || ''))
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showWorkflowPopup, setShowWorkflowPopup] = useState(false)
  const [workflowPopupPos, setWorkflowPopupPos] = useState(null)
  const [globalComments, setGlobalComments] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState(null)
  const [localRefs, setLocalRefs] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [refTypeFilter, setRefTypeFilter] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [cpaData, setCpaData] = useState({ course: { code: '', title: '' }, programOutcomes: [], courseOutcomes: [] })
  const [cpaLoading, setCpaLoading] = useState(false)
  const [cpaError, setCpaError] = useState(null)

  // refs to sections for auto-scroll
  const courseDetailsRef = useRef(null)
  const alignmentRef = useRef(null)
  const coverageRef = useRef(null)
  const referencesRef = useRef(null)
  const criteriaRef = useRef(null)
  const containerRef = useRef(null)

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value)
  }
  
  const { code: routeCode } = useParams();
  const codeToUse = routeCode || courseCode || (syllabiData && syllabiData.length ? syllabiData[0].code : undefined)
  if (!routeCode && courseCode) console.debug('ApprovalSyllabusSections: using courseCode prop as fallback:', courseCode)
  if (!routeCode && !courseCode) console.debug('ApprovalSyllabusSections: no code param or prop; using first syllabiData entry:', codeToUse)
  const syllabus = getSyllabusByCode(codeToUse) || (syllabiData && syllabiData.length ? syllabiData[0] : undefined)

  // keep workflowState in sync
  useEffect(() => {
    const wf = getWorkflow(codeToUse || '')
    setWorkflowState(wf)
  }, [codeToUse])

  // load persisted comments for this course
  useEffect(() => {
    try {
      const raw = localStorage.getItem('approval_comments_v1')
      const all = raw ? JSON.parse(raw) : []
      const commentsArray = Array.isArray(all) ? all : []
      const courseComments = commentsArray.filter(c => c.courseCode === codeToUse)
      setGlobalComments(courseComments)
    } catch (e) {
      setGlobalComments([])
    }
  }, [codeToUse, refreshKey])

  // load suggestions
  useEffect(() => {
    setSuggestions(getSuggestions(codeToUse))
  }, [codeToUse, refreshKey])

  // CPA data loading (Course & Program Outcome Alignment)
  useEffect(() => {
    if (!codeToUse) return;
    let mounted = true;
    async function fetchCPA() {
      setCpaLoading(true);
      setCpaError(null);
      try {
        const data = await fetchJson('/api/course-outcome-alignment/' + encodeURIComponent(codeToUse));
        if (!mounted) return;
        setCpaData({
          course: data.course ?? { code: '', title: '' },
          programOutcomes: data.programOutcomes ?? [],
          courseOutcomes: data.courseOutcomes ?? []
        });
      } catch (err) {
        console.warn('API unavailable for CPA, using static data');
        if (!mounted) return;
        const syllabus = getSyllabusByCode(codeToUse);
        if (syllabus) {
          setCpaData({
            course: { code: syllabus.code, title: syllabus.name },
            programOutcomes: [],
            courseOutcomes: syllabus.ilos ? [...new Set(syllabus.ilos.map(i => i.courseOutcome))].map((co, idx) => ({ id: idx + 1, description: co, poMappings: [] })) : []
          });
        } else {
          setCpaError(err.message);
        }
      } finally {
        if (mounted) setCpaLoading(false);
      }
    }
    fetchCPA();
    return () => { mounted = false; };
  }, [codeToUse]);

  // safe access to syllabus references (use resolved `syllabus` like SyllabusPreview)
  const allReferences = syllabus?.references || []

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
    return globalComments
  }, [globalComments, roleKey])

  const previousComments = React.useMemo(() => {
    return globalComments
      .filter(c => normalizeRoleKey(c.role) === roleKey)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [globalComments, roleKey])

  // hardcoded reference pool for display (ensures a mix of types per syllabus)
  const refPool = React.useMemo(() => [
    { id: "TB1", title: "Software Engineering: A Practitioner's Approach", type: "Textbook", authors: "Roger S. Pressman", year: 2020, isbn: "978-1260548006", link: "" },
    { id: "TB2", title: "Software Engineering", type: "Textbook", authors: "Ian Sommerville", year: 2021, isbn: "978-0133943030", link: "" },
    { id: "TB3", title: "Clean Architecture", type: "Textbook", authors: "Robert C. Martin", year: 2018, isbn: "978-0134494166", link: "" },
    { id: "TB4", title: "Operating System Concepts", type: "Textbook", authors: "Silberschatz, Galvin, Gagne", year: 2019, isbn: "978-1119456339", link: "" },
    { id: "TB5", title: "Computer Networking: A Top-Down Approach", type: "Textbook", authors: "Kurose & Ross", year: 2022, isbn: "978-0136681557", link: "" },
    { id: "TB6", title: "Database System Concepts", type: "Textbook", authors: "Silberschatz, Korth, Sudarshan", year: 2020, isbn: "978-1260084504", link: "" },
    { id: "TB7", title: "Discrete Mathematics and Its Applications", type: "Textbook", authors: "Kenneth H. Rosen", year: 2019, isbn: "978-1259676512", link: "" },
    { id: "TB8", title: "Introduction to Algorithms", type: "Textbook", authors: "Cormen, Leiserson, Rivest, Stein", year: 2022, isbn: "978-0262046305", link: "" },
    { id: "OE1", title: "SWEBOK (Software Engineering Body of Knowledge)", type: "Open Educational Resources", authors: "IEEE Computer Society", year: 2021, isbn: "", link: "https://www.computer.org/education/bodies-of-knowledge/software-engineering" },
    { id: "OE2", title: "MIT 6.828: Operating Systems Engineering", type: "Open Educational Resources", authors: "MIT OpenCourseWare", year: 2022, isbn: "", link: "https://pdos.csail.mit.edu/6.828/" },
    { id: "OE3", title: "Beej's Guide to Network Programming", type: "Open Educational Resources", authors: "Brian Hall", year: 2023, isbn: "", link: "https://beej.us/guide/bgnet/" },
    { id: "OE4", title: "Stanford Database Course", type: "Open Educational Resources", authors: "Jennifer Widom", year: 2021, isbn: "", link: "https://cs145-fb.stanford.edu/" },
    { id: "OE5", title: "FreeCodeCamp Web Design Certification", type: "Open Educational Resources", authors: "FreeCodeCamp", year: 2023, isbn: "", link: "https://www.freecodecamp.org/" },
    { id: "OR1", title: "Agile Manifesto", type: "Online Resources", authors: "Agile Alliance", year: 2001, isbn: "", link: "https://agilemanifesto.org/" },
    { id: "OR2", title: "OWASP Top Ten", type: "Online Resources", authors: "OWASP Foundation", year: 2021, isbn: "", link: "https://owasp.org/www-project-top-ten/" },
    { id: "OR3", title: "MDN Web Docs", type: "Online Resources", authors: "Mozilla", year: 2023, isbn: "", link: "https://developer.mozilla.org/" },
    { id: "OR4", title: "NIST Cybersecurity Framework", type: "Online Resources", authors: "NIST", year: 2024, isbn: "", link: "https://www.nist.gov/cyberframework" },
    { id: "OR5", title: "PostgreSQL Documentation", type: "Online Resources", authors: "PostgreSQL Global Development Group", year: 2024, isbn: "", link: "https://www.postgresql.org/docs/" },
    { id: "OR6", title: "Scikit-learn Documentation", type: "Online Resources", authors: "Scikit-learn Developers", year: 2024, isbn: "", link: "https://scikit-learn.org/stable/" },
  ], [])

  // reset localRefs on navigation so each course gets its own seeded picks
  useEffect(() => { setLocalRefs(null) }, [codeToUse])

  // initialize syllabus-specific references: picks from refPool ensuring at least 2 types
  useEffect(() => {
    if (!localRefs && codeToUse && refPool.length > 0) {
      const hash = codeToUse.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      let seed = hash
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
      const tbs = refPool.filter(r => r.type === 'Textbook')
      const oes = refPool.filter(r => r.type === 'Open Educational Resources')
      const ors = refPool.filter(r => r.type === 'Online Resources')
      const pickOne = (arr) => arr[Math.floor(seededRandom() * arr.length)]
      const pickN = (arr, n) => [...arr].sort(() => seededRandom() - 0.5).slice(0, n)
      const picks = []
      picks.push(pickOne(tbs))
      picks.push(pickOne(oes))
      picks.push(pickOne(ors))
      const extra = 1 + Math.floor(seededRandom() * 3)
      const extras = pickN(refPool, extra)
      extras.forEach(r => { if (!picks.find(p => p.id === r.id)) picks.push(r) })
      setLocalRefs(picks)
    }
  }, [codeToUse, refPool])
  // isDeprecated, hasIssues imported from approvalHelpers

  const enrichRef = (ref) => {
    const libRef = libraryRefs.find(r => r.id === ref.id)
    return libRef ? { ...ref, ...libRef } : ref
  }
  const displayRefs = (localRefs || allReferences).map(enrichRef)

  // scroll to selected section when it changes (respect externalSelectedSection when embedded)
  useEffect(() => {
    const active = externalSelectedSection || selectedSection
    const mapping = {
      'Course Details': courseDetailsRef,
      'Course and Program Outcome Alignment': alignmentRef,
      'Course Coverage': coverageRef,
      'References': referencesRef,
      'Criteria for Grading': criteriaRef,
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
    } catch (e) {
      console.error('Failed to approve', e)
    }
    setShowApproveModal(false)
    showToastMsg('Learning Plan approved successfully!')
  }

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
    : (['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9'].map(key => ({ key })))

  const sampleILOs = [
    'CO0-ILO0',
    'CO1-ILO1',
    'CO1-ILO2',
    'CO1-ILO3',
    'CO2-ILO1',
    'CO2-ILO2',
    'CO2-ILO3',
    'CO3-ILO1'
  ]

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

      // create a submission id shared by all comments being submitted now
      const now = new Date()
      const submissionId = `${code}-${now.getTime()}`
      const submittedAt = payload.createdAt || now.toISOString()
      const submissionLabel = `Submission ${new Date(submittedAt).toLocaleString()}`

      const reviewerNames = { 'instructor': 'CASIMERO, DANNY', 'program-head': 'DANILA, JUNAR', 'dean': 'REYES, AGNES', 'director-of-libraries': 'GARCIA, CARLOS', 'industry-consultant': 'CRUZ, ROBERTO' }
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
        coverageDetail: c.coverageDetail || null,
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

      const newComments = [...allArray, ...prepared]
      localStorage.setItem(storageKey, JSON.stringify(newComments))

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

  const activeSelectedSection = externalSelectedSection || selectedSection

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
              {defaultSections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ padding: '0 16px', borderRadius: 5, background: '#dbdfe3', cursor: 'pointer', display: 'flex', alignItems: 'center', height: 40 }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const popupH = 280; setWorkflowPopupPos({ right: window.innerWidth - r.right, top: r.bottom + 4 + popupH > window.innerHeight ? r.top - popupH - 4 : r.bottom + 4 }); setShowWorkflowPopup(true); }}>
            <Info strokeWidth={2} size={18} />
          </div>

          {/* approval controls */}
          <div className={styles.actions} style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {effectiveStatus !== 'approved' && roleKey === 'instructor' && (
              <div className={styles.approvalButtons}>
                {(() => {
                  const wf = workflowState || getWorkflow(codeToUse || '')
                  const stage = wf?.currentStage || 'submitted'
                  const isReturned = stage === 'returned'
                  const hasUnresolved = globalComments.some(c => !c.resolved)
                  return (
                    <button className={styles.approve} onClick={() => {
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
                    </button>
                  )
                })()}
              </div>
            )}
            {effectiveStatus !== 'approved' && roleKey !== 'instructor' && (
              <div className={styles.approvalButtons}>
                <button className={`${styles.requestRevision} ${!isRoleActive() ? styles['disabled-btn'] : ''}`} onClick={() => {
                  if (hasRoleApproved()) { setReadOnlyCommentModal(true); openComment() }
                  else if (isRoleActive()) { setReadOnlyCommentModal(false); openComment() }
                  else if (roleKey === 'dean') showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
                  else showToastMsg('Commenting is not available until the workflow reaches your review stage.', 'warning')
                }}>{hasRoleApproved() ? 'View Comments' : 'Add Comment'}</button>
                <button className={`${styles.approve} ${(!isRoleActive() || hasRoleApproved()) ? styles['disabled-btn'] : ''}`} onClick={() => {
                  if (hasRoleApproved()) showToastMsg('You have already approved this learning plan.', 'warning')
                  else if (isRoleActive()) setShowApproveModal(true)
                  else if (roleKey === 'dean') showToastMsg('Waiting for previous approvers to complete their review.', 'warning')
                }}>Approve</button>
              </div>
            )}
            {effectiveStatus === 'approved' && (roleKey === 'instructor' || roleKey === 'dean' || roleKey === 'vpaa') && (
              <div className={styles.approvalButtons}>
                <button
                  onClick={async () => {
                    setExportingPdf(true)
                    try {
                      let logoBase64 = ''
                      try {
                        const resp = await fetch(unclogo)
                        if (resp.ok) {
                          const blob = await resp.blob()
                          logoBase64 = await new Promise((resolve) => {
                            const reader = new FileReader()
                            reader.onload = () => resolve(reader.result)
                            reader.readAsDataURL(blob)
                          })
                        }
                      } catch { console.warn('Logo fetch failed') }
                      const wf = getWorkflow(codeToUse)
                      const html = buildSyllabusHtml(syllabus, codeToUse, wf, logoBase64)
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
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', border: 'none', borderRadius: 8,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    background: exportingPdf ? '#94a3b8' : '#19282C', color: 'white',
                    fontFamily: "'Poppins', sans-serif"
                  }}
                >
                  <Download size={16} /> Export
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className={styles['dynamic-sections']} ref={containerRef}>
            {/* COURSE DETAILS (copied from SyllabusPreview) */}
            {activeSelectedSection === 'Course Details' && (
              <section ref={courseDetailsRef}>
                <div className={styles.courseDetailsContainer}>
                  <table className={styles.documentTable}>
                    <tbody>
                    <tr>
                      <th className={styles.labelCell}>Course No.</th>
                      <td className={styles.valueCell}>{syllabus?.code || ''}</td>
                      <th className={styles.descHeader}>Course Description</th>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>Course Title</th>
                      <td className={styles.valueCell}><strong>{syllabus?.name || ''}</strong></td>
                      <td rowSpan="9" className={styles.descCell}>
                        <div className={styles.descContent}>
                          {syllabus?.description || ''}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>Credit</th>
                      <td className={styles.valueCell}>{syllabus?.credits || ''}</td>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>Contact Hours/Week</th>
                      <td className={styles.valueCell}>{syllabus?.contact || ''}</td>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>Pre-requisites</th>
                      <td className={styles.valueCell}>{syllabus?.prerequisites || ''}</td>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>Classification/Field</th>
                      <td className={styles.valueCell}>{syllabus?.class || ''}</td>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>CMO</th>
                      <td className={styles.valueCell}>{syllabus?.cmo || ''}</td>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>Learning Plan Revision No.</th>
                      <td className={styles.valueCell}>{syllabus?.revision || '0'}</td>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>Year Level</th>
                      <td className={styles.valueCell}>{syllabus?.year || ''}</td>
                    </tr>
                    <tr>
                      <th className={styles.labelCell}>Term</th>
                      <td className={styles.valueCell}>{syllabus?.sem || ''}</td>
                    </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Course and Program Outcome Alignment */}
            {activeSelectedSection === 'Course and Program Outcome Alignment' && (
              <section ref={alignmentRef}>
                <div className={styles['cpa-container']}>
                  <div className={styles.legend}>
                    <span className={styles.legendTitle}>Legend:</span>
                    <div className={styles.legendItems}>
                      <span><strong>I</strong> – Introductory</span>
                      <span><strong>E</strong> – Enabling</span>
                      <span><strong>D</strong> – Demonstrative</span>
                    </div>
                  </div>

                  <div className={styles.tableScrollWrapper}>
                    {cpaLoading ? (
                      <div style={{ padding: 20, textAlign: 'center' }}>Loading Course & Program Alignment...</div>
                    ) : (
                      <table className={styles.alignmentTable}>
                        <thead>
                        <tr>
                          <th className={styles.firstColHeader}>After completion of the course, the student should be able to:</th>
                          {programOutcomes.map(po => (
                            <th key={po.key || po} className={styles.poHeader}>{po.key || po}</th>
                          ))}
                        </tr>
                        </thead>
                        <tbody>
                        {courseOutcomes.length > 0 ? courseOutcomes.map((co) => (
                          <tr key={co.id}>
                            <td className={styles.descCell}>{co.description}</td>
                            {Array.from({ length: programOutcomes.length }).map((_, idx) => (
                              <td key={idx} className={styles.mappingCell}>
                                {co.poMappings && co.poMappings[idx] ? co.poMappings[idx] : ''}
                              </td>
                            ))}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={programOutcomes.length + 1} style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                              No course outcomes / alignments found for this course.
                            </td>
                          </tr>
                        )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Course Coverage */}
            {activeSelectedSection === 'Course Coverage' && (() => {
              const ilos = syllabus?.ilos || []
              const allTopics = syllabus?.topics || []
              const allAssessments = syllabus?.assessments || []

              const ccColWidths = {
                co: '60px',
                ilo: '220px',
                topic: '250px',
                period: '100px',
                tla: '350px',
                assess: '220px',
                ref: '100px'
              }

              const getILOTopics = (ilo) => {
                return (ilo.topics || []).map(topicTitle =>
                  allTopics.find(t => t.title === topicTitle)
                ).filter(Boolean)
              }

              const getTLAsByPhase = (topics, phase) => {
                let tlas = []
                topics.forEach(topic => {
                  if (topic.tlas) {
                    const filtered = topic.tlas.filter(t => t.classPhase && t.classPhase.toLowerCase() === phase.toLowerCase())
                    tlas = [...tlas, ...filtered]
                  }
                })
                return tlas
              }

              const getAssessmentsForTLAs = (tlas) => {
                return tlas.map(tla =>
                  allAssessments.find(a => a.tlaName === tla.tlaName)
                ).filter(Boolean)
              }

              const getRefId = (refString) => (refString || '').split(' - ')[0]

              const TlaGroup = ({ title, tlas }) => {
                if (!tlas || tlas.length === 0) return null
                return (
                  <div className={styles.tlaGroupBlock}>
                    <div className={styles.tlaPhaseHeader}>{title}</div>
                    {tlas.map(tla => (
                      <div key={tla.id} className={styles.tlaItem}>
                        <div className={styles.tlaNameLine}>
                          <span className={styles.perfTag}>{tla.performedBy === 'Instructor' ? '[I]' : '[S]'}</span>
                          <span className={styles.boldText}> {tla.tlaName}</span>
                          {tla.laboratory && <span className={styles.labTag}> (Lab)</span>}
                        </div>
                        <div className={styles.descText}>{tla.tlaDescription}</div>
                      </div>
                    ))}
                  </div>
                )
              }

              return (
                <section ref={coverageRef}>
                  <div className={styles.ccContainer}>
                    <div className={styles.ccScrollWrapper}>
                      <table className={styles.ccTable}>
                        <thead>
                          <tr>
                            <th className={styles.ccHeader} style={{ width: ccColWidths.co }}>CO</th>
                            <th className={styles.ccHeader} style={{ width: ccColWidths.ilo }}>ILO</th>
                            <th className={styles.ccHeader} style={{ width: ccColWidths.topic }}>TOPIC</th>
                            <th className={styles.ccHeader} style={{ width: ccColWidths.period }}>PERIOD</th>
                            <th className={styles.ccHeader} style={{ width: ccColWidths.tla }}>TEACHING & LEARNING ACTIVITIES (TLAs)</th>
                            <th className={styles.ccHeader} style={{ width: ccColWidths.assess }}>ASSESSMENT</th>
                            <th className={styles.ccHeader} style={{ width: ccColWidths.ref }}>RESOURCES</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ilos.length > 0 ? ilos.map((ilo, index) => {
                            const isFirstOfCO = index % 3 === 0
                            const rowTopics = getILOTopics(ilo)

                            const preTLAs = getTLAsByPhase(rowTopics, 'Pre-class')
                            const inTLAs = getTLAsByPhase(rowTopics, 'In-class')
                            const postTLAs = getTLAsByPhase(rowTopics, 'Post-class')

                            const allRowTLAs = [...preTLAs, ...inTLAs, ...postTLAs]
                            const uniqueAssessments = [...new Set(getAssessmentsForTLAs(allRowTLAs))]

                            const cleanILOId = ilo.id ? (ilo.id.includes('-') ? ilo.id.split('-')[1] : ilo.id) : ''

                            return (
                              <tr key={ilo.id || index}>
                                {isFirstOfCO && (
                                  <td rowSpan={3} className={`${styles.ccCell} ${styles.centerText} ${styles.boldText}`} style={{ width: ccColWidths.co }}>
                                    {ilo.id ? ilo.id.split('-')[0] : ''}
                                  </td>
                                )}

                                <td className={styles.ccCell} style={{ width: ccColWidths.ilo }}>
                                  <div className={styles.boldText} style={{marginBottom: '5px'}}>{cleanILOId}</div>
                                  {ilo.intendedLearningOutcome}
                                </td>

                                <td className={styles.ccCell} style={{ width: ccColWidths.topic }}>
                                  {rowTopics.map(t => (
                                    <div key={t.id} className={styles.topicBlock}>
                                      <div className={styles.topicTitle}>{t.title}</div>
                                      <ul className={styles.subtopicList}>
                                        {t.subtopics && t.subtopics.map(sub => (<li key={sub.id}>{sub.value}</li>))}
                                      </ul>
                                    </div>
                                  ))}
                                </td>

                                <td className={`${styles.ccCell} ${styles.centerText}`} style={{ width: ccColWidths.period }}>
                                  <div className={styles.boldText}>{ilo.deliveryWeek}</div>
                                  <div>{ilo.allocatedTime}</div>
                                </td>

                                <td className={styles.ccCell} style={{ width: ccColWidths.tla }}>
                                  <TlaGroup title="PRE-CLASS" tlas={preTLAs} />
                                  <TlaGroup title="IN-CLASS" tlas={inTLAs} />
                                  <TlaGroup title="POST-CLASS" tlas={postTLAs} />
                                  {allRowTLAs.length === 0 && <span className={styles.descText}>No activities listed.</span>}
                                </td>

                                <td className={styles.ccCell} style={{ width: ccColWidths.assess }}>
                                  {uniqueAssessments.map((assess, i) => (
                                    <div key={i} className={styles.assessItem}>
                                      <div className={styles.boldText}>{assess.tlaName}</div>
                                      <div className={styles.descText}>{assess.assessmentMethod}</div>
                                      {assess.hasRubric && <div className={styles.rubricTag}>Rubric Available</div>}
                                    </div>
                                  ))}
                                </td>

                                <td className={`${styles.ccCell} ${styles.centerText}`} style={{ width: ccColWidths.ref }}>
                                  {(ilo.references || []).map((ref, i) => (<div key={i}>{getRefId(ref)}</div>))}
                                </td>
                              </tr>
                            )
                          }) : (
                            <tr><td colSpan={7} style={{padding: '20px', textAlign: 'center'}}>No coverage data available.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )
            })()}

            {/* References (styled like instructor) */}
            {activeSelectedSection === 'References' && (
              <section ref={referencesRef}>
                <div className={stylesB.refContainer}>
                  <div className={stylesB.refHeaderBar}>
                    <select value={refTypeFilter} onChange={e => setRefTypeFilter(e.target.value)} className={stylesB.refSelect}>
                      <option value="">ALL</option>
                      <option value="Textbook">TEXTBOOKS</option>
                      <option value="Open Educational Resources">OPEN EDUCATIONAL RESOURCES</option>
                      <option value="Online Resources">ONLINE RESOURCES</option>
                    </select>
                    <div className={stylesB.refArrow}>▼</div>
                  </div>
                  <div className={stylesB.refScrollWrapper}>
                    {refTypeFilter === '' ? (
                      /* --- ALL: one combined table --- */
                      <table className={stylesB.refTable}>
                        <thead>
                          <tr>
                            <th className={stylesB.refHeaderCell} style={{ width: 70 }}>ID</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 300 }}>TITLE</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 200 }}>AUTHOR/S</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 200 }}>LINK</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 100 }}>PUBLICATION YEAR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const all = [
                              ...displayRefs.filter(r => r.type === 'Textbook').map(r => ({ ...r, _type: 'TB' })),
                              ...displayRefs.filter(r => r.type === 'Open Educational Resources').map(r => ({ ...r, _type: 'OE' })),
                              ...displayRefs.filter(r => r.type === 'Online Resources').map(r => ({ ...r, _type: 'OR' })),
                            ];
                            return all.length > 0 ? all.map((ref, i) => (
                              <tr key={ref.id || i}>
                                <td className={stylesB.refDataCellCenter} style={{ width: 70 }}>{ref._type}{i + 1}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 300 }}>{ref.title}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 200 }}>{ref.authors}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 200 }}>
                                  {ref._type === 'TB' ? (ref.isbn || '-') : (ref.link && ref.link !== '#' ? <a href={ref.link} target="_blank" rel="noreferrer" className={stylesB.refUrlLink}>{ref.link}</a> : '-')}
                                </td>
                                <td className={stylesB.refDataCellCenter} style={{ width: 100 }}>{ref.year || '-'}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={5} className={stylesB.refEmpty}>No references found.</td></tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    ) : refTypeFilter === 'Textbook' ? (
                      /* --- TEXTBOOKS --- */
                      <table className={stylesB.refTable}>
                        <thead>
                          <tr>
                            <th className={stylesB.refHeaderCell} style={{ width: 70 }}>ID</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 300 }}>TITLE</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 200 }}>AUTHOR/S</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 200 }}>ISBN</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 100 }}>PUBLICATION YEAR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayRefs.filter(r => r.type === 'Textbook').length > 0
                          ? displayRefs.filter(r => r.type === 'Textbook').map((ref, i) => (
                              <tr key={ref.id || i}>
                                <td className={stylesB.refDataCellCenter} style={{ width: 70 }}>TB{i + 1}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 300 }}>{ref.title}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 200 }}>{ref.authors}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 200 }}>{ref.isbn || '-'}</td>
                                <td className={stylesB.refDataCellCenter} style={{ width: 100 }}>{ref.year || '-'}</td>
                              </tr>
                            ))
                          : (
                            <tr><td colSpan={5} className={stylesB.refEmpty}>No Textbooks found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    ) : refTypeFilter === 'Open Educational Resources' ? (
                      /* --- OER --- */
                      <table className={stylesB.refTable}>
                        <thead>
                          <tr>
                            <th className={stylesB.refHeaderCell} style={{ width: 70 }}>ID</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 300 }}>TITLE</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 200 }}>AUTHOR/S</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 200 }}>LINK</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 100 }}>PUBLICATION YEAR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayRefs.filter(r => r.type === 'Open Educational Resources').length > 0
                          ? displayRefs.filter(r => r.type === 'Open Educational Resources').map((ref, i) => (
                              <tr key={ref.id || i}>
                                <td className={stylesB.refDataCellCenter} style={{ width: 70 }}>OE{i + 1}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 300 }}>{ref.title}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 200 }}>{ref.authors}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 200 }}>
                                  {ref.link && ref.link !== '#' ? (
                                    <a href={ref.link} target="_blank" rel="noreferrer" className={stylesB.refUrlLink}>{ref.link}</a>
                                  ) : '-'}
                                </td>
                                <td className={stylesB.refDataCellCenter} style={{ width: 100 }}>{ref.year || '-'}</td>
                              </tr>
                            ))
                          : (
                            <tr><td colSpan={5} className={stylesB.refEmpty}>No OER found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      /* --- ONLINE RESOURCES --- */
                      <table className={stylesB.refTable}>
                        <thead>
                          <tr>
                            <th className={stylesB.refHeaderCell} style={{ width: 70 }}>ID</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 300 }}>TITLE</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 200 }}>AUTHOR/S</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 200 }}>LINK</th>
                            <th className={stylesB.refHeaderCell} style={{ width: 100 }}>PUBLICATION YEAR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayRefs.filter(r => r.type === 'Online Resources').length > 0
                          ? displayRefs.filter(r => r.type === 'Online Resources').map((ref, i) => (
                              <tr key={ref.id || i}>
                                <td className={stylesB.refDataCellCenter} style={{ width: 70 }}>OR{i + 1}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 300 }}>{ref.title}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 200 }}>{ref.authors}</td>
                                <td className={stylesB.refDataCellLeft} style={{ width: 200 }}>
                                  {ref.link && ref.link !== '#' ? (
                                    <a href={ref.link} target="_blank" rel="noreferrer" className={stylesB.refUrlLink}>{ref.link}</a>
                                  ) : '-'}
                                </td>
                                <td className={stylesB.refDataCellCenter} style={{ width: 100 }}>{ref.year || '-'}</td>
                              </tr>
                            ))
                          : (
                            <tr><td colSpan={5} className={stylesB.refEmpty}>No Online Resources found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Criteria for Grading */}
            {activeSelectedSection === 'Criteria for Grading' && (() => {
              const gradingSystem = syllabus?.gradingSystem || [];

              const calculateTotal = (period) => {
                let total = 0;
                gradingSystem.forEach(group => {
                  if (group.ilos) {
                    group.ilos.forEach(ilo => {
                      total += Number(ilo.weight?.[period] || 0);
                    });
                  }
                });
                return total;
              };

              return (
                <section ref={criteriaRef}>
                  <div className={styles.criteriaContainer}>
                    <div className={styles.tableScrollWrapper}>
                      <table className={styles.criteriaTable}>
                        <thead>
                          <tr>
                            <th rowSpan="2" className={styles.headerCell} style={{ width: '100px' }}>COURSE OUTCOME</th>
                            <th rowSpan="2" className={styles.headerCell} style={{ width: '80px' }}>ILO #</th>
                            <th rowSpan="2" className={styles.headerCell}>ASSESSMENTS</th>
                            <th colSpan="4" className={styles.headerCell}>WEIGHT %</th>
                            <th rowSpan="2" className={styles.headerCell}>MIN PASSING %</th>
                          </tr>
                          <tr className={styles.subHeaderRow}>
                            <th className={styles.subHeader}>Prelim</th>
                            <th className={styles.subHeader}>Midterm</th>
                            <th className={styles.subHeader}>Semi</th>
                            <th className={styles.subHeader}>Final</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradingSystem.length > 0 ? (
                            gradingSystem.map((group) => (
                              <React.Fragment key={group.co}>
                                {group.ilos.map((ilo, index) => (
                                  <tr key={`${group.co}-${ilo.id}`}>
                                    {index === 0 && (
                                      <td rowSpan={group.ilos.length} className={styles.coCell}>
                                        <strong>{group.co}</strong>
                                      </td>
                                    )}
                                    <td className={styles.dataCellCenter}>
                                      <span style={{ fontWeight: '500' }}>{ilo.id}</span>
                                    </td>
                                    <td className={styles.dataCellCenter}>
                                      {Array.isArray(ilo.assessments)
                                        ? ilo.assessments.join(', ')
                                        : ilo.assessments}
                                    </td>
                                    <td className={styles.dataCellCenter}>{ilo.weight?.prelim || ''}</td>
                                    <td className={styles.dataCellCenter}>{ilo.weight?.midterm || ''}</td>
                                    <td className={styles.dataCellCenter}>{ilo.weight?.semi || ''}</td>
                                    <td className={styles.dataCellCenter}>{ilo.weight?.final || ''}</td>
                                    <td className={styles.dataCellCenter}>{ilo.minPassing}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                                No grading criteria available.
                              </td>
                            </tr>
                          )}

                          <tr className={styles.totalRow}>
                            <td colSpan="3" className={styles.totalLabel}>TOTAL</td>
                            <td className={styles.dataCellCenter}>{calculateTotal('prelim')}%</td>
                            <td className={styles.dataCellCenter}>{calculateTotal('midterm')}%</td>
                            <td className={styles.dataCellCenter}>{calculateTotal('semi')}%</td>
                            <td className={styles.dataCellCenter}>{calculateTotal('final')}%</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Reference suggestions for instructor */}
            {roleKey === 'instructor' && activeSelectedSection === 'References' && suggestions.filter(s => s.status === 'pending').length > 0 && (
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
          </div>
        </div>

        {!embedded && activeSelectedSection === 'Course Coverage' && (
          <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', flexShrink: 0 }}>
            <button onClick={() => setSidebarCollapsed(c => !c)} style={{
              width: 28, border: 'none', borderLeft: '1px solid #e2e8f0', background: '#fafafa',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: sidebarCollapsed ? '#2563eb' : '#9ca3af', padding: 0, fontSize: 14, borderRadius: 0,
              transition: 'color 0.2s', position: 'relative'
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
              width: sidebarCollapsed ? 0 : 360,
              transition: 'width 0.3s ease',
              flexShrink: 0
            }}>
            <aside style={{
              width: '360px',
              flexShrink: 0,
              borderLeft: 'none',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e0e0e0',
              background: '#fafafa',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                width: '100%'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={20} strokeWidth={2} color="#4a5568" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#2d3748' }}>
                    Comments
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '12px', color: '#718096', fontWeight: 500 }}>
                    {visibleComments.length} {visibleComments.length === 1 ? 'comment' : 'comments'}
                  </span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#718096', fontWeight: 500 }}>
                {activeSelectedSection}
              </p>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '12px',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              {visibleComments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#a0aec0' }}>
                  <Inbox size={48} strokeWidth={1.5} style={{margin: '0 auto 12px'}} />
                  <p style={{fontSize: '14px', margin: 0}}>No comments yet</p>
                  <p style={{fontSize: '12px', marginTop: '4px'}}>This section has no reviewer comments</p>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                  {(() => {
                    const groups = {}
                    visibleComments.forEach((c) => {
                      const sid = c.submissionId || 'single'
                      groups[sid] = groups[sid] || { submissionLabel: c.submissionLabel || sid, submittedAt: c.submittedAt || c.createdAt || null, items: [] }
                      groups[sid].items.push(c)
                    })

                    Object.values(groups).forEach(g => {
                      g.items = (g.items || []).slice().sort((a, b) => {
                        const aa = a.createdAt || a.submittedAt || ''
                        const bb = b.createdAt || b.submittedAt || ''
                        return aa.localeCompare(bb)
                      })
                    })

                    const ordered = Object.values(groups).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
                    return ordered.map((g, gi) => (
                      <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#2d3748' }}>{g.submissionLabel}{g.submittedAt ? ` — ${new Date(g.submittedAt).toLocaleString()}` : ''}</div>
                        {g.items.map((comment, idx) => {
                          const componentTags = getComponentTags(comment);
                          const seedIndex = globalComments.indexOf(comment)
                          const seedData = reviewerSeeds[seedIndex % reviewerSeeds.length] || {}
                          const displayName = comment.reviewer || seedData.name || 'Reviewer'
                          const displayRole = comment.role || seedData.role || 'Approver'
                          return (
                            <div key={comment.id} style={{
                              background: '#f7fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '12px',
                              position: 'relative'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '8px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getRoleColor(displayRole) }}></div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{displayName}</span>
                                    {displayRole && (
                                      <span title={displayRole} style={{ fontSize: '12px', color: getRoleColor(displayRole) || '#718096', marginTop: 2, fontWeight: 500 }}>
                                        {displayRole}
                                      </span>
                                    )}
                                  </div>
                                  {isRecent(comment.createdAt || comment.submittedAt || comment.timestamp, 7) && (
                                    <span style={{ marginLeft: 8, fontSize: '11px', background: '#2d3748', color: '#fff', padding: '2px 6px', borderRadius: '12px', fontWeight: 600 }}>New</span>
                                  )}
                                </div>
                                <span style={{ fontSize: '11px', color: '#a0aec0' }}>Comment {idx + 1}</span>
                              </div>

                              {componentTags.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                  {componentTags.map((tag, i) => (
                                    <span key={i} style={{ fontSize: '10px', color: '#4a5568', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {(comment.courseOutcome || comment.ilo) && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '11px', color: '#718096' }}>
                                  {comment.courseOutcome && (
                                    <span style={{ background: '#f0f4f8', padding: '2px 6px', borderRadius: '4px' }}>
                                      <strong>CO:</strong> {comment.courseOutcome}
                                    </span>
                                  )}
                                  {comment.ilo && (
                                    <span style={{ background: '#f0f4f8', padding: '2px 6px', borderRadius: '4px' }}>
                                      <strong>ILO:</strong> {comment.ilo}
                                    </span>
                                  )}
                                </div>
                              )}

                              {(comment.coverageType || comment.coverageDetail) && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '11px', color: '#718096' }}>
                                  {comment.coverageType && (
                                    <span style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                                      <strong>{comment.coverageType}:</strong> {comment.coverageDetail || ''}
                                    </span>
                                  )}
                                </div>
                              )}

                              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#4a5568', margin: '0 0 8px 0' }}>
                                {comment.comment}
                              </p>

                              {comment.suggestedRefs && comment.suggestedRefs.length > 0 && (
                                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Suggested References:</div>
                                  {comment.suggestedRefs.map((sr, si) => (
                                    <div key={si} style={{ fontSize: 12, color: '#78350f', marginBottom: 2 }}>
                                      {sr.title}{sr.authors ? ` — ${sr.authors}` : ''}{sr.year ? ` (${sr.year})` : ''}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '8px' }}>
                                {(() => {
                                  const ts = comment.createdAt || comment.submittedAt || comment.timestamp || null
                                  return ts ? new Date(ts).toLocaleString() : ''
                                })()}
                                {(() => {
                                  const roleCanMark = { 'instructor': 'instructor', 'program-head': 'program_head' }
                                  const roleKeyToLabel = { 'instructor': 'Instructor', 'program-head': 'Program Head', 'dean': 'Dean', 'director-of-libraries': 'Director of Libraries', 'industry-consultant': 'Industry Consultant' }
                                  const isRecipient = roleCanMark[roleKey] === comment.recipientRole
                                  const isSender = comment.role === roleKeyToLabel[roleKey]
                                  if (comment.resolved) {
                                    const label = isSender ? 'Addressed ✓' : 'Resolved'
                                    return (
                                      <span style={{ marginLeft: 8, color: '#38a169', fontWeight: 600 }}>
                                        {label}{comment.resolvedAt ? ` — ${new Date(comment.resolvedAt).toLocaleString()}` : ''}
                                      </span>
                                    )
                                  } else if (isRecipient) {
                                    return (
                                      <button 
                                        onClick={() => markCommentResolved(comment.id)} 
                                        style={{ marginLeft: 8, fontSize: 12, padding: '4px 8px', color: '#ffffff', backgroundColor: '#3182ce', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                      >
                                        Mark addressed
                                      </button>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))
                  })()}
              </div>
            )}
            {effectiveStatus === 'approved' && roleKey !== 'instructor' && hasApproverComments && (
              <div className={styles.approvalButtons}>
                <button className={styles.requestRevision} onClick={() => { setReadOnlyCommentModal(true); openComment() }}>
                  View Comments
                </button>
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
        ilos={sampleILOs}
        approverRole={currentRole}
        coverageEntries={syllabus?.ilos || []}
        syllabusTopics={syllabus?.topics || []}
        syllabusReferences={displayRefs}
        readOnly={readOnlyCommentModal}
        previousComments={previousComments}
      />

      {/* ── APPROVE CONFIRMATION MODAL ─────────────────────────────────── */}
      {showApproveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }} onClick={() => setShowApproveModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, width: 420, maxWidth: '90vw', padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'Poppins', sans-serif" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="16 8 10 16 7 13" /></svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'black', margin: '0 0 10px' }}>Approve Learning Plan</h3>
            <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 300, margin: '0 0 24px', lineHeight: 1.5 }}>
              Are you sure you want to approve this learning plan for <strong>{codeToUse}</strong>? This will advance the workflow to the next stage.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={{ padding: '10px 24px', background: 'transparent', color: 'black', border: '1px solid #A4A9AF', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }} onClick={() => setShowApproveModal(false)}>Cancel</button>
              <button style={{ padding: '10px 24px', background: '#19282C', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }} onClick={handleApprove}>Approve</button>
            </div>
          </div>
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

      {/* ── WORKFLOW POPUP ──────────────────────────────────────────────── */}
      {showWorkflowPopup && (() => {
        const wf = getWorkflow(codeToUse || '')
        const submittedAt = wf.submittedAt || null
        const approvers = [
          { key: 'Industry Consultant', data: wf.parallelReview?.industry_consultant },
          { key: 'Director of Libraries', data: wf.parallelReview?.library_director },
          { key: 'Program Head', data: wf.programHead },
          { key: 'Dean', data: wf.dean },
        ]
        return (
          <>
            <div onClick={() => setShowWorkflowPopup(false)} style={{ position: 'fixed', inset: 0, zIndex: 1199 }} />
            <div style={{ position: 'fixed', right: workflowPopupPos?.right ?? 20, top: workflowPopupPos?.top ?? 80, width: 340, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 1200, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>View details</strong>
                <button onClick={() => setShowWorkflowPopup(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                </button>
              </div>
              <div style={{ fontSize: 13, marginBottom: 10 }}>
                <div style={{ color: '#666', marginBottom: 8 }}>
                  <strong>Submitted at:</strong> {submittedAt ? new Date(submittedAt).toLocaleString() : '-'}
                </div>
                {approvers.map((a, idx) => {
                  const status = a.data?.status || 'pending'
                  return (
                    <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontWeight: 600 }}>{a.key}</div>
                      </div>
                      {status === 'done' && a.data?.completedAt ? <div style={{ fontSize: 13, color: '#333' }}><strong>Approved at:</strong> {new Date(a.data.completedAt).toLocaleString()}</div> : null}
                      {status === 'returned' && a.data?.completedAt ? <div style={{ fontSize: 13, color: '#dc2626' }}><strong>Returned at:</strong> {new Date(a.data.completedAt).toLocaleString()}</div> : null}
                      {status === 'pending' ? <div style={{ fontSize: 13, color: '#999' }}>Pending</div> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )
      })()}

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
