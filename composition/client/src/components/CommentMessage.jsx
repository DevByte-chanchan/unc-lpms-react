import React from 'react'
import { parseCommentType } from '../utils/reviewGate.js'

const TYPE_TONE = {
  'revision': { background: '#fee2e2', color: '#b91c1c' },
  'suggest-topic': { background: '#e0f2fe', color: '#0369a1' },
  'suggest-tla': { background: '#ede9fe', color: '#6d28d9' },
  'suggest-ai-tool': { background: '#dcfce7', color: '#047857' },
  'note': { background: '#f1f5f9', color: '#475569' }
}

/**
 * Renders a review-comment message. If the message carries a
 * "Suggested reference(s): A — B; C — D" line (appended by the Director of
 * Libraries flow), it is split out into the same amber panel used in the
 * approver sidebar so suggestions are easy to spot.
 *
 * A leading "[Suggested TLA]"-style tag is the approver's structured comment
 * type [48:30]; it renders as a chip so the instructor reads it as a distinct
 * kind of suggestion rather than as part of the sentence.
 */
const CommentMessage = ({ message, className }) => {
  const parsed = parseCommentType(message)
  const m = String(parsed.text || '')
  const idx = m.search(/Suggested references?:/i)
  const text = idx >= 0 ? m.slice(0, idx).trim() : m
  const suggestions = idx >= 0
    ? m.slice(idx).replace(/^Suggested references?:\s*/i, '').split(';').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <>
      {parsed.label && (
        <span style={{
          display: 'inline-block', marginBottom: 4, padding: '2px 8px', borderRadius: 4,
          fontSize: '0.7rem', fontWeight: 600, ...(TYPE_TONE[parsed.commentType] || TYPE_TONE.note)
        }}>
          {parsed.label}
        </span>
      )}
      {text && <p className={className} style={{ margin: 0 }}>{text}</p>}
      {suggestions.length > 0 && (
        <div style={{
          padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 4, fontSize: '0.78rem', marginTop: 6,
        }}>
          <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 2 }}>Suggested References:</div>
          {suggestions.map((s, i) => (
            <div key={i} style={{ color: '#78350f' }}>{s}</div>
          ))}
        </div>
      )}
    </>
  )
}

export default CommentMessage
