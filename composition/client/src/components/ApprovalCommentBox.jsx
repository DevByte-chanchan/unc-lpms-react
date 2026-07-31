import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Maximize, Minimize2, CheckCircle, AlertCircle } from 'react-feather'
import styles from '../styles/ApprovalCommentBox.module.sass'
import { getReferences } from '../utils/referenceLibrary.js'
import { getReviewerByRole, getReviewerSeedData, normalizeRoleKey, isDeprecated } from '../utils/approvalHelpers.js'
import DropdownMultiSelect from './DropdownMultiSelect.jsx'

// coverageDetail may be an array (multi-select) or a legacy string — this reports whether anything is selected
const hasCoverageDetail = (c) => Array.isArray(c.coverageDetail) ? c.coverageDetail.length > 0 : !!c.coverageDetail

const ApprovalCommentBox = ({ show = false, onClose, onSubmit, courseOutcomes = [], ilos = [], approverRole = null, coverageEntries = [], syllabusTopics = [], syllabusReferences = [], readOnly = false, previousComments: previousCommentsProp = [], coToIlosProp }) => {
  const storageKey = 'approval_comments_v1'

  const defaultComment = () => ({
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
    commentedRefId: ''
  })

  const [comments, setComments] = useState([defaultComment()])
  const [searchTerm, setSearchTerm] = useState('')
  const [refTypeFilter, setRefTypeFilter] = useState('')
  const [selectedRefs, setSelectedRefs] = useState([])
  const [libraryRefs, setLibraryRefs] = useState([])
  const [toast, setToast] = useState(null)
  const [commentedRefIds, setCommentedRefIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const firstTextareaRef = useRef(null)

  useEffect(() => {
    if (show) {
      firstTextareaRef.current?.focus()
      setIsFullscreen(false)
    }
  }, [show])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

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

  useEffect(() => {
    setLibraryRefs(getReferences())
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
  }, [comments, selectedRefs, searchTerm, show, approverRole])

  useEffect(() => {
    if (!show) return
    setSelectedRefs([])
    const isDir = approverRole && (String(approverRole).toLowerCase().includes('library') || String(approverRole).toLowerCase().includes('libraries'))
    if (isDir) setComments([defaultComment()])
    try {
      const raw = localStorage.getItem('approval_comment_draft_v1')
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed.comments && Array.isArray(parsed.comments)) {
        const approver = approverRole ? getReviewerByRole(approverRole) : null
        const normalized = parsed.comments.map((c, idx) => {
          const seedData = approver || getReviewerSeedData(idx)
          return {
            ...defaultComment(),
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
      if (!isDirector && parsed.commentedRefIds) setCommentedRefIds(parsed.commentedRefIds)
      if (parsed.searchTerm) setSearchTerm(parsed.searchTerm)
    } catch (e) { console.warn('Failed to restore draft', e) }
  }, [show, approverRole])

  const clearDraft = () => {
    try { localStorage.removeItem('approval_comment_draft_v1') } catch (e) { console.warn('Failed to clear draft', e) }
  }

  const toggleCommentComponent = (commentId, key) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, components: { ...c.components, [key]: !c.components[key] } } : c))
    )
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
        const nextIlo = allowedIlos.includes(c.ilo) ? c.ilo : ''
        return { ...c, courseOutcome, ilo: nextIlo, coverageType: '', coverageDetail: [] }
      })
    )
  }

  const updateCommentCoverageType = (commentId, coverageType) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, coverageType, coverageDetail: [] } : c)))
  }

  const updateCommentCoverageDetail = (commentId, coverageDetail) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, coverageDetail } : c)))
  }

  const updateCommentIlo = (commentId, ilo) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ilo } : c)))
  }

  const updateRecipientRole = (commentId, recipientRole) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, recipientRole } : c)))
  }

  const addCommentSection = () => {
    const seedData = approverRole ? getReviewerByRole(approverRole) : getReviewerSeedData(comments.length)
    setComments((prev) => [
      ...prev,
      {
        ...defaultComment(),
    id: crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        reviewer: seedData.name,
        role: seedData.role,
        recipientRole: normalizeRoleKey(approverRole) === 'dean' ? 'program_head' : 'instructor'
      }
    ])
  }

  const removeCommentSection = (commentId) => {
    setComments((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.id !== commentId)))
  }

  useEffect(() => {
    if (!show) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen, onClose, show])

  if (!show) return null

  const commentsWithText = comments.filter((c) => c.text && c.text.trim())
  const hasCompleteComment = comments.some(c => c.text?.trim() && c.courseOutcome && c.ilo && c.coverageType && hasCoverageDetail(c))

  const saveDisabled = !hasCompleteComment

  const hasUnsavedChanges = comments.some(c => c.text?.trim())
  const handleClose = () => {
    if (!readOnly && hasUnsavedChanges) { setShowDiscardConfirm(true); return }
    onClose()
  }
  const confirmDiscard = () => { setShowDiscardConfirm(false); onClose() }
  const cancelDiscard = () => setShowDiscardConfirm(false)

  const isDirector = (() => {
    if (!approverRole) return false
    const r = String(approverRole).toLowerCase()
    return r.includes('library') || r.includes('libraries')
  })()

  const CURRENT_YEAR = new Date().getFullYear()

  const filteredLibraryRefs = libraryRefs.filter(ref => {
    if (refTypeFilter && ref.type !== refTypeFilter) return false
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return ref.title?.toLowerCase().includes(q)
      || ref.authors?.toLowerCase().includes(q)
      || ref.type?.toLowerCase().includes(q)
  })

  const toggleRefSelection = (ref) => {
    setSelectedRefs(prev =>
      prev.some(r => r.id === ref.id)
        ? prev.filter(r => r.id !== ref.id)
        : [...prev, ref]
    )
  }

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case 'Textbook': return { background: '#dcfce7', color: '#047857' }
      case 'Open Educational Resources': return { background: '#e0f2fe', color: '#0284c7' }
      case 'Online Resources': return { background: '#f3e8ff', color: '#7c3aed' }
      default: return { background: '#f3f4f6', color: '#374151' }
    }
  }

  const renderRefBrowser = () => (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, background: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(isFullscreen ? { flex: 1 } : { height: 480 }) }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#111827' }}>Suggest References from Library</div>
      <select
        value={refTypeFilter}
        onChange={(e) => setRefTypeFilter(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, fontFamily: "'Poppins', sans-serif", background: '#fff', color: '#374151', marginBottom: 12, boxSizing: 'border-box' }}
      >
        <option value="">All Types</option>
        <option value="Textbook">Textbooks</option>
        <option value="Open Educational Resources">Open Educational Resources</option>
        <option value="Online Resources">Online Resources</option>
      </select>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #A4A9AF', borderRadius: 6, padding: '10px 16px', marginBottom: 12, background: '#fff' }}>
        <Search size={16} color="#9ca3af" />
        <input
          type="text"
          placeholder="Search by title, author, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 18, ...(isFullscreen ? { flex: 1, minHeight: 0 } : { maxHeight: 300 }) }}>
        {filteredLibraryRefs.length > 0 ? filteredLibraryRefs.map(ref => {
          const badgeStyle = getTypeBadgeStyle(ref.type)
          const deprecated = isDeprecated(ref)
          const isSelected = selectedRefs.some(r => r.id === ref.id)
          return (
            <label key={ref.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 6, cursor: 'pointer', background: isSelected ? '#e0f2fe' : '#fff', border: isSelected ? '2px solid #1e3a5f' : '1px solid #e5e7eb', transition: 'all 0.15s ease' }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleRefSelection(ref)}
                style={{ accentColor: '#1e3a5f', width: 18, height: 18, marginTop: 3, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, ...badgeStyle, whiteSpace: 'nowrap' }}>{ref.type}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{ref.title}</span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{ref.authors} &middot; {ref.year || 'N/A'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {deprecated && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#b45309' }}>Deprecated</span>}
                </div>
              </div>
            </label>
          )
        }) : (
          <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            {searchTerm ? 'No matching references found.' : 'No references in library yet. Add references first in the Reference Library page.'}
          </div>
        )}
      </div>
      {selectedRefs.length > 0 && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, fontSize: 13, color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          {selectedRefs.length} reference{selectedRefs.length > 1 ? 's' : ''} selected to suggest
        </div>
      )}
    </div>
  )

  const previousComments = previousCommentsProp

  const submitComments = (payload) => {
    onSubmit && onSubmit(payload)
    clearDraft()
    showToast('Comments submitted successfully')
    setTimeout(() => onClose(), 1500)
  }

  const handleSubmit = () => {
    if (submitting) return
    const filledComments = comments.filter((c) => c.text?.trim() && c.courseOutcome && c.ilo && c.coverageType && hasCoverageDetail(c))
    if (filledComments.length === 0 && selectedRefs.length === 0) return

    const lastText = filledComments[filledComments.length - 1]?.text?.trim()
    if (lastText) {
      try {
        const raw = localStorage.getItem('approval_comments_v1')
        const all = raw ? JSON.parse(raw) : []
        const currentRole = normalizeRoleKey(approverRole || localStorage.getItem('approver_role') || '')
        const roleComments = (Array.isArray(all) ? all : []).filter(c => normalizeRoleKey(c.role) === currentRole).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        if (roleComments[0] && roleComments[0].text?.trim() === lastText) {
          showToast('This comment is identical to your last comment.', 'warning')
          return
        }
      } catch (e) { console.warn('Failed to check duplicate', e) }
    }

    setSubmitting(true)
    submitComments({
      courseOutcome: filledComments.find((c) => c.courseOutcome)?.courseOutcome || null,
      ilo: filledComments.find((c) => c.ilo)?.ilo || null,
      comments: filledComments,
      commentedReferences: commentedRefIds,
      suggestedReferences: selectedRefs,
      createdAt: new Date().toISOString()
    })
    setSubmitting(false)
  }

  const handleDirectorSubmit = () => {
    if (submitting) return
    const filledComments = comments.filter(c => c.text?.trim() && c.commentedRefId)
    if (filledComments.length === 0 && selectedRefs.length === 0) return

    try {
      const raw = localStorage.getItem('approval_comments_v1')
      const all = raw ? JSON.parse(raw) : []
      const currentRole = normalizeRoleKey(approverRole || localStorage.getItem('approver_role') || '')
      const roleComments = (Array.isArray(all) ? all : []).filter(c => normalizeRoleKey(c.role) === currentRole).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      if (filledComments.length > 0) {
        const lastComment = roleComments[0]
        if (lastComment && lastComment.text?.trim() === filledComments[0].text) {
          showToast('This comment is identical to your last comment.', 'warning')
          return
        }
      }
    } catch (e) { console.warn('Failed to check duplicate', e) }

    setSubmitting(true)

    submitComments({
      comments: filledComments.map(c => ({ ...c, components: {} })),
      commentedReferences: filledComments.map(c => c.commentedRefId),
      suggestedReferences: selectedRefs,
      createdAt: new Date().toISOString()
    })
    setSubmitting(false)
  }

  const directorFilled = comments.filter(c => c.text?.trim() && c.commentedRefId).length
  const directorSuggested = selectedRefs.length
  const directorParts = []
  if (directorFilled > 0) directorParts.push(`Comment${directorFilled > 1 ? 's' : ''}`)
  if (directorSuggested > 0) directorParts.push(`Suggestion${directorSuggested > 1 ? 's' : ''}`)
  const directorLabel = directorParts.length > 0 ? `Return with ${directorParts.join(' and ')}` : 'Return with Comments'

  const normalFilled = comments.filter(c => c.text?.trim() && c.courseOutcome && c.ilo && c.coverageType && hasCoverageDetail(c)).length
  const normalSuggested = selectedRefs.length
  const normalParts = []
  if (normalFilled > 0) normalParts.push(`Comment${normalFilled > 1 ? 's' : ''}`)
  if (normalSuggested > 0) normalParts.push(`Suggestion${normalSuggested > 1 ? 's' : ''}`)
  const normalLabel = normalParts.length > 0 ? `Return with ${normalParts.join(' and ')}` : 'Return with Comments'

  return (
    <>
      {!readOnly && toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: toast.type === 'warning' ? '#dc2626' : '#047857',
          color: 'white', padding: '14px 24px',
          borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.type === 'warning' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          {toast.msg}
        </div>
      )}
    {!isFullscreen && <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2999 }} />}
    <div role="dialog" aria-modal="true" aria-label="Comments" style={isFullscreen ? { position: 'fixed', inset: 0, zIndex: 3000, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', maxHeight: '100%', borderRadius: 0 } : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3000 }} className={styles.modal}>
      <div className={styles.header}>
        <h3>{readOnly ? 'Previous Comments' : (isDirector ? 'Comment & Suggest References' : 'Comments')}</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setIsFullscreen(v => !v)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label="Toggle fullscreen" style={{ background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#334155', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, padding: 0, lineHeight: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >{isFullscreen ? <Minimize2 size={14} /> : <Maximize size={14} />}</button>
          <button onClick={handleClose} aria-label="Close" style={{ background: '#E81123', border: '1px solid #E81123', cursor: 'pointer', color: '#fff', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, padding: 0, lineHeight: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; e.currentTarget.style.borderColor = '#B91C1C'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#E81123'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#E81123'; }}
          ><X size={14} /></button>
        </div>
      </div>

        <div className={styles.body}>
          {readOnly ? (
            previousComments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {previousComments.map(c => (
                  <div key={c.id} style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{c.courseCode || ''}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>{c.text || c.comment || ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af', fontSize: 14 }}>No comments recorded.</div>
            )
          ) : isDirector ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', height: '100%' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {syllabusReferences.length > 0 && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, background: '#fafafa', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(isFullscreen ? { flex: 1 } : { height: 480 }) }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#111827' }}>Learning Plan References</div>
                  <div style={{ overflow: 'auto', flex: 1, minHeight: 0, paddingRight: 18 }}>
                  {comments.map((c, idx) => (
                    <div key={c.id} style={{ marginBottom: idx < comments.length - 1 ? 12 : 0, paddingBottom: idx < comments.length - 1 ? 12 : 0, borderBottom: idx < comments.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <select
                          value={c.commentedRefId}
                          onChange={(e) => updateComment(c.id, { commentedRefId: e.target.value })}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, fontFamily: "'Poppins', sans-serif", background: '#fff', color: '#374151' }}
                        >
                          <option value="">-- Select a reference --</option>
                          {syllabusReferences.map(ref => (
                            <option key={ref.id} value={ref.id}>{ref.title} ({ref.year || 'N/A'}){isDeprecated(ref) ? ' [Deprecated]' : ''}</option>
                          ))}
                        </select>
                        {comments.length > 1 && (
                          <button onClick={() => removeCommentSection(c.id)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #E81123', background: '#E81123', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C'; e.currentTarget.style.borderColor = '#B91C1C'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#E81123'; e.currentTarget.style.borderColor = '#E81123'; }}>
                            <X size={11} strokeWidth={2.5} color="currentColor" />
                          </button>
                        )}
                      </div>
                      <textarea
                        className={styles.textarea}
                        value={c.text || ''}
                        onChange={(e) => updateCommentText(c.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDirectorSubmit() } }}
                        placeholder={'Describe the issue or suggestion...'}
                        style={{ width: '100%', boxSizing: 'border-box', minHeight: 140, resize: 'vertical' }}
                      />
                    </div>
                  ))}
                  </div>
                  <div className={styles.addCommentRow}>
                    <button onClick={addCommentSection} className={styles.addButton}>
                      + Add another comment
                    </button>
                  </div>
                </div>
              )}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {renderRefBrowser()}
              </div>
                </div>
              </div>

            </div>
          ) : (
            <div className={styles.commentListWrapper}>
              <div className={styles.commentList}>
                {comments.map((c, idx) => {
                  return (
                    <div key={c.id} className={styles.commentItem}>
                      {comments.length > 1 && (
                        <div className={styles.commentHeader}>
                          <div className={styles.commentControls} style={{ marginLeft: 'auto' }}>
                            <button className={styles.removeBtn} onClick={() => removeCommentSection(c.id)} aria-label="Delete comment" title="Delete comment">
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={styles.commentBody}>
                        {(c.courseOutcome || c.ilo || c.coverageType || hasCoverageDetail(c)) && (() => {
                          const details = Array.isArray(c.coverageDetail) ? c.coverageDetail : (c.coverageDetail ? [c.coverageDetail] : [])
                          const ct = c.coverageType || 'Topic'
                          const chipBase = { padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }
                          const typeColors = ct === 'Topic'
                            ? { background: '#e0f2fe', color: '#0369a1' }
                            : ct === 'TLA'
                              ? { background: '#ede9fe', color: '#6d28d9' }
                              : { background: '#fef3c7', color: '#92400e' }
                          return (
                            <div style={{
                              display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
                              marginBottom: 14, padding: '8px 12px',
                              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8
                            }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Commenting on
                              </span>
                              {c.courseOutcome && (
                                <span style={{ ...chipBase, background: '#f1f5f9', color: '#475569' }}>
                                  [CO: {c.courseOutcome}]
                                </span>
                              )}
                              {c.ilo && (
                                <span style={{ ...chipBase, background: '#f1f5f9', color: '#475569' }}>
                                  [ILO: {c.ilo}]
                                </span>
                              )}
                              {details.length > 0 ? details.map((d, di) => (
                                <span key={di} style={{ ...chipBase, ...typeColors }}>
                                  [{ct.toUpperCase()}: {d}]
                                </span>
                              )) : c.coverageType ? (
                                <span style={{ ...chipBase, ...typeColors }}>
                                  [{ct.toUpperCase()}]
                                </span>
                              ) : null}
                            </div>
                          )
                        })()}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                          <div className={styles.field}>
                            <label className={styles.label}>Course Outcome</label>
                            <select className={styles.select} value={c.courseOutcome} onChange={(e) => updateCommentCourseOutcome(c.id, e.target.value)}>
                              <option value="">-- select course outcome --</option>
                              {resolvedCourseOutcomes.map((co, idx) => (
                                <option key={co.id || co} value={co.id ? `CO${idx + 1}` : co}>
                                  {co.id ? `${co.id} — ${String(co.description || '').slice(0, 60)}` : co}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.field}>
                            <label className={styles.label}>Intended Learning Outcome (ILO)</label>
                            <select className={styles.select} value={c.ilo} onChange={(e) => updateCommentIlo(c.id, e.target.value)} disabled={!c.courseOutcome}>
                              <option value="">-- select ILO --</option>
                              {((c.courseOutcome && coToIlos[c.courseOutcome]) || resolvedIlos).map((i) => (
                                <option key={i} value={i}>{i}</option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.field}>
                            <label className={styles.label}>Coverage Type</label>
                            <select className={styles.select} value={c.coverageType} onChange={(e) => updateCommentCoverageType(c.id, e.target.value)} disabled={!c.ilo}>
                              <option value="">-- select type --</option>
                              <option value="Topic">Topic</option>
                              <option value="References">References</option>
                              <option value="TLA">Teaching-Learning Activity (TLA)</option>
                            </select>
                          </div>

                          <div className={styles.field}>
                            <label className={styles.label}>Target</label>
                            <DropdownMultiSelect
                              style={{ padding: 0, width: '100%' }}
                              disabled={!c.coverageType}
                              value={Array.isArray(c.coverageDetail) ? c.coverageDetail : (c.coverageDetail ? [c.coverageDetail] : [])}
                              onChange={(vals) => updateCommentCoverageDetail(c.id, vals)}
                              options={
                                c.coverageType === 'Topic'
                                  ? syllabusTopics.map((t) => t.title)
                                  : c.coverageType === 'References'
                                    ? syllabusReferences.map((r) => r.title)
                                    : c.coverageType === 'TLA'
                                      ? syllabusTopics.flatMap((t) => (t.tlas || []).map((tla) => tla.tlaName))
                                      : []
                              }
                            />
                          </div>
                        </div>

                        <div className={styles.field}>
                          <label className={styles.label}>Comment</label>
                          <textarea className={styles.textarea} value={c.text} onChange={(e) => updateCommentText(c.id, e.target.value)} placeholder={'Describe the issue or suggestion...'} rows={4} />
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>

              <div className={styles.addCommentRow}>
                <button onClick={addCommentSection} className={styles.addButton}>
                  + Add another comment
                </button>
              </div>
            </div>
          )}
        </div>

        {!readOnly && <div className={styles.actions}>
          {isDirector ? (
            <button
              onClick={handleDirectorSubmit}
              disabled={(!comments[0]?.text?.trim() && selectedRefs.length === 0) || submitting}
              className={`${styles.submit} ${(!comments[0]?.text?.trim() && selectedRefs.length === 0) || submitting ? styles.disabled : ''}`}
            >
              {directorLabel}
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saveDisabled || submitting} className={`${styles.submit} ${saveDisabled || submitting ? styles.disabled : ''}`}>{normalLabel}</button>
          )}
        </div>}
      </div>
      {showDiscardConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(2px)' }} onClick={cancelDiscard}>
          <div style={{ background: 'white', borderRadius: 16, width: 380, maxWidth: '90vw', padding: 28, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'Poppins', sans-serif" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>Discard unsaved changes?</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>You have unsaved comments that will be lost.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={cancelDiscard} style={{ padding: '10px 24px', border: '1px solid #d1d5db', borderRadius: 10, background: 'white', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Cancel</button>
              <button onClick={confirmDiscard} style={{ padding: '10px 24px', border: 'none', borderRadius: 10, background: '#dc2626', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ApprovalCommentBox