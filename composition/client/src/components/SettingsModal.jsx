import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle, Lock, LogOut, Maximize, Minimize2, PenLine, User, X } from 'lucide-react'
import { changePassword, getSession, logout, roleMeta } from '../utils/session.js'
import SignOutDialog from './SignOutDialog.jsx'
import styles from '../styles/SettingsModal.module.sass'
import SignatureTab from './SignatureTab.jsx'

// The account settings window, opened from the sidebar's Settings item and from the account card: who is signed in
// (Account) and the password (Security). It is a window like the app's other large
// ones: dark backdrop, a header with maximise and close, Escape leaves full screen first and then closes it.
// Signing in with a temporary password still uses the full-page /change-password screen, which blocks everything
// else until it is done.
const TABS = [
  { key: 'account', label: 'Account', Icon: User, about: 'Who is signed in.' },
  { key: 'security', label: 'Security', Icon: Lock, about: 'Change your password.' },
  // Only roles with a box on the plan's signature block (Prepared, Reviewed, Resources Certified, Approved, Noted by).
  { key: 'signature', label: 'Signature', Icon: PenLine, about: 'The signature printed on the plans you prepare or approve.', roles: ['instructor', 'industry-consultant', 'program-head', 'director-of-libraries', 'dean'] }
]

// "DANILA, JUNAR" -> "JD": the first letters of the given and the family name, like the account button.
const initialsOf = (name) => {
  const [family = '', given = ''] = String(name || '').split(',').map(part => part.trim())
  return ((given[0] || '') + (family[0] || '')).toUpperCase() || '?'
}

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

  const rules = [
    { label: 'At least 8 characters', ok: form.newPassword.length >= 8 },
    { label: 'A letter and a number', ok: /[a-z]/i.test(form.newPassword) && /[0-9]/.test(form.newPassword) },
    { label: 'Different from the current password', ok: !!form.newPassword && form.newPassword !== form.currentPassword },
    { label: 'Confirmation matches', ok: !!form.confirm && form.confirm === form.newPassword },
  ]
  const ready = !!form.currentPassword && rules.every(rule => rule.ok)

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
      {form.newPassword && (
        // The rules as a checklist that ticks while typing, so the form is right before it is sent, not after.
        <ul className={styles.rules} aria-live="polite">
          {rules.map(rule => (
            <li key={rule.label} className={rule.ok ? styles.good : styles.bad}>
              {rule.ok ? <CheckCircle size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />} {rule.label}
            </li>
          ))}
        </ul>
      )}
      <Row label="Confirm new password">
        <input className={styles.control} type="password" autoComplete="new-password" aria-label="Confirm new password"
          value={form.confirm} onChange={set('confirm')} />
      </Row>
      {error && <div role="alert" className={`${styles.note} ${styles.bad}`}><AlertCircle size={14} aria-hidden="true" /> {error}</div>}
      {done && <div role="status" className={`${styles.note} ${styles.good}`}><CheckCircle size={14} aria-hidden="true" /> Your password was changed.</div>}
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={busy || !ready}>{busy ? 'Saving…' : 'Change password'}</button>
      </div>
    </form>
  )
}

const SettingsModal = ({ open, onClose, initialTab = 'account' }) => {
  const session = getSession()
  const [tab, setTab] = useState(initialTab)
  const [expanded, setExpanded] = useState(false)
  // Sign out from here too, through the same confirmation as the side bar's Log Out.
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { if (open) setTab(initialTab) }, [open, initialTab])

  const close = useCallback(() => { setExpanded(false); onClose() }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      // the sign-out question answers its own Escape; Settings stays open behind it
      if (event.key !== 'Escape' || signingOut) return
      if (expanded) setExpanded(false)
      else close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, expanded, close, signingOut])

  if (!open) return null
  const visibleTabs = TABS.filter(item => !item.roles || (session?.roles || [session?.role]).some(role => item.roles.includes(role)))
  const current = visibleTabs.find(item => item.key === tab) || visibleTabs[0]

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
              <X size={16} strokeWidth={2} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Tabs down the left like the app's own side navigation; the chosen one's title and purpose head the page. */}
        <div className={styles.layout}>
          <nav className={styles.tabs} role="tablist" aria-label="Settings" aria-orientation="vertical">
            {visibleTabs.map(item => (
              <button key={item.key} type="button" role="tab" aria-selected={tab === item.key}
                className={`${styles.tab} ${tab === item.key ? styles.tabOn : ''}`} onClick={() => setTab(item.key)}>
                <item.Icon size={16} aria-hidden="true" /> {item.label}
              </button>
            ))}
            <button type="button" className={`${styles.tab} ${styles.signOut}`} onClick={() => setSigningOut(true)}>
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          </nav>
          <div className={styles.content}>
            <div className={styles.pageHead}>
              <h3>{current.label}</h3>
              <p>{current.about}</p>
            </div>
            {tab === 'account' && (
              <>
                <div className={styles.profile}>
                  <span className={styles.avatar} aria-hidden="true">{initialsOf(session?.name)}</span>
                  <div className={styles.profileText}>
                    <strong>{session?.name || '—'}</strong>
                    <span>{session?.email || '—'}</span>
                  </div>
                </div>
                <Row label="Roles" hint="Switch between them from the account menu.">
                  <span className={styles.roleChips}>
                    {(session?.roles?.length ? session.roles : [session?.role]).filter(Boolean).map(key => (
                      <span key={key} className={`${styles.roleChip} ${key === session?.role ? styles.roleChipOn : ''}`}>{roleMeta(key)?.label || key}</span>
                    ))}
                  </span>
                </Row>
                <div className={styles.footnote}>Your name, e-mail and roles are set by the VPAA or a superuser (User Accounts).</div>
              </>
            )}
            {tab === 'security' && <SecurityTab />}
            {tab === 'signature' && <SignatureTab />}
          </div>
        </div>
      </div>
      <SignOutDialog open={signingOut} onCancel={() => setSigningOut(false)}
        onConfirm={() => { setSigningOut(false); onClose(); logout(); navigate('/', { replace: true }) }} />
    </>,
    document.body
  )
}

export default SettingsModal
