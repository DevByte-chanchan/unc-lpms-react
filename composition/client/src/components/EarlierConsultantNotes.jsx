import React, { useEffect, useState } from 'react'
import { fetchJson } from '../utils/api.js'

// The Industry Consultant's comments on the earlier versions of this plan. The consultant is not part of the
// approval; their comments are kept as the basis for the next version, so the person working on it sees
// them here. Shows nothing for a first version, or when there are no such comments.
const EarlierConsultantNotes = ({ pcId }) => {
  const [versions, setVersions] = useState([])

  useEffect(() => {
    if (!pcId) return undefined
    let on = true
    fetchJson(`/api/comments/earlier-consultant/${pcId}`)
      .then(body => { if (on) setVersions(Array.isArray(body?.versions) ? body.versions : []) })
      .catch(() => { if (on) setVersions([]) })
    return () => { on = false }
  }, [pcId])

  if (versions.length === 0) return null
  const total = versions.reduce((sum, version) => sum + version.comments.length, 0)
  return (
    <details style={{ margin: '0 0 12px', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', background: '#F9FAFB' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        Earlier consultant suggestions ({total}) — for reference, not part of the approval
      </summary>
      {versions.map(version => (
        <div key={version.offeringId} style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, color: '#6B7280' }}>{version.schoolYear} · {version.semester} semester · revision {version.revision || 'in progress'}</div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {version.comments.map(comment => <li key={comment.id}>{comment.message}</li>)}
          </ul>
        </div>
      ))}
    </details>
  )
}

export default EarlierConsultantNotes
