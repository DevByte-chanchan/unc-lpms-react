import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROLES, DEMO_PASSWORD, listAccounts, login, signup, homeRouteForRole, roleMeta } from '../utils/session'
import unclogo from '../assets/unclogo.png'

// One focused screen: sign in, or create an account with a role. Whoever signs
// in here is who the rest of the app reports — no page re-stamps the identity.
const Login = () => {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'instructor' })
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const result = mode === 'login'
      ? login(form.email, form.password)
      : signup(form)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    navigate(homeRouteForRole(result.user.role), { replace: true })
  }

  const applyDemoAccount = (account) => {
    setMode('login')
    setError('')
    setForm({ name: account.name, email: account.email, password: DEMO_PASSWORD, role: account.role })
  }

  const input = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginTop: 6,
    border: '1px solid #d5d9dd', borderRadius: 6, fontSize: 14, fontFamily: "'Poppins', sans-serif"
  }
  const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5563', marginTop: 14 }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: 16, fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <img src={unclogo} alt="UNC" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 600, color: '#19282C' }}>Learning Plan System</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label style={label} htmlFor="login-name">Full name</label>
              <input id="login-name" style={input} value={form.name} onChange={set('name')} placeholder="SURNAME, FIRSTNAME" autoComplete="name" />
            </>
          )}

          <label style={label} htmlFor="login-email">Email</label>
          <input id="login-email" style={input} type="email" value={form.email} onChange={set('email')} placeholder="you@unc.edu.ph" autoComplete="username" />

          <label style={label} htmlFor="login-password">Password</label>
          <input id="login-password" style={input} type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

          {mode === 'signup' && (
            <>
              <label style={label} htmlFor="login-role">Role</label>
              <select id="login-role" style={input} value={form.role} onChange={set('role')}>
                {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </>
          )}

          {error && <div role="alert" style={{ marginTop: 14, fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px' }}>{error}</div>}

          <button type="submit" style={{ width: '100%', marginTop: 18, padding: '11px 16px', background: '#19282C', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          style={{ width: '100%', marginTop: 10, padding: '8px', background: 'transparent', border: 'none', color: '#2563eb', fontSize: 13, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}
        >
          {mode === 'login' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
        </button>

        <div style={{ marginTop: 14, borderTop: '1px solid #eef0f2', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Demo accounts (password <code>{DEMO_PASSWORD}</code>)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {listAccounts().map(a => (
              <button
                key={a.email}
                type="button"
                onClick={() => applyDemoAccount(a)}
                style={{ padding: '5px 9px', fontSize: 11, border: '1px solid #d5d9dd', background: '#fff', borderRadius: 99, cursor: 'pointer', color: '#4b5563', fontFamily: "'Poppins', sans-serif" }}
              >
                {roleMeta(a.role)?.label || a.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
