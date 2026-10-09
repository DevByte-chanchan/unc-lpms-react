import { useState, useEffect } from 'react'
import { Eye, EyeOff, AlertCircle, Info } from 'react-feather'
import { useNavigate } from 'react-router-dom'
import {
  ROLES, DEMO_MODE, DEMO_PASSWORD, listAccounts, login, signup, homeRouteForRole, roleMeta, authMode,
  registrationRoles, fetchDemoAccounts,
  requestPasswordReset, resetPassword
} from '../utils/session'
import styles from '../styles/Login.module.sass'
import unclogo from '../assets/unclogo.png'

// One focused screen with four modes: sign in, create an account, ask for a
// reset, and finish a reset. Whoever signs in here is who the rest of the app
// reports — no page re-stamps the identity.
//
// Layout lives in Login.module.sass on the shared tokens. It used to be inline
// styles, which is why the spacing between fields disagreed with itself and
// the inputs were a different height from every other control in the app.

// Everything that changes with the mode, in one place. Reading four scattered
// ternaries in the JSX was how the old version's copy drifted out of sync.
const COPY = {
  login: { subtitle: 'Sign in to continue', submit: 'Sign in', busy: 'Signing in…' },
  signup: { subtitle: 'Create your account', submit: 'Create account', busy: 'Creating…' },
  forgot: { subtitle: 'Reset your password', submit: 'Send reset link', busy: 'Sending…' },
  reset: { subtitle: 'Choose a new password', submit: 'Set new password', busy: 'Saving…' }
}

// The three answers authMode() can give, plus the moment before it answers.
const STORE_DOT = { server: 'online', local: 'offline', unconfigured: 'offline' }
const STORE_MESSAGE = {
  checking: 'Checking accounts…',
  server: '',
  local: DEMO_MODE
    ? 'Offline mode — the server is not running, so the built-in demo accounts are being used.'
    : 'The authentication server is unavailable. Sign-in is temporarily disabled.',
  unconfigured: DEMO_MODE
    ? 'The server is running, but its accounts table is not set up yet — the built-in demo accounts are being used instead. To use real accounts, run:'
    : 'The authentication server is not configured. Sign-in is temporarily disabled.'
}

