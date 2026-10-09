import { useEffect, useRef, useState } from 'react'
import { Bell } from 'react-feather'
import { apiErrorMessage } from '../utils/api.js'
import { loadPokeTargets, sendPoke } from '../utils/notificationsApi.js'
import { canPoke, waitLabel } from '../utils/notificationLinks.js'

// Program Head: remind the assigned instructor to submit a learning plan they have not submitted
// (or that was returned). The server allows one poke per instructor per offering per 4 hours; an
// instructor who was poked recently shows as disabled with the time they can be poked again.
// Targets load when the button is first used.
const PokeButton = ({ offeringId }) => {
  const [open, setOpen] = useState(false)
  const [targets, setTargets] = useState(null)
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState(null)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const load = async () => {
    try { setTargets(await loadPokeTargets(offeringId)); setMessage('') } catch (err) { setMessage(apiErrorMessage(err, 'Could not load the instructor.')) }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  const poke = async (target) => {
    setBusyId(target.userId)
    setMessage('')
    try {
      await sendPoke(offeringId, target.userId)
      setMessage(`Reminder sent to ${target.name}.`)
    } catch (err) {
      setMessage(apiErrorMessage(err, 'The reminder was not sent.'))
    } finally {
      setBusyId(null)
      load()
    }
  }

  const allLimited = targets !== null && targets.length > 0 && targets.every(t => !canPoke(t))
  const noneToPoke = targets !== null && targets.length === 0

  return (
    <span ref={box} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className="actionLink" onClick={toggle} disabled={allLimited || noneToPoke}
        title={noneToPoke ? 'This learning plan is already submitted.' : allLimited ? 'The instructor was reminded recently.' : 'Remind the instructor to submit'}
        style={{ minWidth: 70, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: allLimited || noneToPoke ? 'not-allowed' : 'pointer', opacity: allLimited || noneToPoke ? 0.5 : 1 }}>
        Poke <Bell size={15} />
      </button>
      {open && (
        <div role="dialog" aria-label="Remind the instructor"
          style={{ position: 'absolute', right: 0, top: '100%', width: 280, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.15)', padding: 10, zIndex: 40 }}>
          {targets === null && !message && <div style={{ fontSize: 13, color: '#6b7280' }}>Loading…</div>}
          {noneToPoke && <div style={{ fontSize: 13, color: '#6b7280' }}>This learning plan is already submitted.</div>}
          {(targets || []).map(target => {
            const ready = canPoke(target)
            return (
              <div key={target.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <span style={{ fontSize: 13 }}>{target.name}<br /><small style={{ color: '#6b7280' }}>{target.roleLabel}</small></span>
                <button type="button" disabled={!ready || busyId === target.userId} onClick={() => poke(target)}
                  title={ready ? undefined : `Poked recently. Available ${waitLabel(target.nextPokeAt)}.`}
                  style={{ padding: '4px 10px', border: '1px solid #111827', borderRadius: 6, background: '#fff', color: '#111827', cursor: ready ? 'pointer' : 'not-allowed', opacity: ready ? 1 : 0.5 }}>
                  {ready ? 'Poke' : waitLabel(target.nextPokeAt)}
                </button>
              </div>
            )
          })}
          {message && <div role="status" style={{ marginTop: 6, fontSize: 12, color: '#374151' }}>{message}</div>}
        </div>
      )}
    </span>
  )
}

export default PokeButton
