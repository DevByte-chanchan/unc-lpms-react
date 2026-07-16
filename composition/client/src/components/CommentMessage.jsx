import React from 'react'

/**
 * Renders a review-comment message. If the message carries a
 * "Suggested reference(s): A — B; C — D" line (appended by the Director of
 * Libraries flow), it is split out into the same amber panel used in the
 * approver sidebar so suggestions are easy to spot.
 */
const CommentMessage = ({ message, className }) => {
  const m = String(message || '')
  const idx = m.search(/Suggested references?:/i)
  const text = idx >= 0 ? m.slice(0, idx).trim() : m
  const suggestions = idx >= 0
    ? m.slice(idx).replace(/^Suggested references?:\s*/i, '').split(';').map(s => s.trim()).filter(Boolean)
    : []

  return (
    <>
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
