import { useState } from 'react'
import { CheckCircle } from 'react-feather'
import { useNavigate } from 'react-router-dom'
import { requestPasswordReset } from '../utils/session'
import styles from '../styles/AccountAuth.module.sass'
import { Brand, Alert } from '../components/AccountAuth.jsx'
import { cx, completeEmail, ALLOWED_EMAIL_DOMAIN } from '../utils/accountAuth.js'

// "Forgot password?" (feature/course-assignment): one e-mail field; the answer never says whether the address has
// an account. The link in the e-mail opens /reset-password. On a local demo server started with
// LPMS_EXPOSE_RESET_TOKEN=1 (no e-mail set up) the link is opened straight away instead.
const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const [trap, setTrap] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    const full = completeEmail(email)
    if (full !== email) setEmail(full)
    if (!full) { setError('Enter your email address.'); return }
    setError('')
    setBusy(true)
    try {
      const result = await requestPasswordReset(full, { honeypot: trap })
      if (!result.ok) { setError(result.error); return }
      if (result.devToken) {
        navigate(`/reset-password?token=${encodeURIComponent(result.devToken)}`, { replace: true })
        return
      }
      setSent(result.message || 'If that email has an account, a reset link has been sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Brand />
        <div>
          <h2 className={styles.title}>Forgot your password?</h2>
          <p className={styles.lead}>Enter your email and we will send you a link to choose a new one.</p>
        </div>
        {sent ? (
          <div className={styles.success} role="status">
            <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{sent} Check your inbox (and Spam).</span>
          </div>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                className={styles.input}
                type="email"
                autoComplete="username"
                autoFocus
                placeholder={`name@${ALLOWED_EMAIL_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmail(v => completeEmail(v))}
              />
            </div>
            <input type="text" name="body" value={trap} onChange={(e) => setTrap(e.target.value)}
              tabIndex={-1} autoComplete="off" aria-hidden="true"
              style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />
            {error && <Alert>{error}</Alert>}
            <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={busy}>
              {busy ? <><span className={styles.spinner} aria-hidden="true" />Sending…</> : 'Send reset link'}
            </button>
          </form>
        )}
        <button type="button" className={styles.linkBtn} onClick={() => navigate('/', { replace: true })}>
          Back to sign in
        </button>
      </div>
    </div>
  )
}

export default ForgotPassword
