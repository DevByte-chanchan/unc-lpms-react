import React, { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, Info } from 'react-feather'
import { fetchJson } from '../utils/api.js'

// The checks the Program Head used to do by hand (server: utils/planChecks.js): hours per week, weeks with topics,
// every course outcome covered, every exam period assessed, course outcomes linked to the program's POs, the COAEP
// rows complete. A check marked `info` (which POs the course addresses) only informs and is never counted as failing.
// One line saying how many need a look; open it for the details. It only reports: the Program Head still decides.
// Open or closed is remembered across plans (this browser only): closed is one line; a failing check opens it the
// first time, until the reviewer closes it.
const OPEN_KEY = 'lpms.planChecks.open'
const savedOpen = () => { try { const v = localStorage.getItem(OPEN_KEY); return v === null ? null : v === '1' } catch { return null } }

const PlanChecks = ({ pcId }) => {
  const [checks, setChecks] = useState(null)
  const [open, setOpen] = useState(savedOpen)

  useEffect(() => {
    if (!pcId) return undefined
    let on = true
    fetchJson(`/api/assignments/offering/${pcId}/plan-checks`)
      .then(body => { if (on) setChecks(Array.isArray(body?.checks) ? body.checks : null) })
      .catch(() => { if (on) setChecks(null) })
    return () => { on = false }
  }, [pcId])

  if (!checks) return null
  const graded = checks.filter(c => !c.info)
  const failing = graded.filter(c => !c.ok)
  const clean = failing.length === 0
  return (
    <details open={open ?? !clean}
      onToggle={(e) => {
        const next = e.currentTarget.open
        if (next === (open ?? !clean)) return // the page set it, not the reviewer
        setOpen(next)
        try { localStorage.setItem(OPEN_KEY, next ? '1' : '0') } catch { /* private window */ }
      }}
      style={{ margin: '0 0 12px', border: `1px solid ${clean ? 'var(--line)' : 'var(--warn-solid)'}`, borderRadius: 8, padding: '8px 12px', background: clean ? 'var(--surface-muted)' : '#FFFBEB' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
        {clean ? <CheckCircle size={16} color="var(--good-solid)" aria-hidden="true" /> : <AlertTriangle size={16} color="var(--warn-solid)" aria-hidden="true" />}
        {clean ? `Plan checks: all ${graded.length} pass` : `Plan checks: ${failing.length} of ${graded.length} need a look`}
        <span style={{ marginLeft: 'auto', color: 'var(--ink-muted)', fontSize: 12, fontWeight: 500 }}>{(open ?? !clean) ? 'Hide' : 'Show'}</span>
      </summary>
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 6 }}>
        {checks.map(check => (
          <li key={check.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
            {check.info ? <Info size={14} color="var(--ink-muted)" aria-label="For information" style={{ marginTop: 2, flex: 'none' }} />
              : check.ok ? <CheckCircle size={14} color="var(--good-solid)" aria-label="Passes" style={{ marginTop: 2, flex: 'none' }} />
              : <AlertTriangle size={14} color="var(--warn-solid)" aria-label="Needs a look" style={{ marginTop: 2, flex: 'none' }} />}
            <span><strong>{check.label}:</strong> {check.detail}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default PlanChecks
