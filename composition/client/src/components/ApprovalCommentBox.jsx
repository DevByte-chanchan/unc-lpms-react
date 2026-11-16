import Select from './Select.jsx'
import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Maximize, Minimize2, MessageSquare, Plus, RotateCcw } from 'lucide-react'
import { toast } from '../utils/toast.jsx'
import { alertDialog, confirmDialog } from '../utils/appDialog.jsx'
import styles from '../styles/ApprovalCommentBox.module.sass'
import EmptyState from './EmptyState.jsx'
import SpellCheckArea from './SpellCheckArea.jsx'
import { loadLibrary } from '../utils/referenceStore.js'
import { getReviewerByRole, getReviewerSeedData, normalizeRoleKey } from '../utils/approvalHelpers.js'
import { isReferenceDeprecated } from '../utils/referenceDiscovery.js'
import { getCatalogSettings } from '../utils/referenceCatalog.js'
import { COMMENT_TYPES, commentTypeMeta } from '../utils/reviewGate.js'
import DropdownMultiSelect from './DropdownMultiSelect.jsx'
import { subtopicChoices, topicTargets } from '../utils/commentTargets.js'
import useDialogFocus from '../utils/useDialogFocus.js'

// coverageDetail may be an array (multi-select) or a legacy string — this reports whether anything is selected
// Deprecated follows the Director's recency rule (Reference Library settings), like the library page does.
const isDeprecated = (ref) => isReferenceDeprecated(ref, new Date().getFullYear(), getCatalogSettings().recencyYears)

const hasCoverageDetail = (c) => Array.isArray(c.coverageDetail) ? c.coverageDetail.length > 0 : !!c.coverageDetail

// A consultant cannot block approval, so "Requested revision" is not theirs to pick.
const typesFor = mode => mode === 'suggest' ? COMMENT_TYPES.filter(t => t.key !== 'revision') : COMMENT_TYPES

