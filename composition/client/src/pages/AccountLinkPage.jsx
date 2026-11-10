import { useEffect, useState } from 'react'
import { CheckCircle } from 'react-feather'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  lookupAccountLink, acceptInvitation, resetPassword, requestInvitation, fetchPrivacyNotice, getSession, logout,
  homeRouteForRole, roleMeta
} from '../utils/session'
import styles from '../styles/AccountAuth.module.sass'
import { Brand, Alert, PasswordField, PasswordChecklist } from '../components/AccountAuth.jsx'
import { cx, completeEmail, ALLOWED_EMAIL_DOMAIN, newPasswordChecks } from '../utils/accountAuth.js'

// The page behind an e-mailed link (feature/course-assignment):
//   /set-password?token=     an invitation to a new account (kind="invitation"): set a password, accept the Privacy
//                            Notice, and you are signed in
//   /reset-password?token=   a reset link (kind="reset"): choose a new password, and you are signed in
// Public: no session needed. Signed in as someone ELSE when the link opens? It asks first, so one person's link
// is never applied to another person's session. A dead invitation link offers "Send me a new link".

const NewLinkForm = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    const full = completeEmail(email)
    if (!full) return
    setBusy(true)
    const result = await requestInvitation(full)
    setBusy(false)
    setSent(result.message || result.error)
  }
  if (sent) {
    return (
      <div className={styles.success} role="status">
        <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{sent} Check your inbox (and Spam).</span>
      </div>
    )
  }
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="newlink-email">Email</label>
        <input id="newlink-email" className={styles.input} type="email" autoComplete="username"
          placeholder={`name@${ALLOWED_EMAIL_DOMAIN}`} value={email}
          onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmail(v => completeEmail(v))} />
        <span className={styles.help}>The address your invitation was sent to.</span>
      </div>
      <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={busy}>
        {busy ? 'Sending…' : 'Send me a new link'}
      </button>
    </form>
  )
}

const AccountLinkPage = ({ kind }) => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const invite = kind === 'invitation'
  const [info, setInfo] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [privacy, setPrivacy] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [otherSession, setOtherSession] = useState(() => getSession())

  useEffect(() => {
    let live = true
    lookupAccountLink(kind, token).then(found => {
      if (!live) return
      if (found.ok) setInfo(found)
      else setLoadError(found)
    })
    if (invite) fetchPrivacyNotice().then(found => { if (live) setPrivacy(found) })
    return () => { live = false }
  }, [kind, token, invite])

  const signedInAsOther = otherSession && info && otherSession.email !== info.email

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    const checks = newPasswordChecks(password, confirm)
    if (!checks.every(c => c.ok)) { setError('The new password does not meet the requirements yet.'); return }
    if (invite && !accepted) { setError('Read and accept the Privacy Notice to activate your account.'); return }
    setError('')
    setBusy(true)
    try {
      const result = invite
        ? await acceptInvitation({ token, password, consentVersion: privacy?.version })
        : await resetPassword({ token, password })
      if (!result.ok) { setError(result.error); return }
      // Several roles: the sign-in screen asks which to continue as. Otherwise straight to the home page.
      navigate(result.chooseRole ? '/' : homeRouteForRole(result.user.role), { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const goHome = () => navigate('/', { replace: true })

  let body
  if (loadError) {
    body = invite && loadError.gone ? (
      <>
        <Alert>This link has been replaced by a newer one or has expired. Check your inbox for the latest e-mail from LPMS, or get a new link.</Alert>
        <NewLinkForm />
      </>
    ) : (
      <>
        <Alert>{loadError.gone ? 'This link has expired or was already used. Ask for a new one from Forgot password.' : loadError.error}</Alert>
        {!invite && <button type="button" className={cx(styles.btn, styles.btnSecondary)} onClick={() => navigate('/forgot-password')}>Forgot password</button>}
      </>
    )
  } else if (!info) {
    body = <div className={styles.spinnerDark} role="status" aria-label="Loading" />
  } else if (signedInAsOther) {
    body = (
      <>
        <Alert>You are signed in as {otherSession.name}. This link is for {info.name} ({info.email}). Continue to sign {otherSession.name} out first.</Alert>
        <button type="button" className={cx(styles.btn, styles.btnPrimary)} onClick={() => { logout(); setOtherSession(null) }}>Continue</button>
        <button type="button" className={styles.linkBtn} onClick={goHome}>Cancel</button>
      </>
    )
  } else {
    const checks = newPasswordChecks(password, confirm)
    body = (
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.readonly}>
          <span>{info.name}</span>
          <span>{info.email}</span>
          {invite && info.roles?.length > 0 && <span>{info.roles.map(r => roleMeta(r)?.label || r).join(', ')}</span>}
        </div>
        <PasswordField id="link-password" label="New password" value={password} onChange={setPassword}
          autoComplete="new-password" autoFocus show={show} onToggle={() => setShow(s => !s)} />
        <PasswordField id="link-confirm" label="Confirm new password" value={confirm} onChange={setConfirm}
          autoComplete="new-password" show={show} onToggle={() => setShow(s => !s)} />
        <PasswordChecklist checks={checks} />
        {invite && (
          <label className={styles.help} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>
              I have read and accept the <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</a>
              {privacy ? ` (version ${privacy.version})` : ''}.
            </span>
          </label>
        )}
        {error && <Alert>{error}</Alert>}
        <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={busy}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />Saving…</> : (invite ? 'Set password' : 'Save new password')}
        </button>
      </form>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Brand />
        <div>
          <h2 className={styles.title}>{invite ? (info ? `Welcome, ${info.name}` : 'Set your password') : 'Choose a new password'}</h2>
          {invite && <p className={styles.lead}>Choose a password to finish setting up your LPMS account.</p>}
        </div>
        {body}
        {!signedInAsOther && <button type="button" className={styles.linkBtn} onClick={goHome}>Back to sign in</button>}
      </div>
    </div>
  )
}

export default AccountLinkPage
