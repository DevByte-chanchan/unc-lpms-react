// The pieces of the sign-in screens of feature/course-assignment, shared by Login, Forgot password and the
// e-mailed link pages (set / reset password): the brand header, the "Continue as..." role picker, and the
// password fields with their live checklist. Styles: styles/AccountAuth.module.sass.
import { ChevronRight, Eye, EyeOff, AlertCircle, Check, Circle } from 'react-feather'
import styles from '../styles/AccountAuth.module.sass'
import unclogo from '../assets/unclogo.png'
import { roleMeta } from '../utils/session'
import { cx, ROLE_DESCRIPTIONS } from '../utils/accountAuth.js'

export const Brand = () => (
  <div className={styles.brand}>
    <img className={styles.logo} src={unclogo} alt="University of Nueva Caceres logo" />
    <h1 className={styles.heading}>University of Nueva Caceres</h1>
    <div className={styles.subheading}>Learning Plan Management System</div>
  </div>
)

// "Continue as..." for someone signed in with several roles. `roles`: role keys.
export const ContinueAs = ({ roles, onPick, onCancel }) => (
  <div className={styles.screen}>
    <div className={styles.card}>
      <Brand />
      <div>
        <h2 className={styles.title}>Continue as…</h2>
        <p className={styles.lead}>Your account has more than one role. You can switch later from the menu.</p>
      </div>
      <div className={styles.roleList}>
        {roles.map((role) => (
          <button key={role} type="button" className={styles.roleOption} onClick={() => onPick(role)}>
            <span className={styles.roleText}>
              <span className={styles.roleName}>{roleMeta(role)?.label || role}</span>
              <span className={styles.roleDesc}>{ROLE_DESCRIPTIONS[role]}</span>
            </span>
            <ChevronRight size={18} color="#6B7280" />
          </button>
        ))}
      </div>
      {onCancel && <button type="button" className={styles.linkBtn} onClick={onCancel}>Sign out</button>}
    </div>
  </div>
)

export const PasswordField = ({ id, label, value, onChange, autoComplete, autoFocus, show, onToggle }) => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={id}>{label}</label>
    <div className={styles.inputWrap}>
      <input
        id={id}
        className={cx(styles.input, styles.inputWithToggle)}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className={styles.toggle} onClick={onToggle} aria-label={show ? 'Hide passwords' : 'Show passwords'} aria-pressed={show}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
)

export const PasswordChecklist = ({ checks }) => (
  <ul className={styles.checklist} aria-label="Password requirements">
    {checks.map((c) => (
      <li key={c.label} className={cx(styles.check, c.ok && styles.checkOk)}>
        {c.ok ? <Check size={14} /> : <Circle size={14} />}
        {c.label}
      </li>
    ))}
  </ul>
)

export const Alert = ({ children }) => (
  <div className={styles.alert} role="alert">
    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>{children}</span>
  </div>
)