const defaultComment = (mode) => ({
  id: (crypto.randomUUID && crypto.randomUUID()) || `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  components: { references: false, topics: false, tlas: false },
  text: '',
  comment: '',
  createdAt: new Date().toISOString(),
  reviewer: '',
  role: '',
  recipientRole: '',
  coverageType: '',
  courseOutcome: '',
  ilo: '',
  coverageDetail: [],
  // Topic comments: the picked topics' subtopics this comment narrows to (none: the whole topics).
  subtopics: [],
  commentedRefId: '',
  // "pwede syang mag-suggest ng TLA... ng topic... ng AI tools" [48:30] — the
  // instructor gets a labelled, actionable suggestion, not free text only.
  commentType: typesFor(mode)[0].key
})

const ApprovalCommentBox = ({ show = false, onClose, onSubmit, courseOutcomes = [], ilos = [], approverRole = null, syllabusTopics = [], syllabusReferences = [], readOnly = false, previousComments: previousCommentsProp = [], coToIlosProp, iloLabels = {}, coverageEntries = [], mode = 'return' }) => {
  // mode: 'return' sends the plan back to the instructor, 'comment' only adds comments (plan is already
  // returned), 'suggest' is the Industry Consultant, whose notes never return the plan.
  const verb = mode === 'return' ? 'Return with' : mode === 'suggest' ? 'Post' : 'Add'
  const outcome = mode === 'return' ? 'to return the plan' : mode === 'suggest' ? 'to post it' : 'to add it'
  const commentTypes = typesFor(mode)
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef, show)

  const [comments, setComments] = useState([defaultComment(mode)])
  const [searchTerm, setSearchTerm] = useState('')
  const [refTypeFilter, setRefTypeFilter] = useState('')
  const [selectedRefs, setSelectedRefs] = useState([])
  const [libraryRefs, setLibraryRefs] = useState([])
  const [commentedRefIds, setCommentedRefIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Director of Libraries: commenting on the plan's references and suggesting library ones are two separate tabs.
  const [directorTab, setDirectorTab] = useState('comment')
  const firstTextareaRef = useRef(null)

  useEffect(() => {
    if (show) {
      firstTextareaRef.current?.focus()
      setIsFullscreen(false)
    }
  }, [show])

  const resolvedCourseOutcomes = (courseOutcomes && courseOutcomes.length)
    ? courseOutcomes
    : []

  const fallbackCoToIlos = {
    CO1: ['ILO1', 'ILO2', 'ILO3'],
    CO2: ['ILO1', 'ILO2', 'ILO3'],
    CO3: ['ILO1', 'ILO2', 'ILO3'],
    CO4: ['ILO1', 'ILO2', 'ILO3', 'ILO4']
  }

  const coToIlos = coToIlosProp && Object.keys(coToIlosProp).length ? coToIlosProp : fallbackCoToIlos

  const resolvedIlos = (ilos && ilos.length) ? ilos : []
  const iloLabel = (id) => iloLabels[id] || id

  // The chosen week's subtopics, by topic title.
  const weekSubtopics = (c) => coverageEntries.find(e => e.id === c.ilo)?.subtopics || {}
  const pickedTopics = (c) => (Array.isArray(c.coverageDetail) ? c.coverageDetail : (c.coverageDetail ? [c.coverageDetail] : []))

  // What a comment can target: only the topics, TLAs or references of the chosen week (all of the plan's when the
  // week's own list is not known).
  const targetOptions = (c) => {
    const entry = coverageEntries.find(e => e.id === c.ilo)
    const iloTopics = entry?.topics?.length ? new Set(entry.topics) : null
    const topics = iloTopics ? syllabusTopics.filter(t => iloTopics.has(t.title)) : syllabusTopics
    if (c.coverageType === 'Topic') return topics.map(t => t.title)
    // A weekly-planner row lists its own activities; otherwise they come through its topics.
    if (c.coverageType === 'TLA') return entry?.tlas?.length ? [...new Set(entry.tlas)] : [...new Set(topics.flatMap(t => (t.tlas || []).map(tla => tla.tlaName)))]
    if (c.coverageType === 'References') {
      const own = (entry?.references || []).map(r => String(r).split(' - ').slice(1).join(' - ') || String(r))
      return own.length ? own : syllabusReferences.map(r => r.title)
    }
    return []
  }
  // The plan's own names (topics, TLAs, reference titles and authors): the spell checker never flags their words.
  const planTerms = React.useMemo(() => [
    ...syllabusTopics.map(t => t.title),
    ...syllabusTopics.flatMap(t => (t.tlas || []).map(tla => tla.tlaName)),
    ...syllabusReferences.flatMap(r => [r.title, r.authors])
  ].filter(Boolean), [syllabusTopics, syllabusReferences])

  // "CO1 — Implement the core concepts…": the number once, not "1 — CO1: Implement…".
  const courseOutcomeLabel = (co, idx) => `CO${idx + 1} — ${String(co.description || '').replace(/^\s*CO\s*\d+\s*[:.\-–]\s*/i, '')}`

  useEffect(() => {
    let live = true
    loadLibrary()
      .then(refs => { if (live) setLibraryRefs(refs.filter(ref => !ref.archived)) })
      .catch(() => { if (live) setLibraryRefs([]) })
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (!show) return
    try {
      const approver = approverRole ? getReviewerByRole(approverRole) : null
      const normalized = comments.map((c, idx) => {
        const seedData = approver || getReviewerSeedData(idx)
        return {
          ...c,
          comment: c.comment || c.text || '',
          createdAt: c.createdAt || new Date().toISOString(),
          reviewer: c.reviewer || seedData.name,
          role: c.role || seedData.role
        }
      })
      localStorage.setItem('approval_comment_draft_v1', JSON.stringify({ comments: normalized, selectedRefs, commentedRefIds, searchTerm }))
    } catch (e) { console.warn('Failed to save draft', e) }
  }, [comments, selectedRefs, commentedRefIds, searchTerm, show, approverRole])

  useEffect(() => {
    if (!show) return
    setSelectedRefs([])
    const isDir = approverRole && (String(approverRole).toLowerCase().includes('library') || String(approverRole).toLowerCase().includes('libraries'))
    if (isDir) setComments([defaultComment(mode)])
    try {
      const raw = localStorage.getItem('approval_comment_draft_v1')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed.comments && Array.isArray(parsed.comments)) {
        const approver = approverRole ? getReviewerByRole(approverRole) : null
        const normalized = parsed.comments.map((c, idx) => {
          const seedData = approver || getReviewerSeedData(idx)
          return {
            ...defaultComment(mode),
            ...c,
            comment: c.comment || c.text || '',
            createdAt: c.createdAt || new Date().toISOString(),
            reviewer: c.reviewer || seedData.name,
            role: c.role || seedData.role
          }
        })
        const roleKeyCheck = normalizeRoleKey(approverRole || (JSON.parse(localStorage.getItem('user')||'null')?.role))
        const forced = normalized.map(n => ({ ...n, recipientRole: roleKeyCheck === 'dean' ? 'program_head' : 'instructor' }))
        const isDirector = approverRole && (String(approverRole).toLowerCase().includes('library') || String(approverRole).toLowerCase().includes('libraries'))
        setComments(isDirector ? forced.slice(0, 1) : forced)
      }
      if (parsed.selectedRefs) setSelectedRefs(parsed.selectedRefs)
      if (!isDir && parsed.commentedRefIds) setCommentedRefIds(parsed.commentedRefIds)
      if (parsed.searchTerm) setSearchTerm(parsed.searchTerm)
    } catch (e) { console.warn('Failed to restore draft', e) }
  }, [show, approverRole, mode])

  const clearDraft = () => {
    try { localStorage.removeItem('approval_comment_draft_v1') } catch (e) { console.warn('Failed to clear draft', e) }
  }

  const updateComment = (commentId, patch) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...patch } : c)))
  }

  const updateCommentText = (commentId, text) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, text, comment: text } : c)))
  }

  const updateCommentCourseOutcome = (commentId, courseOutcome) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c
        const allowedIlos = coToIlos[courseOutcome] || resolvedIlos
        // No outcome, no week: the week list belongs to an outcome.
        const nextIlo = courseOutcome && allowedIlos.includes(c.ilo) ? c.ilo : ''
        return { ...c, courseOutcome, ilo: nextIlo, coverageType: '', coverageDetail: [], subtopics: [] }
      })
    )
  }

  const updateCommentCoverageType = (commentId, coverageType) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, coverageType, coverageDetail: [], subtopics: [] } : c)))
  }

  const updateCommentCoverageDetail = (commentId, coverageDetail) => {
    setComments((prev) => prev.map((c) => {
      if (c.id !== commentId) return c
      // A subtopic stays picked only while its topic is.
      const still = subtopicChoices(weekSubtopics(c), Array.isArray(coverageDetail) ? coverageDetail : [coverageDetail])
      return { ...c, coverageDetail, subtopics: (c.subtopics || []).filter(sub => still.includes(sub)) }
    }))
  }

  const updateCommentSubtopics = (commentId, subtopics) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, subtopics } : c)))
  }

  const updateCommentIlo = (commentId, ilo) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ilo } : c)))
  }

  const addCommentSection = () => {
    const seedData = approverRole ? getReviewerByRole(approverRole) : getReviewerSeedData(comments.length)
    setComments((prev) => [
      ...prev,
      {
        ...defaultComment(mode),
    id: crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        reviewer: seedData.name,
        role: seedData.role,
        recipientRole: normalizeRoleKey(approverRole) === 'dean' ? 'program_head' : 'instructor'
      }
    ])
  }

  // Clear: one comment back to empty (it keeps its place and reviewer), or every comment and suggestion.
  const clearComment = (commentId) => {
    setComments((prev) => prev.map((c) => (c.id === commentId
      ? { ...defaultComment(mode), id: c.id, reviewer: c.reviewer, role: c.role, recipientRole: c.recipientRole }
      : c)))
  }
  const clearAll = async () => {
    if (!(await confirmDialog('Every comment and suggestion in this window is emptied.', { title: 'Clear everything?', confirmLabel: 'Clear all', cancelLabel: 'Keep', danger: true }))) return
    setComments((prev) => [{ ...defaultComment(mode), reviewer: prev[0]?.reviewer, role: prev[0]?.role, recipientRole: prev[0]?.recipientRole }])
    setSelectedRefs([])
    clearDraft()
  }

  const removeCommentSection = (commentId) => {
    setComments((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.id !== commentId)))
  }

  // Escape asks the same "discard?" question as the close button (closeRef: the handler defined below).
  const closeRef = useRef(null)
  useEffect(() => {
    if (!show) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false)
        else (closeRef.current || onClose)()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen, onClose, show])

  if (!show) return null

  const hasCompleteComment = comments.some(c => c.text?.trim() && c.courseOutcome && c.ilo && c.coverageType && hasCoverageDetail(c))

  const saveDisabled = !hasCompleteComment

  // Anything picked or typed counts: closing would lose it, so the app's confirm window asks first.
  const hasUnsavedChanges = selectedRefs.length > 0 || comments.some(c => c.text?.trim() || c.courseOutcome || c.ilo || c.coverageType
    || hasCoverageDetail(c) || c.subtopics?.length || c.commentedRefId)
  const handleClose = async () => {
    if (!readOnly && hasUnsavedChanges) {
      if (!(await confirmDialog('What you picked and wrote in this window will be lost.', { title: 'Discard this comment?', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true }))) return
      clearDraft()
    }
    onClose()
  }
  closeRef.current = handleClose

  const isDirector = (() => {
    if (!approverRole) return false
    const r = String(approverRole).toLowerCase()
    return r.includes('library') || r.includes('libraries')
  })()

  const CURRENT_YEAR = new Date().getFullYear()

  // The type filter lists the types the library actually holds (a fixed list used to name types that do not exist).
  const libraryTypes = [...new Set(libraryRefs.map(ref => ref.type).filter(Boolean))].sort()
  // Current references first, newest first: the ones worth suggesting come before the deprecated ones.
  const filteredLibraryRefs = libraryRefs.filter(ref => {
    if (refTypeFilter && ref.type !== refTypeFilter) return false
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return ref.title?.toLowerCase().includes(q)
      || ref.authors?.toLowerCase().includes(q)
      || ref.type?.toLowerCase().includes(q)
  }).sort((a, b) => (isDeprecated(a) - isDeprecated(b)) || ((Number(b.year) || 0) - (Number(a.year) || 0)))

  const toggleRefSelection = (ref) => {
    setSelectedRefs(prev =>
      prev.some(r => r.id === ref.id)
        ? prev.filter(r => r.id !== ref.id)
        : [...prev, ref]
    )
  }


  // "Suggest from library": filter and search the library, tick the references the instructor should add.
  const renderRefBrowser = () => (
    <div className={styles.tabPanel}>
      <p className={styles.tabIntro}>Pick library references for the instructor to add to this plan.</p>
      <div className={styles.filterRow}>
        <Select value={refTypeFilter} onChange={(e) => setRefTypeFilter(e.target.value)} aria-label="Reference type">
          <option value="">All types</option>
          {libraryTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </Select>
        <div className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <input type="text" placeholder="Search by title, author or type" value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} aria-label="Search the library" />
        </div>
      </div>
      <div className={styles.refList}>
        {filteredLibraryRefs.length > 0 ? filteredLibraryRefs.map(ref => {
          const deprecated = isDeprecated(ref)
          const isSelected = selectedRefs.some(r => r.id === ref.id)
          return (
            <label key={ref.id} className={`${styles.refCard} ${isSelected ? styles.refCardSelected : ''}`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggleRefSelection(ref)} className={styles.refCheck} />
              <span className={styles.refInfo}>
                <span className={styles.refTitle}>{ref.title}</span>
                <span className={styles.refMeta}>{[ref.authors, ref.year].filter(Boolean).join(' · ') || 'No author or year'}</span>
                <span className={styles.refTags}>
                  <span className={styles.refType}>{ref.type}</span>
                  {deprecated && <span className={styles.refOld}>Outdated</span>}
                </span>
              </span>
            </label>
          )
        }) : (
          <EmptyState icon={<Search size={22} strokeWidth={1.6} />}
            title={searchTerm ? 'No matching references' : 'The library is empty'}
            hint={searchTerm ? 'Try another word or type.' : 'Add references in the Reference Library first.'} />
        )}
      </div>
    </div>
  )

  const previousComments = previousCommentsProp

  // The page saves the comments; it answers true, or the reason they were not saved. On failure the window stays
  // open with the draft, so nothing typed is lost and nothing looks posted that is not.
  const submitComments = async (payload) => {
    const result = onSubmit ? await onSubmit(payload) : true
    if (result !== true) {
      alertDialog(typeof result === 'string' ? result : 'The comments were not saved. Try again.', { title: 'Comments not saved' })
      return
    }
    clearDraft()
    // The toast outlives the window, so the window closes at once.
    toast('Comments submitted.')
    onClose()
  }

  const handleSubmit = () => {
    if (submitting) return
    const filledComments = comments.filter((c) => c.text?.trim() && c.courseOutcome && c.ilo && c.coverageType && hasCoverageDetail(c))
    if (filledComments.length === 0 && selectedRefs.length === 0) return

    setSubmitting(true)
    submitComments({
      courseOutcome: filledComments.find((c) => c.courseOutcome)?.courseOutcome || null,
      ilo: filledComments.find((c) => c.ilo)?.ilo || null,
      // A topic comment with subtopics picked targets those subtopics instead of the whole topics.
      comments: filledComments.map(c => (c.coverageType === 'Topic' && c.subtopics?.length
        ? { ...c, coverageDetail: topicTargets(pickedTopics(c), c.subtopics, weekSubtopics(c)) }
        : c)),
      commentedReferences: commentedRefIds,
      suggestedReferences: selectedRefs,
      createdAt: new Date().toISOString()
    }).finally(() => setSubmitting(false))
  }

  const handleDirectorSubmit = () => {
    if (submitting) return
    const filledComments = comments.filter(c => c.text?.trim() && c.commentedRefId)
    if (filledComments.length === 0 && selectedRefs.length === 0) return

    setSubmitting(true)

    submitComments({
      comments: filledComments.map(c => ({ ...c, components: {} })),
      commentedReferences: filledComments.map(c => c.commentedRefId),
      suggestedReferences: selectedRefs,
      createdAt: new Date().toISOString()
    }).finally(() => setSubmitting(false))
  }

  const directorFilled = comments.filter(c => c.text?.trim() && c.commentedRefId).length
  const directorSuggested = selectedRefs.length
  const directorParts = []
  if (directorFilled > 0) directorParts.push(`comment${directorFilled > 1 ? 's' : ''}`)
  if (directorSuggested > 0) directorParts.push(`suggestion${directorSuggested > 1 ? 's' : ''}`)
  const directorLabel = `${verb} ${directorParts.length > 0 ? directorParts.join(' and ') : 'comments'}`

  const normalFilled = comments.filter(c => c.text?.trim() && c.courseOutcome && c.ilo && c.coverageType && hasCoverageDetail(c)).length
  const normalSuggested = selectedRefs.length
  const normalParts = []
  if (normalFilled > 0) normalParts.push(`comment${normalFilled > 1 ? 's' : ''}`)
  if (normalSuggested > 0) normalParts.push(`suggestion${normalSuggested > 1 ? 's' : ''}`)
  const normalLabel = `${verb} ${normalParts.length > 0 ? normalParts.join(' and ') : (mode === 'suggest' ? 'suggestion' : 'comments')}`
  const dialogTitle = readOnly ? 'Previous comments'
    : mode === 'suggest' ? 'Add suggestion'
    : `${verb} comments${isDirector ? ' & references' : ''}`

  return (
    <>
    {!isFullscreen && <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2999 }} />}
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="approval-comment-title" data-fullscreen={isFullscreen || undefined} style={isFullscreen ? { position: 'fixed', inset: 0, zIndex: 3000, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', maxHeight: '100%', borderRadius: 0 } : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3000 }} className={styles.modal}>
      <div className="app-window-header">
        <h3 id="approval-comment-title" className="app-window-title">{dialogTitle}</h3>
        <div className="app-window-actions">
          <button type="button" className="app-icon-btn" onClick={() => setIsFullscreen(v => !v)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
          </button>
          <button type="button" className="app-icon-close" onClick={handleClose} aria-label="Close">
            <X size={16} strokeWidth={2} color="currentColor" />
          </button>
        </div>
      </div>

        <div className={styles.body}>
          {readOnly ? (
            previousComments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {previousComments.map(c => (
                  <div key={c.id} style={{ padding: '10px 12px', background: 'var(--surface-muted)', borderRadius: 6, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)' }}>{c.courseCode || ''}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{c.text || c.comment || ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MessageSquare size={22} strokeWidth={1.6} />}
                title="No comments recorded"
                hint="Reviewer comments appear here."
              />
            )
          ) : isDirector ? (
            <div className={styles.directorWrap}>
              <div className={styles.tabs} role="tablist" aria-label="What to do">
                <button type="button" role="tab" aria-selected={directorTab === 'comment'} className={`${styles.tab} ${directorTab === 'comment' ? styles.tabActive : ''}`} onClick={() => setDirectorTab('comment')}>
                  <MessageSquare size={16} aria-hidden="true" /> Comment on references
                  {directorFilled > 0 && <span className={styles.tabCount}>{directorFilled}</span>}
                </button>
                <button type="button" role="tab" aria-selected={directorTab === 'suggest'} className={`${styles.tab} ${directorTab === 'suggest' ? styles.tabActive : ''}`} onClick={() => setDirectorTab('suggest')}>
                  <Plus size={16} aria-hidden="true" /> Suggest from library
                  {directorSuggested > 0 && <span className={styles.tabCount}>{directorSuggested}</span>}
                </button>
              </div>

              {directorTab === 'comment' ? (
                <div className={styles.tabPanel}>
                  <p className={styles.tabIntro}>Point out a problem with a reference that is already in this plan.</p>
                  {syllabusReferences.length === 0 ? (
                    <EmptyState icon={<MessageSquare size={22} strokeWidth={1.6} />}
                      title="This plan has no references yet"
                      hint="Use Suggest from library to propose some." />
                  ) : (
                    <>
                      <div className={styles.directorCards}>
                        {comments.map((c, idx) => (
                          <div key={c.id} className={styles.directorCard}>
                            <div className={styles.directorCardHead}>
                              <span>Comment {idx + 1}</span>
                              <span className={styles.commentHeaderActions}>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => clearComment(c.id)} title="Empty this comment">
                                  <RotateCcw size={14} aria-hidden="true" /> Clear
                                </button>
                                {comments.length > 1 && (
                                  <button type="button" className="app-icon-close" onClick={() => removeCommentSection(c.id)} aria-label={`Remove comment ${idx + 1}`} title="Remove this comment">
                                    <X size={16} strokeWidth={2} color="currentColor" />
                                  </button>
                                )}
                              </span>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>Reference</label>
                              <Select value={c.commentedRefId} onChange={(e) => updateComment(c.id, { commentedRefId: e.target.value })} block placeholder="Select a reference in the plan">
                                <option value="">Select a reference in the plan</option>
                                {syllabusReferences.map(ref => (
                                  <option key={ref.id} value={ref.id}>{ref.title} ({ref.year || 'no year'}){isDeprecated(ref) ? ' · outdated' : ''}</option>
                                ))}
                              </Select>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>Comment</label>
                              <SpellCheckArea
                                knownWords={planTerms}
                                value={c.text || ''}
                                onChange={(next) => updateCommentText(c.id, next)}
                                placeholder="What should change, and why?"
                                disabled={readOnly}
                                padding="10px 12px"
                                minHeight={110}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className={styles.addCommentRow}>
                        <button type="button" onClick={addCommentSection} className={styles.addCommentBtn}>
                          <Plus size={16} aria-hidden="true" /> Add another comment
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : renderRefBrowser()}
            </div>
          ) : (
            <div className={styles.commentListWrapper}>
              <div className={styles.commentList}>
                {comments.map((c, idx) => {
                  return (
                    <div key={c.id} className={styles.commentItem}>
                      <div className={styles.commentHeader}>
                        <span>Comment {idx + 1}</span>
                        <span className={styles.commentHeaderActions}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => clearComment(c.id)} title="Empty this comment's fields">
                            <RotateCcw size={14} aria-hidden="true" /> Clear
                          </button>
                          {comments.length > 1 && (
                            <button type="button" className="app-icon-close" onClick={() => removeCommentSection(c.id)} aria-label={`Remove comment ${idx + 1}`} title="Remove this comment">
                              <X size={16} strokeWidth={2} color="currentColor" />
                            </button>
                          )}
                        </span>
                      </div>

                      <div className={styles.commentBody}>
                        {(c.courseOutcome || c.ilo || c.coverageType || hasCoverageDetail(c)) && (() => {
                          const details = Array.isArray(c.coverageDetail) ? c.coverageDetail : (c.coverageDetail ? [c.coverageDetail] : [])
                          const ct = c.coverageType || 'Topic'
                          // What the comment is about, as plain tags: the outcome and week in grey, the targets in the
                          // colour of their kind (topic blue, TLA violet, reference amber). Long names end in "…".
                          const chipBase = { display: 'inline-block', padding: '3px 8px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 500, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }
                          const grey = { background: '#fff', border: '1px solid var(--line)', color: 'var(--ink-soft)' }
                          const typeColors = ct === 'Topic'
                            ? { background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: '#1d4ed8' }
                            : ct === 'TLA'
                              ? { background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6d28d9' }
                              : { background: 'var(--warn-soft)', border: '1px solid var(--warn-line)', color: 'var(--warn)' }
                          const kind = ct === 'TLA' ? 'TLA' : ct === 'Topic' ? 'Topic' : 'Reference'
                          return (
                            <div style={{
                              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
                              marginBottom: 16, padding: '10px 12px',
                              background: 'var(--surface-muted)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)'
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 2 }}>
                                Commenting on
                              </span>
                              {c.courseOutcome && <span style={{ ...chipBase, ...grey }}>{c.courseOutcome}</span>}
                              {c.ilo && <span style={{ ...chipBase, ...grey }}>{iloLabel(c.ilo)}</span>}
                              {details.length > 0 ? details.map((d, di) => (
                                <span key={di} style={{ ...chipBase, ...typeColors }} title={`${kind}: ${d}`}>{kind}: {d}</span>
                              )) : c.coverageType ? (
                                <span style={{ ...chipBase, ...typeColors }}>{kind}</span>
                              ) : null}
                            </div>
                          )
                        })()}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, marginBottom: 14 }}>
                          <div className={styles.field}>
                            <label className={styles.label}>Course Outcome</label>
                            <Select value={c.courseOutcome} onChange={(e) => updateCommentCourseOutcome(c.id, e.target.value)} block>
                              <option value="">Select a course outcome</option>
                              {resolvedCourseOutcomes.map((co, idx) => (
                                <option key={co.id || co} value={co.id ? `CO${idx + 1}` : co}>
                                  {co.id ? courseOutcomeLabel(co, idx) : co}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <div className={styles.field}>
                            <label className={styles.label}>Week</label>
                            <Select value={c.ilo} onChange={(e) => updateCommentIlo(c.id, e.target.value)} disabled={!c.courseOutcome} block>
                              <option value="">Select a week</option>
                              {((c.courseOutcome && coToIlos[c.courseOutcome]) || resolvedIlos).map((i) => (
                                <option key={i} value={i}>{iloLabel(i)}</option>
                              ))}
                            </Select>
                            {!c.courseOutcome && <span className={styles.fieldHint}>Pick a course outcome first.</span>}
                          </div>

                          <div className={styles.field}>
                            <label className={styles.label}>Coverage Type</label>
                            <Select value={c.coverageType} onChange={(e) => updateCommentCoverageType(c.id, e.target.value)} disabled={!c.ilo} block>
                              <option value="">Select a type</option>
                              <option value="Topic">Topic</option>
                              <option value="References">References</option>
                              <option value="TLA">Teaching-Learning Activity (TLA)</option>
                            </Select>
                            {!c.ilo && <span className={styles.fieldHint}>Pick a week first.</span>}
                          </div>

                          <div className={styles.field}>
                            <label className={styles.label}>Target</label>
                            <DropdownMultiSelect
                              style={{ padding: 0, width: '100%' }}
                              placeholder="Select the items"
                              disabled={!c.coverageType}
                              value={Array.isArray(c.coverageDetail) ? c.coverageDetail : (c.coverageDetail ? [c.coverageDetail] : [])}
                              onChange={(vals) => updateCommentCoverageDetail(c.id, vals)}
                              options={targetOptions(c)}
                            />
                            {!c.coverageType && <span className={styles.fieldHint}>Pick a coverage type first.</span>}
                          </div>

                          {c.coverageType === 'Topic' && subtopicChoices(weekSubtopics(c), pickedTopics(c)).length > 0 && (
                            <div className={styles.field}>
                              <label className={styles.label}>Subtopics (optional)</label>
                              <DropdownMultiSelect
                                style={{ padding: 0, width: '100%' }}
                                placeholder="The whole topic"
                                value={c.subtopics || []}
                                onChange={(vals) => updateCommentSubtopics(c.id, vals)}
                                options={subtopicChoices(weekSubtopics(c), pickedTopics(c))}
                              />
                              <span className={styles.fieldHint}>Leave empty for the whole topic.</span>
                            </div>
                          )}
                        </div>

                        <div className={styles.field} style={{ marginBottom: 14 }}>
                          <label className={styles.label}>Comment Type</label>
                          <Select value={c.commentType || commentTypes[0].key} onChange={(e) => updateComment(c.id, { commentType: e.target.value })} block>
                            {commentTypes.map(t => (
                              <option key={t.key} value={t.key}>{t.label}</option>
                            ))}
                          </Select>
                          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{commentTypeMeta(c.commentType).hint}</span>
                        </div>

                        <div className={styles.field}>
                          <label className={styles.label}>Comment</label>
                          <SpellCheckArea
                            knownWords={planTerms}
                            value={c.text || ''}
                            onChange={(next) => updateCommentText(c.id, next)}
                            placeholder={'Describe the issue or suggestion...'}
                            disabled={readOnly}
                            rows={4}
                            padding="14px 10px"
                          />
                          <span className={styles.charCount}>{(c.text || '').trim().length} characters</span>
                            </div>

                      </div>
                    </div>
                  )
                })}
              </div>

              <div className={styles.addCommentRow}>
                <button type="button" onClick={addCommentSection} className={styles.addCommentBtn}>
                  <Plus size={16} aria-hidden="true" /> Add another comment
                </button>
              </div>
            </div>
          )}
        </div>

        {!readOnly && (() => {
          const blocked = isDirector ? (directorFilled === 0 && directorSuggested === 0) : saveDisabled
          const why = isDirector
            ? `Comment on a reference, or pick a library reference to suggest, ${outcome}.`
            : `Fill in a comment, with its course outcome, week, coverage type and target, ${outcome}.`
          return (
            <div className={styles.actions}>
              {hasUnsavedChanges && (
                <button type="button" className="btn btn-ghost" onClick={clearAll} title="Empty every comment and suggestion">
                  <RotateCcw size={16} aria-hidden="true" /> Clear all
                </button>
              )}
              {blocked
                ? <span className={styles.actionsHint}>{why}</span>
                : isDirector && <span className={styles.actionsHint}>{[directorFilled && `${directorFilled} comment${directorFilled > 1 ? 's' : ''}`, directorSuggested && `${directorSuggested} suggestion${directorSuggested > 1 ? 's' : ''}`].filter(Boolean).join(' · ')} ready to send</span>}
              <button type="button" onClick={handleClose} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={isDirector ? handleDirectorSubmit : handleSubmit} disabled={blocked || submitting} className="btn btn-primary">
                {isDirector ? directorLabel : normalLabel}
              </button>
            </div>
          )
        })()}
      </div>
    </>
  )
}

export default ApprovalCommentBox
