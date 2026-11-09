import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MessageSquare, Check } from 'react-feather'
import EmptyState from './EmptyState.jsx'
import styles from '../styles/ApprovalSyllabusSections.module.sass'
import { parseApprovalCommentDisplay, compactCommentIlo, reviewerRoleLabel } from '../utils/reviewGate.js'

// The comments panel beside a learning plan: the approvers' review page and the instructor's plan page share it.
// It shows exactly the comments it is given (the server decides who may read which), open ones first, with an
// All / Open / Resolved switch, and folds away to a thin rail.
//
//   comments       panel comments (utils/serverComments.js toPanelComments)
//   iloLabels      optional { 'CO2-W3': 'CO2 · Week 7' } from the plan's coverage; a comment's own label is used otherwise
//   emptyHint      what to say when there are no comments yet
//   canResolve     (comment) => whether this viewer may mark it resolved; onResolve(id) does it
//   canShowInPlan  (comment) => whether "Show in plan" applies; onShowInPlan(comment) does it
const CommentsSidebar = ({
  comments = [],
  iloLabels = {},
  emptyHint = '',
  canResolve = () => false,
  onResolve = () => {},
  canShowInPlan = () => false,
  onShowInPlan = () => {},
  collapsed,
  onToggle,
  panelId = 'comments-panel'
}) => {
  const [commentFilter, setCommentFilter] = useState('all')
  const [expandedComments, setExpandedComments] = useState(() => new Set())
  const toggleComment = (id) => setExpandedComments(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // Open ones first (newest first within each group), filtered by the switch.
  const resolvedCount = comments.filter(c => c.resolved).length
  const listedComments = comments
    .filter(c => commentFilter === 'all' || (commentFilter === 'open' ? !c.resolved : c.resolved))
    .slice()
    .sort((a, b) => (Number(Boolean(a.resolved)) - Number(Boolean(b.resolved)))
      || (new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0)))

  return (
    <div className={styles['comments-shell']} data-collapsed={collapsed}>
      <button
        type="button"
        className={styles['comments-toggle']}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggle()
          }
        }}
        aria-expanded={!collapsed}
        aria-controls={panelId}
        title={collapsed ? 'Show comments' : 'Hide comments'}
      >
        <span aria-hidden="true" className={styles['comments-toggle-icon']}>{collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</span>
        <span className={styles['comments-toggle-label']}>
          {collapsed ? `Show comments (${comments.length})` : 'Hide comments'}
        </span>
      </button>
      <div className={styles['comments-viewport']} inert={collapsed} aria-hidden={collapsed}>
        <aside id={panelId} className={styles['comments-panel']}>
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
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              {resolvedCount > 0 && ` · ${resolvedCount} resolved`}
            </span>
          </div>
          {comments.length > 0 && (
            <div className={styles.commentFilter} role="group" aria-label="Show comments">
              {[['all', 'All'], ['open', 'Open'], ['resolved', 'Resolved']].map(([key, label]) => (
                <button key={key} type="button" aria-pressed={commentFilter === key}
                  className={`${styles.commentFilterBtn} ${commentFilter === key ? styles.commentFilterOn : ''}`}
                  onClick={() => setCommentFilter(key)}>{label}</button>
              ))}
            </div>
          )}

          <div className={styles.commentsScroller}>
            {comments.length === 0 ? (
              <EmptyState icon={<MessageSquare size={22} strokeWidth={1.6} />} title="No comments yet" hint={emptyHint} />
            ) : listedComments.length === 0 ? (
              <EmptyState
                icon={<Check size={22} strokeWidth={1.6} />}
                title={commentFilter === 'open' ? 'No open comments' : 'No resolved comments'}
                hint="Change the switch above to see the others."
              />
            ) : (
              <div className={styles.commentsList}>
                {listedComments.map((comment) => {
                  const coverageType = comment.coverageType || ''
                  const details = Array.isArray(comment.coverageDetail)
                    ? comment.coverageDetail.filter(Boolean)
                    : (comment.coverageDetail ? [comment.coverageDetail] : [])
                  const display = parseApprovalCommentDisplay(comment.comment, comment.suggestedRefs)
                  const compactIlo = compactCommentIlo(iloLabels[comment.ilo] || comment.iloLabel || comment.ilo, comment.courseOutcome)
                  const roleLabel = reviewerRoleLabel(comment.role)
                  const submittedAt = comment.createdAt || comment.submittedAt
                  const text = display.body || 'No written comment provided.'
                  const isLong = text.length > 140 || text.split('\n').length > 3
                  const open = expandedComments.has(comment.id)
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
                          {!comment.resolved && canResolve(comment) && (
                            <button type="button" className={styles.resolveCommentButton} onClick={() => onResolve(comment.id)}>
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
                        <p className={isLong && !open ? styles.commentClamped : isLong ? styles.commentOpen : undefined}>{text}</p>
                        {isLong && (
                          <button type="button" className={styles.commentToggle} aria-expanded={open} onClick={() => toggleComment(comment.id)}>
                            {open ? <>Show less <ChevronUp size={13} aria-hidden="true" /></> : <>Show more <ChevronDown size={13} aria-hidden="true" /></>}
                          </button>
                        )}
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
                        {canShowInPlan(comment) && (
                          <button type="button" className={styles.commentJump} onClick={() => onShowInPlan(comment)}>
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
  )
}

export default CommentsSidebar
