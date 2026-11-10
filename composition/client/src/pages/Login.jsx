import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff } from 'react-feather'
import { useNavigate } from 'react-router-dom'
import {
  DEMO_MODE, DEMO_PASSWORD, listAccounts, login, logout, chooseRole, getSession, homeRouteForRole, roleMeta, authMode,
  fetchDemoAccounts
} from '../utils/session'
import styles from '../styles/AccountAuth.module.sass'
import { Brand, ContinueAs, Alert } from '../components/AccountAuth.jsx'
import { cx, completeEmail, ALLOWED_EMAIL_DOMAIN } from '../utils/accountAuth.js'

// The sign-in screen of feature/course-assignment: e-mail and password, then "Continue as..." when the account
// holds several roles. No role is chosen on the form any more, and accounts are created by the VPAA or the
// superuser (User Accounts), who send a set-password link. Kept from this app: the demo accounts (demo builds),
// the line saying which account store answers, and the Privacy Notice link.

// The three answers authMode() can give, plus the moment before it answers.
const STORE_MESSAGE = {
  checking: 'Checking accounts…',
  server: '',
  local: DEMO_MODE
    ? 'Offline mode: the server is not running, so the built-in demo accounts are being used.'
    : 'The authentication server is unavailable. Sign-in is temporarily disabled.',
  unconfigured: DEMO_MODE
    ? 'The server is running, but it has no accounts yet, so the built-in demo accounts are being used. To use real accounts, run in composition/server: node migrate.js, then node run-seeder.js 20260812000000-demo-users.js'
    : 'The authentication server is not configured. Sign-in is temporarily disabled.'
}

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [store, setStore] = useState(null)
  const [serverDemo, setServerDemo] = useState(null)
  // The honeypot (my.unc.edu.ph's hidden `body` field): a real browser leaves it empty.
  const [trap, setTrap] = useState('')
  const passwordRef = useRef(null)
  const session = getSession()

  useEffect(() => {
    let live = true
    fetchDemoAccounts().then(found => { if (live) setServerDemo(found) })
    authMode().then(m => { if (live) setStore(m) })
    return () => { live = false }
  }, [])

  // Signed in with several roles: which one to continue as.
  if (session?.pendingRoleChoice) {
    return (
      <ContinueAs
        roles={session.roles}
        onPick={(role) => { chooseRole(role); navigate(homeRouteForRole(role), { replace: true }) }}
        onCancel={() => logout()}
      />
    )
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    const full = completeEmail(email)
    if (full !== email) setEmail(full)
    if (!full) { setError('Enter your email address.'); return }
    if (!password) { setError('Enter your password.'); passwordRef.current?.focus(); return }
    setBusy(true)
    try {
      const result = await login(full, password, { honeypot: trap })
      if (!result.ok) {
        setPassword('')
        setError(result.error || 'Incorrect email or password.')
        return
      }
      // Several roles: the gate shows "Continue as..." (pendingRoleChoice). One role: straight to its home.
      if (!result.chooseRole) navigate(homeRouteForRole(result.user.role), { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const demoAccounts = serverDemo ? serverDemo.accounts : (DEMO_MODE ? listAccounts() : [])
  const demoPassword = serverDemo ? serverDemo.password : DEMO_PASSWORD
  const storeMessage = STORE_MESSAGE[store] ?? STORE_MESSAGE.checking

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Brand />
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className={styles.input}
              type="email"
              autoComplete="username"
              autoFocus
              placeholder={`name@${ALLOWED_EMAIL_DOMAIN}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmail(v => completeEmail(v))}
              aria-describedby="login-email-help"
            />
            <span id="login-email-help" className={styles.help}>Use your UNC email (@{ALLOWED_EMAIL_DOMAIN}).</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">Password</label>
            <div className={styles.inputWrap}>
              <input
                id="login-password"
                ref={passwordRef}
                className={cx(styles.input, styles.inputWithToggle)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* The honeypot: hidden from people, filled only by scripts. */}
          <input type="text" name="body" value={trap} onChange={(e) => setTrap(e.target.value)}
            tabIndex={-1} autoComplete="off" aria-hidden="true"
            style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />

          {error && <Alert>{error}</Alert>}

          <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={busy}>
            {busy ? <><span className={styles.spinner} aria-hidden="true" />Signing in…</> : 'Sign in'}
          </button>
        </form>

        <button type="button" className={styles.linkBtn} onClick={() => navigate('/forgot-password')}>
          Forgot password?
        </button>

        {storeMessage && <p className={styles.note}>{storeMessage}</p>}

        {demoAccounts.length > 0 && (
          <div>
            <p className={styles.help}>Demo accounts. The password for all of them is <code>{demoPassword}</code>. Click one to fill the form.</p>
            <div className={styles.chips}>
              {demoAccounts.map(a => (
                <button key={a.email} type="button" className={styles.chip}
                  title={a.email}
                  onClick={() => { setEmail(a.email); setPassword(demoPassword); setError('') }}>
                  {roleMeta(a.role)?.label || a.role}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className={styles.help} style={{ textAlign: 'center' }}>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</a>
        </p>
      </div>
    </div>
  )
}

export default Login
