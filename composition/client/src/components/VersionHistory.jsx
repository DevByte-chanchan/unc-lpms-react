import React, { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { fetchJson } from '../utils/api.js'
import styles from '../styles/VersionHistory.module.sass'

// Every version of this course's plan, newest first, with who did what and when (server: utils/versionHistory.js).
// Closed until opened: it is for looking back, not part of the review.
// two-digit day and hour, so every date is the same length and the column lines up ("Jun 01, 2026, 08:00 AM")
const when = (value) => (value ? new Date(value).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const day = (value) => (value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '')
// The timeline dot's colour by what happened: green approve / accept, amber return, teal submit, grey the rest.
const toneOf = (action = '') => (/approv|accept/i.test(action) ? 'good' : /return|sent back/i.test(action) ? 'warn' : /submit|forward/i.test(action) ? 'submit' : '')

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

  // One version has no history to look back on, and its submit / approve dates are already on the approval strip.
  if (!versions || versions.length < 2) return null
  return (
    <details className="info-line">
      <summary>
        <History size={16} color="var(--ink-muted)" aria-hidden="true" />
        Version history · {versions.length} version{versions.length === 1 ? '' : 's'}
      </summary>
      {/* One card per version: its name, term and state, then a timeline of what happened, newest version first. */}
      <div className={styles.versions}>
        {versions.map(version => (
          <section key={version.id} className={styles.version}>
            <header className={styles.versionHead}>
              <strong>{version.revision ? `Revision ${version.revision}` : 'Working version'}</strong>
              <span className={styles.term}>{version.schoolYear} · {version.semester} semester</span>
              {version.current && <span className={`${styles.chip} ${styles.chipCurrent}`}>This one</span>}
              {version.approvedAt && <span className={`${styles.chip} ${styles.chipApproved}`}>Approved {day(version.approvedAt)}</span>}
              {version.carriedFrom && <span className={styles.chip}>Carried over</span>}
            </header>
            {version.events.length === 0 ? (
              <div className={styles.none}>No actions yet.</div>
            ) : (
              <ol className={styles.timeline}>
                {version.events.map((event, i) => (
                  <li key={i} className={styles.event}>
                    <span className={`${styles.dot} ${styles[toneOf(event.action)] || ''}`} aria-hidden="true" />
                    <span className={styles.action}>{event.action}</span>
                    <span className={styles.who}>{event.who || 'Someone'} <span className={styles.role}>{event.role}</span></span>
                    <time className={styles.when} dateTime={event.at}>{when(event.at)}</time>
                    {event.note && <q className={styles.note}>{event.note}</q>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </details>
  )
}

export default VersionHistory