const Login = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'instructor', token: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  // 'server' once the Users table answers, 'local' when the backend is off.
  const [store, setStore] = useState(null)
  // The honeypot's value. Hidden from real users, so it stays empty; a script
  // that fills every field on the form gives itself away. Taken from
  // my.unc.edu.ph, which hides an input named `body` the same way.
  const [trap, setTrap] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // The superuser is not offered in the "Login as" list; they use the administrator sign-in below.
  const [adminMode, setAdminMode] = useState(false)
  // Demo accounts listed by the server (email, role, shared password), when it is set up to.
  const [serverDemo, setServerDemo] = useState(null)

  // A password-reset link from the email opens the reset form with the code and email filled in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('reset')
    if (!token) return
    setForm(prev => ({ ...prev, token, email: params.get('email') || prev.email }))
    setMode('reset')
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  useEffect(() => {
    let live = true
    fetchDemoAccounts().then(found => { if (live) setServerDemo(found) })
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    authMode().then(m => { if (live) setStore(m) })
    return () => { live = false }
  }, [])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  // Moving between modes must clear the previous mode's messages, or a stale
  // "Incorrect email, password or role." sits above the reset form and reads
  // as if the reset itself failed.
  const goTo = (next) => {
    setMode(next)
    if (next === 'signup') setForm(prev => ({ ...prev, role: 'instructor' }))
    setError('')
    setNotice('')
    setShowPassword(false)
    if (next !== 'login') setAdminMode(false)
  }

  const submitLabel = busy ? COPY[mode].busy : COPY[mode].submit

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'forgot') {
        const res = await requestPasswordReset(form.email, { honeypot: trap })
        if (!res.ok) { setError(res.error); return }
        // A reset code may only be returned by the explicit local-development
        // escape hatch. In normal operation the delivery service owns it.
        if (!res.devToken) {
          setNotice(res.message || 'If the account is eligible, reset instructions will be delivered securely.')
          return
        }
        setForm(prev => ({ ...prev, token: res.devToken || '', password: '' }))
        setNotice(`${res.message} The code below was filled in for you because this server is running in demo mode.`)
        setMode('reset')
        return
      }

      if (mode === 'reset') {
        const res = await resetPassword({ email: form.email, token: form.token, password: form.password })
        if (!res.ok) { setError(res.error); return }
        navigate(homeRouteForRole(res.user.role), { replace: true })
        return
      }

      const result = mode === 'login'
        ? await login(form.email, form.password, { role: adminMode ? 'superuser' : form.role, honeypot: trap })
        : await signup({ ...form, honeypot: trap })

      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate(homeRouteForRole(result.user.role), { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const applyDemoAccount = (account) => {
    goTo('login')
    // The role has to move with the account — otherwise the dropdown still
    // says the previous role and the sign-in fails the role check.
    setForm(prev => ({
      ...prev,
      name: account.name,
      email: account.email,
      password: demoPassword,
      role: account.role
    }))
  }

  const isAuthMode = mode === 'login' || mode === 'signup'

  // The demo accounts to list: the server's (all of them, with their emails), else the built-in
  // browser ones in a demo build. Either way the shared password is shown with them.
  const demoAccounts = serverDemo ? serverDemo.accounts : (DEMO_MODE ? listAccounts() : [])
  const demoPassword = serverDemo ? serverDemo.password : DEMO_PASSWORD

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <img className={styles.logo} src={unclogo} alt="University of Nueva Caceres" />
          <div className={styles.titles}>
            <div className={styles.title}>Learning Plan System</div>
            <div className={styles.subtitle}>{mode === 'login' && adminMode ? 'Administrator sign-in' : COPY[mode].subtitle}</div>
          </div>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* The role selector, first, the way my.unc.edu.ph orders it. On
              sign-in it is checked against the account — but a wrong role
              fails with the same message as a wrong password, so the form
              cannot be used to work out which email/role pairs exist.
              The label changes with the mode: "Login as" is wrong when you are
              creating an account, because you are not logging in as anything
              yet — you are saying what the account will be.
              The reset flow has no role field at all: the account already has
              one, and asking again would let a wrong answer look like a failed
              reset. */}
          {isAuthMode && !(mode === 'login' && adminMode) && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-role">
                {mode === 'login' ? 'Login as' : 'Register as'}
              </label>
              <select id="login-role" className={styles.control} value={form.role} onChange={set('role')}>
                {(mode === 'signup' ? registrationRoles(DEMO_MODE) : ROLES.filter(r => r.key !== 'superuser'))
                  .map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
          )}

          {mode === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-name">Full name</label>
              <input id="login-name" className={styles.control} value={form.name} onChange={set('name')}
                     placeholder="SURNAME, FIRSTNAME" autoComplete="name" />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">Email</label>
            <input id="login-email" className={styles.control} type="email" value={form.email} onChange={set('email')}
                   placeholder="you@unc.edu.ph" autoComplete="username" readOnly={mode === 'reset'} />
          </div>

          {mode === 'reset' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-token">Reset code</label>
              <input id="login-token" className={styles.control} value={form.token} onChange={set('token')}
                     placeholder="Paste the code from the reset link" autoComplete="one-time-code"
                     spellCheck={false} />
            </div>
          )}

          {mode !== 'forgot' && (
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="login-password">
                  {mode === 'reset' ? 'New password' : 'Password'}
                </label>
                {/* Under the password, where someone realises they have
                    forgotten it — not buried at the bottom of the card. */}
                {mode === 'login' && (
                  <button type="button" className={styles.link} onClick={() => goTo('forgot')}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className={styles.passwordWrap}>
                <input
                  id="login-password"
                  className={styles.control}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {/* type="button" matters: inside a <form> a bare button submits.
                    aria-pressed announces the state, and the label says what the
                    click will DO, which is what a screen reader user needs. */}
                <button
                  type="button"
                  className={styles.peek}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'reset' && <div className={styles.hint}>At least 8 characters.</div>}
            </div>
          )}

          {mode === 'forgot' && (
            <div className={styles.hint}>
              Enter the email on the account. We answer the same way whether or not it is
              registered, so nobody can use this form to find out who has an account.
            </div>
          )}

          {/* Anti-bot honeypot. Off-screen rather than display:none, because
              some bots skip hidden inputs but not positioned ones. Never
              remove the aria-hidden/tabIndex — a screen-reader user must not
              be able to land in it and fail the check. */}
          <div className={styles.trap} aria-hidden="true">
            <label htmlFor="login-body">Leave this field empty</label>
            <input id="login-body" name="body" type="text" tabIndex={-1} autoComplete="off"
                   value={trap} onChange={(e) => setTrap(e.target.value)} />
          </div>

          {notice && (
            <div role="status" className={styles.notice}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div role="alert" className={styles.alert}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className={styles.submit} disabled={busy}>
            {submitLabel}
          </button>
        </form>

        {mode === 'login' && (
          <button type="button" className={styles.adminLink} onClick={() => { setAdminMode(v => !v); setError('') }}>
            {adminMode ? 'Back to regular sign-in' : 'Administrator sign-in'}
          </button>
        )}

        <button
          type="button"
          className={styles.switch}
          onClick={() => goTo(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login'
            ? 'No account yet? Create one'
            : mode === 'signup'
              ? 'Already have an account? Sign in'
              : 'Back to sign in'}
        </button>

        <div className={styles.footer}>
          {/* Which account store is actually answering. Without this the
              paths are indistinguishable, and "it worked on my machine"
              becomes impossible to diagnose.
              'unconfigured' is the case that wasted an afternoon: the backend
              is running, but /api/auth is not mounted or the Users table has
              not been migrated. Sign-in falls back to the demo accounts and
              still works — but you need to be told why, and what to run. */}
          {(STORE_MESSAGE[store] ?? STORE_MESSAGE.checking) !== '' && (
            <div className={styles.status}>
              <span className={`${styles.dot} ${STORE_DOT[store] ? styles[STORE_DOT[store]] : ''}`} />
              <span>{STORE_MESSAGE[store] ?? STORE_MESSAGE.checking}</span>
            </div>
          )}

          {DEMO_MODE && store === 'unconfigured' && (
            <div className={styles.setup}>
              In <code>composition/server</code>:
              <code className={styles.cmd}>node migrate.js</code>
              {/* run-seeder.js takes the bare file name — it resolves it
                  against server/seeders itself. */}
              <code className={styles.cmd}>node run-seeder.js 20260812000000-demo-users.js</code>
            </div>
          )}

          {mode === 'login' && !adminMode && demoAccounts.length > 0 && (
            <>
              <div className={styles.demoLabel}>Demo accounts. The password for all of them is <code>{demoPassword}</code>. Click one to fill the form.</div>
              <div className={styles.demoGrid}>
                {demoAccounts.map(a => (
                  <button key={a.email} type="button" className={styles.demoChip} onClick={() => applyDemoAccount(a)}>
                    <span className={styles.demoRole}>{roleMeta(a.role)?.label || a.role}</span>
                    <span className={styles.demoEmail}>{a.email}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
