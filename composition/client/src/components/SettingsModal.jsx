import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle, Maximize, Minimize2, X } from 'react-feather'
import { changePassword, getSession } from '../utils/session.js'
import styles from '../styles/SettingsModal.module.sass'
import SignatureTab from './SignatureTab.jsx'

// The account settings window, opened from the sidebar's Settings item and from the account card: who is signed in
// (Account) and the password (Security). It is a window like the app's other large
// ones: dark backdrop, a header with maximise and close, Escape leaves full screen first and then closes it.
// Signing in with a temporary password still uses the full-page /change-password screen, which blocks everything
// else until it is done.
const TABS = [
  { key: 'account', label: 'Account' },
  { key: 'security', label: 'Security' },
  // Only roles with a box on the plan's signature block (Prepared, Reviewed, Resources Certified, Approved, Noted by).
  { key: 'signature', label: 'Signature', roles: ['instructor', 'industry-consultant', 'program-head', 'director-of-libraries', 'dean'] }
]

const Row = ({ label, hint, children }) => (
  <div className={styles.row}>
    <div className={styles.rowLabel}>
      <div>{label}</div>
      {hint && <div className={styles.rowHint}>{hint}</div>}
    </div>
    <div className={styles.rowValue}>{children}</div>
  </div>
)

const SecurityTab = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (field) => (event) => { setDone(false); setForm(previous => ({ ...previous, [field]: event.target.value })) }

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    setError(''); setDone(false)
    if (form.newPassword !== form.confirm) { setError('The new password and its confirmation do not match.'); return }
    setBusy(true)
    try {
      const result = await changePassword(form.currentPassword, form.newPassword)
      if (!result.ok) { setError(result.error); return }
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <Row label="Current password">
        <input className={styles.control} type="password" autoComplete="current-password" aria-label="Current password"
          value={form.currentPassword} onChange={set('currentPassword')} />
      </Row>
      <Row label="New password" hint="At least 8 characters, with a letter and a number. It must differ from the current one.">
        <input className={styles.control} type="password" autoComplete="new-password" aria-label="New password"
          value={form.newPassword} onChange={set('newPassword')} />
      </Row>
      <Row label="Confirm new password">
        <input className={styles.control} type="password" autoComplete="new-password" aria-label="Confirm new password"
          value={form.confirm} onChange={set('confirm')} />
      </Row>
      {error && <div role="alert" className={`${styles.note} ${styles.bad}`}><AlertCircle size={14} aria-hidden="true" /> {error}</div>}
      {done && <div role="status" className={`${styles.note} ${styles.good}`}><CheckCircle size={14} aria-hidden="true" /> Your password was changed.</div>}
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={busy || !form.currentPassword || !form.newPassword}>{busy ? 'Saving…' : 'Change password'}</button>
      </div>
    </form>
  )
}

const SettingsModal = ({ open, onClose, initialTab = 'account' }) => {
  const session = getSession()
  const [tab, setTab] = useState(initialTab)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { if (open) setTab(initialTab) }, [open, initialTab])

  const close = useCallback(() => { setExpanded(false); onClose() }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (expanded) setExpanded(false)
      else close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, expanded, close])

  if (!open) return null

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Settings" className={`${styles.window} ${expanded ? styles.expanded : ''}`}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">Settings</h2>
            <div className={styles.sub}>Your account details, password and signature.</div>
          </div>
          <div className="app-window-actions">
            <button type="button" className="app-icon-btn" onClick={() => setExpanded(value => !value)}
              title={expanded ? 'Exit full screen' : 'Full screen'} aria-label={expanded ? 'Exit full screen' : 'Full screen'}>
              {expanded ? <Minimize2 size={16} /> : <Maximize size={16} />}
            </button>
            <button type="button" className="app-icon-close" onClick={close} aria-label="Close settings">
              <X size={16} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Settings">
          {TABS.filter(item => !item.roles || (session?.roles || [session?.role]).some(role => item.roles.includes(role))).map(item => (
            <button key={item.key} type="button" role="tab" aria-selected={tab === item.key}
              className={`${styles.tab} ${tab === item.key ? styles.tabOn : ''}`} onClick={() => setTab(item.key)}>{item.label}</button>
          ))}
        </div>

        <div className={styles.content}>
          {tab === 'account' && (
            <>
              <Row label="Name">{session?.name || '—'}</Row>
              <Row label="E-mail">{session?.email || '—'}</Row>
              <Row label="Role">{session?.roleLabel || '—'}</Row>
              <div className={styles.footnote}>Only a superuser can change these.</div>
            </>
          )}
          {tab === 'security' && <SecurityTab />}
          {tab === 'signature' && <SignatureTab />}
        </div>
      </div>
    </>,
    document.body
  )
}

export default SettingsModal
