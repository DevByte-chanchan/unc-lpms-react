import React, { useState, useEffect } from 'react'
import { Search } from 'react-feather'
import styles from '../styles/ApprovalCommentBox.module.sass'
import { getReferences } from '../utils/referenceLibrary.js'

const ApprovalCommentBox = ({ show = false, onClose, onSubmit, courseOutcomes = [], ilos = [], approverRole = null }) => {
  const storageKey = 'approval_comments_v1'

  const defaultComment = () => ({
    id: Date.now(),
    components: { references: false, topics: false, tlas: false },
    text: '',
    comment: '',
    createdAt: new Date().toISOString(),
    reviewer: '',
    role: '',
    recipientRole: '',
    coverageType: '',
    courseOutcome: '',
    ilo: ''
  })

  const [comments, setComments] = useState([defaultComment()])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRefs, setSelectedRefs] = useState([])
  const [libraryRefs, setLibraryRefs] = useState([])

  useEffect(() => {
    setLibraryRefs(getReferences())
  }, [])

  // Save draft on every change (will be restored on next open via load effect)
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
      localStorage.setItem('approval_comment_draft_v1', JSON.stringify({ comments: normalized, selectedRefs, searchTerm }))
    } catch (e) {}
  }, [comments, selectedRefs, searchTerm, show, approverRole])

  // Fallback course outcomes and ILOs
  const resolvedCourseOutcomes = (courseOutcomes && courseOutcomes.length)
    ? courseOutcomes
    : [
        { id: 'CO1', description: 'Apply core concepts, theories, and principles of the course.' },
        { id: 'CO2', description: 'Demonstrate user-centered design and evaluation methods.' },
        { id: 'CO3', description: 'Construct prototypes and apply accessibility best practices.' },
        { id: 'CO4', description: 'Justify design decisions using evidence and testing results.' }
      ]

  const coToIlos = {
    CO1: ['ILO1', 'ILO2', 'ILO3'],
    CO2: ['ILO1', 'ILO2', 'ILO3'],
    CO3: ['ILO1', 'ILO2', 'ILO3'],
    CO4: ['ILO1', 'ILO2', 'ILO3', 'ILO4']
  }

  const resolvedIlosAll = Array.from(new Set([].concat(...Object.values(coToIlos))))
  const resolvedIlos = (ilos && ilos.length) ? ilos : resolvedIlosAll

  // Hard-coded seed data for reviewers
  const reviewerSeeds = [
    { name: 'SANTOS, MARIA', role: 'Director of Libraries' },
    { name: 'REYES, AGNES', role: 'Dean' },
    { name: 'DANILA, JUNAR', role: 'Program Head' },
    { name: 'CRUZ, ROBERTO', role: 'Industry Consultant' },
  ]

  // Map approver URL param to reviewer data
  const getReviewerByRole = (role) => {
    const roleMap = {
      'director-of-libraries': reviewerSeeds[0], // SANTOS, MARIA
      'dean': reviewerSeeds[1], // REYES, AGNES
      'program-head': reviewerSeeds[2], // DANILA, JUNAR
      'industry-consultant': reviewerSeeds[3], // CRUZ, ROBERTO
    }
    return roleMap[role] || reviewerSeeds[0]
  }

  const getReviewerSeedData = (index = 0) => {
    return reviewerSeeds[index % reviewerSeeds.length]
  }

  const normalizeRoleKey = (raw) => {
    if (!raw) return ''
    const r = String(raw).toLowerCase()
    if (r.includes('program')) return 'program-head'
    if (r.includes('dean')) return 'dean'
    if (r.includes('industry')) return 'industry-consultant'
    if (r.includes('library') || r.includes('libraries')) return 'director-of-libraries'
    if (r.includes('instructor')) return 'instructor'
    return r.replace(/_/g, '-').replace(/ /g, '-')
  }

  // Get current approver identity based on approverRole or fallback
  const normalizeName = (name) => {
    if (!name || name.toLowerCase().includes('norton') || name.toLowerCase().includes('monica')) return 'CASIMERO, DANNY';
    return name;
  };

  const getApproverIdentity = (index = 0) => {
    try {
      if (approverRole) {
        const reviewer = getReviewerByRole(approverRole);
        return { ...reviewer, name: normalizeName(reviewer.name) };
      }

      const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
      const seedData = getReviewerSeedData(index)
      
      const name = normalizeName(seedData.name || storedUser?.name || localStorage.getItem('approver_name') || 'Reviewer')
      const role = seedData.role || storedUser?.role || localStorage.getItem('approver_role') || 'Approver'
      return { name, role }
    } catch (e) {
      const seedData = getReviewerSeedData(index)
      return { name: normalizeName(seedData.name), role: seedData.role }
    }
  }

  // Load draft from localStorage when modal opens
  useEffect(() => {
    if (!show) return
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
        setComments(forced)
      }
      if (parsed.selectedRefs) setSelectedRefs(parsed.selectedRefs)
      if (parsed.searchTerm) setSearchTerm(parsed.searchTerm)
    } catch (e) {
      // ignore
    }
  }, [show, approverRole])

  const clearDraft = () => {
    try { localStorage.removeItem('approval_comment_draft_v1') } catch (e) {}
  }

  const toggleCommentComponent = (commentId, key) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, components: { ...c.components, [key]: !c.components[key] } } : c))
    )
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
        return { ...c, courseOutcome, ilo: nextIlo }
      })
    )
  }

  const updateCommentCoverageType = (commentId, coverageType) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, coverageType } : c)))
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
        id: Date.now() + Math.random(),
        reviewer: seedData.name,
        role: seedData.role,
        recipientRole: normalizeRoleKey(approverRole) === 'dean' ? 'program_head' : 'instructor'
      }
    ])
  }

  const removeCommentSection = (commentId) => {
    setComments((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.id !== commentId)))
  }

  const handleSubmit = () => {
    const hasInvalidComments = comments.some((c) => {
      const hasText = c.text && c.text.trim()
      const comps = c.components || {}
      const courseCoverageChecked = !!(comps.topics || comps.references || comps.tlas)
      const hasComponent = courseCoverageChecked
      
      if (hasText && !hasComponent) return true
      
      if (courseCoverageChecked) {
        const hasValidCourseData = c.courseOutcome ? !!c.ilo : !!c.coverageType
        if (!hasValidCourseData) return true
      }
      
      return false
    })
    
    if (hasInvalidComments) return
    
    const filledComments = comments.filter((c) => c.text && c.text.trim())
    
    if (filledComments.length === 0) return
    
    const payload = {
      courseOutcome: filledComments.find((c) => c.courseOutcome)?.courseOutcome || null,
      ilo: filledComments.find((c) => c.ilo)?.ilo || null,
      courseCoverage: filledComments.some((c) => c.components.topics || c.components.references || c.components.tlas),
      comments: filledComments,
      suggestedReferences: selectedRefs,
      createdAt: new Date().toISOString()
    }
    onSubmit && onSubmit(payload)
    clearDraft()
  }

  if (!show) return null

  const commentsWithText = comments.filter((c) => c.text && c.text.trim())
  
  const allCommentsValid = commentsWithText.length > 0 && !comments.some((c) => {
    const hasText = c.text && c.text.trim()
    const comps = c.components || {}
    const courseCoverageChecked = !!(comps.topics || comps.references || comps.tlas)
    const hasComponent = courseCoverageChecked
    
    if (hasText && !hasComponent) return true
    
    if (courseCoverageChecked) {
      const hasValidCourseData = c.courseOutcome ? !!c.ilo : !!c.coverageType
      if (!hasValidCourseData) return true
    }
    
    return false
  })
  
  const saveDisabled = !allCommentsValid

  const isDirector = (() => {
    if (!approverRole) return false
    const r = String(approverRole).toLowerCase()
    return r.includes('library') || r.includes('libraries')
  })()

  const CURRENT_YEAR = new Date().getFullYear()
  const isDeprecated = (ref) => ref.year && (CURRENT_YEAR - ref.year >= 5)
  const hasIssues = (ref) => ref.hasIssue === true

  const filteredLibraryRefs = libraryRefs.filter(ref => {
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
    <div style={{ marginTop: 16, border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, background: '#fafafa' }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#111827' }}>Suggest References from Library</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #A4A9AF', borderRadius: 24, padding: '10px 16px', marginBottom: 14, background: '#fff' }}>
        <Search size={16} color="#9ca3af" />
        <input
          type="text"
          placeholder="Search by title, author, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, fontFamily: "'Poppins', sans-serif" }}
        />
      </div>
      <div style={{ maxHeight: 300, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredLibraryRefs.length > 0 ? filteredLibraryRefs.map(ref => {
          const badgeStyle = getTypeBadgeStyle(ref.type)
          const deprecated = isDeprecated(ref)
          const issues = hasIssues(ref)
          const isSelected = selectedRefs.some(r => r.id === ref.id)
          return (
            <label key={ref.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', background: isSelected ? '#e0f2fe' : '#fff', border: isSelected ? '2px solid #1e3a5f' : '1px solid #e5e7eb', transition: 'all 0.15s ease' }}>
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
                  {!deprecated && !issues && <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: '#f0fdf4', color: '#16a34a' }}>Active</span>}
                  {deprecated && !issues && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#b45309' }}>Deprecated</span>}
                  {issues && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef2f2', color: '#dc2626' }}>Has Issue</span>}
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
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          {selectedRefs.length} reference{selectedRefs.length > 1 ? 's' : ''} selected to suggest
        </div>
      )}
    </div>
  )

  return (
    <div role="dialog" aria-modal="true" aria-label="Comments" className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>{isDirector ? 'Comment & Suggest References' : 'Comments'}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>✕</button>
        </div>

        <div className={styles.body}>
          {isDirector ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={styles.commentItem}>
                <div className={styles.commentBody}>
                  <textarea
                    className={styles.textarea}
                    value={comments[0]?.text || ''}
                    onChange={(e) => updateCommentText(comments[0]?.id, e.target.value)}
                    placeholder={'Enter your comment about the syllabus references...'}
                    rows={4}
                  />
                </div>
              </div>
              {renderRefBrowser()}
            </div>
          ) : (
            <div className={styles.commentListWrapper}>
              <div className={styles.commentList}>
                {comments.map((c, idx) => {
                  const courseCoverageSelected = !!(c.components && c.components.topics && c.components.references && c.components.tlas)
                  return (
                    <div key={c.id} className={styles.commentItem}>
                      {comments.length > 1 && (
                        <div className={styles.commentHeader}>
                          <div className={styles.commentControls} style={{ marginLeft: 'auto' }}>
                            <button className={styles.removeBtn} onClick={() => removeCommentSection(c.id)} aria-label="Delete comment" title="Delete comment">
                              ✕
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={styles.commentBody}>
                        <div className={styles.componentsRow} style={{ marginBottom: 8 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={courseCoverageSelected}
                              onChange={() =>
                                setComments((prev) =>
                                  prev.map((item) =>
                                    item.id === c.id
                                      ? (() => {
                                          const allOn = !!(item.components && item.components.topics && item.components.references && item.components.tlas)
                                          const target = !allOn
                                          return {
                                            ...item,
                                            components: {
                                              references: target,
                                              topics: target,
                                              tlas: target
                                            }
                                          }
                                        })()
                                      : item
                                  )
                                )
                              }
                            />
                            <span>Intended Learning Outcome</span>
                          </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
                          <div className={styles.field}>
                            <label className={styles.label}>Course Outcome Number</label>
                            <select className={styles.select} value={c.courseOutcome} onChange={(e) => updateCommentCourseOutcome(c.id, e.target.value)} disabled={!courseCoverageSelected}>
                              <option value="">-- select course outcome --</option>
                              {resolvedCourseOutcomes.map((co) => (
                                <option key={co.id || co} value={co.id || co}>
                                  {co.id ? `${co.id} — ${String(co.description || '').slice(0, 60)}` : co}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.field}>
                            <label className={styles.label}>Intended Learning Outcome (ILO)</label>
                            <select className={styles.select} value={c.ilo} onChange={(e) => updateCommentIlo(c.id, e.target.value)} disabled={!courseCoverageSelected || !c.courseOutcome}>
                              <option value="">-- select ILO --</option>
                              {((c.courseOutcome && coToIlos[c.courseOutcome]) || resolvedIlos).map((i) => (
                                <option key={i} value={i}>{i}</option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.field}>
                            <label className={styles.label}>Coverage Type</label>
                            <select className={styles.select} value={c.coverageType} onChange={(e) => updateCommentCoverageType(c.id, e.target.value)} disabled={!courseCoverageSelected}>
                              <option value="">-- select type --</option>
                              <option value="Topic">Topic</option>
                              <option value="References">References</option>
                              <option value="TLA">TLA</option>
                            </select>
                          </div>
                        </div>

                        <textarea className={styles.textarea} value={c.text} onChange={(e) => updateCommentText(c.id, e.target.value)} placeholder={'Enter your comment...'} rows={4} />

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
        <div className={styles.actions}>
          <button onClick={onClose} className={`${styles.cancel}`}>Cancel</button>
          {isDirector ? (
            <button
              onClick={() => {
                const hasText = comments[0]?.text?.trim()
                if (!hasText && selectedRefs.length === 0) return
                const payload = {
                  comments: [{
                    ...comments[0],
                    text: comments[0]?.text || '',
                    components: {}
                  }],
                  suggestedReferences: selectedRefs,
                  createdAt: new Date().toISOString()
                }
                onSubmit && onSubmit(payload)
                clearDraft()
              }}
              disabled={!comments[0]?.text?.trim() && selectedRefs.length === 0}
              className={`${styles.submit} ${!comments[0]?.text?.trim() && selectedRefs.length === 0 ? styles.disabled : ''}`}
            >
              Return with Comments
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saveDisabled} className={`${styles.submit} ${saveDisabled ? styles.disabled : ''}`}>Return with Comments</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApprovalCommentBox