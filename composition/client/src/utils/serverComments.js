// The comments panel shows the server's comments for one plan and nothing else. It used to keep its own copy in
// this browser's localStorage too, which showed one account's comments to the next person signed in on the same
// computer, kept comments the server had refused, and mixed up plans of the same course code.

import { parseCommentType } from './reviewGate.js'

export const LEGACY_STORAGE_KEY = 'approval_comments_v1'

const ROLE_LABEL = {
  INDUSTRY_CONSULTANT: 'Industry Consultant',
  LIBRARY_DIRECTOR: 'Director of Libraries',
  DIRECTOR_OF_LIBRARIES: 'Director of Libraries',
  PROGRAM_HEAD: 'Program Head',
  DEAN: 'Dean',
  INSTRUCTOR: 'Instructor'
}

const COVERAGE = { references: 'References', topics: 'Topic', tlas: 'TLA' }

// The server sends one row per comment target (a comment on three topics is three rows): fold them into one card.
export const toPanelComments = (rows = [], courseCode = '') => {
  const byId = new Map()
  for (const r of Array.isArray(rows) ? rows : []) {
    const id = `server-${r.comment_id}`
    if (byId.has(id)) {
      const card = byId.get(id)
      if (r.target_title && !card.targets.includes(r.target_title)) card.targets.push(r.target_title)
      continue
    }
    const role = ROLE_LABEL[r.commenter_role] || r.commenter_role || 'Reviewer'
    // The server keeps the type as a leading "[Requested revision]" tag on the message; the card shows the words.
    const { commentType, text } = parseCommentType(r.message || '')
    byId.set(id, {
      id,
      courseCode,
      section: 'Course Coverage',
      submittedAt: r.createdAt,
      createdAt: r.createdAt,
      // The author the server recorded; the role only when an old row has no name.
      reviewer: r.commenter_name || role,
      role,
      recipientRole: r.commenter_role === 'INSTRUCTOR' ? 'industry-consultant' : 'instructor',
      components: {},
      comment: text,
      commentType,
      courseOutcome: r.co_no ? `CO${r.co_no}` : null,
      // The week the comment sits on ('CO2-W3', matching the comment form's rows); an old row has an ILO number.
      ilo: r.co_no && r.week_no_in_co ? `CO${r.co_no}-W${r.week_no_in_co}` : (r.co_no && r.ilo_no ? `CO${r.co_no}-ILO${r.ilo_no}` : null),
      iloLabel: r.co_no && r.week_no ? `CO${r.co_no} · Week ${r.week_no}` : null,
      coverageType: COVERAGE[r.comment_for] || null,
      targets: r.target_title ? [r.target_title] : [],
      suggestedRefs: [],
      status: r.resolved_status ? 'resolved' : 'pending',
      resolved: Boolean(r.resolved_status)
    })
  }
  return [...byId.values()].map(({ targets, ...card }) => ({
    ...card,
    coverageDetail: targets.length === 0 ? null : targets.length === 1 ? targets[0] : targets
  }))
}

const untagged = (text) => String(text || '').replace(/^\s*\[[^\]]+\]\s*/, '').split('\n\nSuggested reference')[0].trim().toLowerCase()
const asList = (detail) => (Array.isArray(detail) ? detail : detail ? [detail] : []).map(String).sort().join('|')

// Is this new comment already on the plan, word for word, on the same CO, ILO and target?
export const isDuplicateComment = (existing = [], incoming = {}) => existing.some(c =>
  untagged(c.comment) === untagged(incoming.text) &&
  (c.courseOutcome || null) === (incoming.courseOutcome || null) &&
  (c.ilo || null) === (incoming.ilo || null) &&
  (c.coverageType || null) === (incoming.coverageType || null) &&
  asList(c.coverageDetail) === asList(incoming.coverageDetail))
