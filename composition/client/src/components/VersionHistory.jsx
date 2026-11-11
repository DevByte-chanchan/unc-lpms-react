import React, { useEffect, useState } from 'react'
import { fetchJson } from '../utils/api.js'

// Every version of this course's plan, newest first, with who did what and when (server: utils/versionHistory.js).
// Closed until opened: it is for looking back, not part of the review.
const when = (value) => (value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

const VersionHistory = ({ pcId }) => {
  const [versions, setVersions] = useState(null)

  useEffect(() => {
    if (!pcId) return undefined
    let on = true
    fetchJson(`/api/assignments/offering/${pcId}/history`)
      .then(body => { if (on) setVersions(Array.isArray(body?.versions) ? body.versions : null) })
      .catch(() => { if (on) setVersions(null) })
    return () => { on = false }
  }, [pcId])

  if (!versions?.length) return null
  return (
    <details style={{ margin: '0 0 12px', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', background: 'var(--surface)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        Version history ({versions.length} version{versions.length === 1 ? '' : 's'})
      </summary>
      {versions.map(version => (
        <div key={version.id} style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {version.revision ? `Revision ${version.revision}` : 'Working version'} · {version.schoolYear} · {version.semester} semester
            {version.current && <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}> (this one)</span>}
            {version.approvedAt && <span style={{ color: 'var(--good-solid)', fontWeight: 400 }}> · approved {when(version.approvedAt)}</span>}
            {version.carriedFrom && <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}> · carried over from an earlier term</span>}
          </div>
          {version.events.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>No actions yet.</div>
          ) : (
            <ol style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
              {version.events.map((event, i) => (
                <li key={i}>
                  <strong>{event.action}</strong> by {event.who || 'someone'} ({event.role}) · {when(event.at)}
                  {event.note && <div style={{ color: 'var(--ink-soft)' }}>&ldquo;{event.note}&rdquo;</div>}
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </details>
  )
}

export default VersionHistory
