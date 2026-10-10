/**
 * The password inputs and live checklist shared by Change password, Set
 * password (invitation) and Reset password, so the rules read the same
 * everywhere. The server re-checks them (passwordProblems in authController).
 */
import { Eye, EyeOff, AlertCircle, Check, Circle } from 'react-feather';
import styles from '../styles/Login.module.sass';

const cx = (...c) => c.filter(Boolean).join(' ');

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
);

/** checks: [{ ok, label }]; emailClash: the password is the account's email. */
export const PasswordChecklist = ({ checks, emailClash = false }) => (
  <ul className={styles.checklist} aria-label="Password requirements">
    {checks.map((c) => (
      <li key={c.label} className={cx(styles.check, c.ok && styles.checkOk)}>
        {c.ok ? <Check size={14} /> : <Circle size={14} />}
        {c.label}
      </li>
    ))}
    {emailClash && <li className={styles.check} style={{ color: '#B91C1C' }}><AlertCircle size={14} />Can&apos;t be your email address</li>}
  </ul>
);

