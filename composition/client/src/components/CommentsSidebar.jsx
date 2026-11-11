import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MessageSquare, Check, Crosshair } from 'react-feather'
import EmptyState from './EmptyState.jsx'
import Select from './Select.jsx'
import styles from '../styles/ApprovalSyllabusSections.module.sass'
import { parseApprovalCommentDisplay, compactCommentIlo, reviewerRoleLabel, commentTypeMeta } from '../utils/reviewGate.js'

// 'REYES, AGNES' or 'Agnes Reyes' -> 'AR'.
const initials = (name = '') => {
  const [last, first] = String(name).split(',').map(p => p.trim())
  const parts = first ? [first, last] : String(name).trim().split(/\s+/)
  return parts.filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

// The comments panel beside a learning plan: the approvers' review page and the instructor's plan page share it.
// It shows exactly the comments it is given (the server decides who may read which), open ones first, with an
// All / Open / Resolved switch and a who-wrote-it filter, and folds away to a thin rail. A plan reviewed more than
// once groups its comments by review round, newest first ("Return 2" before "Return 1", as on
// feature/learning-plan-composition), so the latest asks are read first.
//
//   comments       panel comments (utils/serverComments.js toPanelComments)
//   iloLabels      optional { 'CO2-W3': 'CO2 · Week 7' } from the plan's coverage; a comment's own label is used otherwise
//   emptyHint      what to say when there are no comments yet
//   canResolve     (comment) => whether this viewer may mark it resolved; onResolve(id) does it
//   canShowInPlan  (comment) => whether "Show in plan" applies; onShowInPlan(comment) does it
// The server names a topic target "Topic: Subtopic", one per subtopic; show each topic once with its subtopics under it.
const groupTopicTargets = (details) => {
  const groups = []
  for (const detail of details) {
    const at = detail.indexOf(': ')
    const [head, sub] = at > 0 ? [detail.slice(0, at), detail.slice(at + 2)] : [detail, null]
    const group = groups.find(g => g.head === head)
    if (group) { if (sub) group.subs.push(sub) } else groups.push({ head, subs: sub ? [sub] : [] })
  }
  return groups
}

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
  const [roleFilter, setRoleFilter] = useState('all')
  const [expandedComments, setExpandedComments] = useState(() => new Set())
  const toggleComment = (id) => setExpandedComments(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // Open ones first (newest first within each group), filtered by the switch.
  const resolvedCount = comments.filter(c => c.resolved).length
  // Who wrote them, with how many (and how many still open) each.
  const roles = [...new Set(comments.map(c => c.role).filter(Boolean))].map(role => ({
    role, total: comments.filter(c => c.role === role).length, open: comments.filter(c => c.role === role && !c.resolved).length
  }))
  const listedComments = comments
    .filter(c => commentFilter === 'all' || (commentFilter === 'open' ? !c.resolved : c.resolved))
    .filter(c => roleFilter === 'all' || c.role === roleFilter)
    .slice()
    .sort((a, b) => (Number(Boolean(a.resolved)) - Number(Boolean(b.resolved)))
      || (new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0)))
  // By review round, newest first; one group without a heading when the plan has had a single review.
  const roundOf = (c) => c.round || 1
  const groups = [...new Set(listedComments.map(roundOf))].sort((a, b) => b - a).map(round => ({
    round,
    returned: listedComments.some(c => roundOf(c) === round && c.roundReturned),
    items: listedComments.filter(c => roundOf(c) === round),
  }))
  const showRounds = new Set(comments.map(roundOf)).size > 1

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
            background: '#fff',
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
              {roles.length > 1 && (
                <div className={styles.commentRoleFilter}>
                <Select block value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Comments from">
                  <option value="all">Everyone ({comments.length})</option>
                  {roles.map(r => (
                    <option key={r.role} value={r.role}>{reviewerRoleLabel(r.role)} ({r.total}{r.open ? `, ${r.open} open` : ''})</option>
                  ))}
                </Select>
                </div>
              )}
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
                {groups.map(group => (
                <React.Fragment key={group.round}>
                {showRounds && (
                  <div className={styles.commentRound}>
                    {group.returned ? `Review ${group.round} · sent back` : `Review ${group.round} · current`}
                    <span>{group.items.length} comment{group.items.length === 1 ? '' : 's'}</span>
                  </div>
                )}
                {group.items.map((comment) => {
                  const coverageType = comment.coverageType || ''
                  const details = Array.isArray(comment.coverageDetail)
                    ? comment.coverageDetail.filter(Boolean)
                    : (comment.coverageDetail ? [comment.coverageDetail] : [])
                  const display = parseApprovalCommentDisplay(comment.comment, comment.suggestedRefs)
                  const compactIlo = compactCommentIlo(iloLabels[comment.ilo] || comment.iloLabel || comment.ilo, comment.courseOutcome)
                  const where = [comment.courseOutcome, compactIlo].filter(Boolean).join(' · ')
                  const type = comment.commentType ? commentTypeMeta(comment.commentType) : {}
                  const roleLabel = reviewerRoleLabel(comment.role)
                  const submittedAt = comment.createdAt || comment.submittedAt
                  const text = display.body || 'No written comment provided.'
                  const isLong = text.length > 140 || text.split('\n').length > 3
                  const open = expandedComments.has(comment.id)
                  return (
                    <article
                      key={comment.id}
                      data-comment-id={comment.id}
                      className={`${styles.commentCard} ${comment.resolved ? styles.commentCardResolved : ''}`}
                    >
                      {/* Who wrote it, and whether it is still open. */}
                      <header className={styles.commentWho}>
                        <span className={styles.commentAvatar} aria-hidden="true">{initials(comment.reviewer || roleLabel)}</span>
                        <div className={styles.commentAuthor}>
                          <strong>{comment.reviewer || 'Reviewer'}</strong>
                          <small>
                            {roleLabel}
                            {submittedAt && <> · <time dateTime={submittedAt} title={new Date(submittedAt).toLocaleString()}>{new Date(submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></>}
                          </small>
                        </div>
                        <span className={`${styles.commentStatus} ${comment.resolved ? styles.statusResolved : styles.statusPending}`}>
                          {comment.resolved ? <Check size={12} aria-hidden="true" /> : <span className={styles.statusDot} aria-hidden="true" />}
                          {comment.resolved ? 'Resolved' : 'Open'}
                        </span>
                      </header>

                      {/* What kind of comment, and exactly what in the plan it is about. */}
                      {(type.label || where) && (
                        <div className={styles.commentTags}>
                          {type.label && <span className={`${styles.commentKind} ${type.actionable ? styles.commentKindAsk : ''}`}>{type.label}</span>}
                          {where && <span className={styles.commentWhere}>{where}{coverageType && ` · ${coverageType}`}</span>}
                        </div>
                      )}
                      {details.length > 0 && (
                        <div className={styles.commentAbout}>
                          {details.length > 0 && (
                            <ul className={styles.commentTargets}>
                              {coverageType === 'Topic'
                                ? groupTopicTargets(details).map(g => (
                                    <li key={g.head}>
                                      {g.head}
                                      {g.subs.length > 0 && <ul>{g.subs.map(sub => <li key={sub}>{sub}</li>)}</ul>}
                                    </li>
                                  ))
                                : details.map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}
                            </ul>
                          )}
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

                      {(comment.resolvedAt || canResolve(comment) || canShowInPlan(comment)) && (
                        <footer className={styles.commentMeta}>
                          {comment.resolvedAt && (
                            <span className={styles.resolvedDate}>
                              <Check size={12} aria-hidden="true" /> Resolved {new Date(comment.resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {!comment.resolved && canResolve(comment) && (
                            <button type="button" className={styles.resolveCommentButton} onClick={() => onResolve(comment.id)}>
                              <Check size={13} /> Mark resolved
                            </button>
                          )}
                          {canShowInPlan(comment) && (
                            <button type="button" className={styles.commentJump} onClick={() => onShowInPlan(comment)}>
                              <Crosshair size={13} aria-hidden="true" /> Show in plan
                            </button>
                          )}
                        </footer>
                      )}
                    </article>
                  )
                })}
                </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CommentsSidebar
