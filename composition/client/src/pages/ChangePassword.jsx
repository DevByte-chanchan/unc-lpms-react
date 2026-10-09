import { useState } from 'react'
import { AlertCircle, Info } from 'react-feather'
import { useNavigate } from 'react-router-dom'
import { changePassword, getSession, homeRouteForRole, logout } from '../utils/session'
import styles from '../styles/Login.module.sass'
import unclogo from '../assets/unclogo.png'

// Used two ways: as the forced screen after an administrator issued a temporary password (every
// other route is blocked until it is done), and as a normal "Change password" page any signed-in
// user can open from the header. The server enforces the rules; this form checks them first so
// the answer is instant.
const ChangePassword = () => {
  const navigate = useNavigate()
  const session = getSession()
  const forced = Boolean(session?.mustChangePassword)
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    if (form.newPassword !== form.confirm) { setError('The new password and its confirmation do not match.'); return }
    setBusy(true)
    try {
      const result = await changePassword(form.currentPassword, form.newPassword)
      if (!result.ok) { setError(result.error); return }
      navigate(homeRouteForRole(session?.role), { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <img className={styles.logo} src={unclogo} alt="University of Nueva Caceres" />
          <div className={styles.titles}>
            <div className={styles.title}>Change password</div>
            <div className={styles.subtitle}>{forced ? 'Choose a new password to continue' : session?.email}</div>
          </div>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          {forced && (
            <div role="status" className={styles.notice}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>You signed in with a temporary password. Set your own now; nothing else is available until you do.</span>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="cp-current">{forced ? 'Temporary password' : 'Current password'}</label>
            <input id="cp-current" className={styles.control} type="password" autoComplete="current-password"
                   value={form.currentPassword} onChange={set('currentPassword')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cp-new">New password</label>
            <input id="cp-new" className={styles.control} type="password" autoComplete="new-password"
                   value={form.newPassword} onChange={set('newPassword')} />
            <div className={styles.hint}>At least 8 characters, with a letter and a number. It must differ from the current one.</div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="cp-confirm">Confirm new password</label>
            <input id="cp-confirm" className={styles.control} type="password" autoComplete="new-password"
                   value={form.confirm} onChange={set('confirm')} />
          </div>

          {error && (
            <div role="alert" className={styles.alert}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className={styles.submit} disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
        </form>

        <button type="button" className={styles.switch}
                onClick={() => (forced ? (logout(), navigate('/', { replace: true })) : navigate(-1))}>
          {forced ? 'Sign out' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

export default ChangePassword
