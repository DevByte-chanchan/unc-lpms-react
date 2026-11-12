/**
 * Sign in — /login (demo-ready UI matching feature/course-assignment).
 *
 * Email + password. The email must be a UNC address; typing just the part
 * before the @ completes it.
 *   - monica.norton@unc.edu.ph → Instructor (/dashboard)
 *   - jake.peralta@unc.edu.ph  → Program Head (/role/program-head/dashboard)
 *   - Any other @unc.edu.ph    → "Continue as…" role picker card
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ChevronRight } from 'react-feather';
import unclogo from '../assets/unclogo.png';
import { INSTRUCTOR, PROGRAM_HEAD } from '../constants/users.js';
import styles from '../styles/Login.module.sass';

const cx = (...c) => c.filter(Boolean).join(' ');

const ALLOWED_EMAIL_DOMAIN = 'unc.edu.ph';
const DOMAIN_MESSAGE = `Use your @${ALLOWED_EMAIL_DOMAIN} email address.`;

const ROLE_HOMES = {
  'Instructor': '/dashboard',
  'Program Head': '/role/program-head/dashboard',
};

const ROLE_DESCRIPTIONS = {
  'Instructor': 'Write syllabi and TOS for the courses assigned to you.',
  'Program Head': 'Manage your program’s courses, assignments and TOS reviews.',
};

const DEMO_ACCOUNTS = [
  {
    role: 'Instructor',
    name: INSTRUCTOR.display,
    email: 'monica.norton@unc.edu.ph',
    home: ROLE_HOMES['Instructor'],
  },
  {
    role: 'Program Head',
    name: PROGRAM_HEAD.display,
    email: 'jake.peralta@unc.edu.ph',
    home: ROLE_HOMES['Program Head'],
  },
];

function completeEmail(raw) {
  const e = String(raw || '').trim();
  if (!e || e.includes('@')) return e;
  return `${e}@${ALLOWED_EMAIL_DOMAIN}`;
}

function isAllowedEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at <= 0 || e.indexOf('@') !== at) return false;
  if (!/^[a-z0-9._%+-]+$/.test(e.slice(0, at))) return false;
  return e.slice(at + 1) === ALLOWED_EMAIL_DOMAIN;
}

function resolveRolesForEmail(email) {
  const local = String(email || '').trim().toLowerCase().split('@')[0];
  if (local.includes('monica') || local.includes('norton') || local === 'instructor') {
    return ['Instructor'];
  }
  if (local.includes('jake') || local.includes('peralta') || local.includes('vance') || local === 'programhead' || local === 'program.head') {
    return ['Program Head'];
  }
  return ['Instructor', 'Program Head'];
}

export const Brand = () => (
  <div className={styles.brand}>
    <img className={styles.logo} src={unclogo} alt="University of Nueva Caceres logo" />
    <h1 className={styles.heading}>University of Nueva Caceres</h1>
    <div className={styles.subheading}>Learning Plan Management System</div>
  </div>
);

/** "Continue as…" — the role picker for someone signed in with several roles. */
export const ContinueAs = ({ roles, onPick }) => (
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
              <span className={styles.roleName}>{role}</span>
              <span className={styles.roleDesc}>{ROLE_DESCRIPTIONS[role]}</span>
            </span>
            <ChevronRight size={18} color="#6B7280" />
          </button>
        ))}
      </div>
    </div>
  </div>
);

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [emailError, setEmailError] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [chooseFrom, setChooseFrom] = React.useState(null);
  const passwordRef = React.useRef(null);

  const continueAs = (role) => {
    try {
      window.sessionStorage.setItem('lpms.activeRole', role);
    } catch {
      // ignore storage errors
    }
    navigate(ROLE_HOMES[role] || '/dashboard', { replace: true });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const full = completeEmail(email);
    if (full !== email) setEmail(full);

    if (!isAllowedEmail(full)) {
      setEmailError(DOMAIN_MESSAGE);
      return;
    }
    setEmailError(null);

    if (!password) {
      setError('Enter your password.');
      if (passwordRef.current) passwordRef.current.focus();
      return;
    }

    setBusy(true);
    setTimeout(() => {
      const roles = resolveRolesForEmail(full);
      setBusy(false);
      if (roles.length === 1) {
        continueAs(roles[0]);
      } else {
        setChooseFrom(roles);
      }
    }, 350);
  };

  const handleQuickDemo = (account) => {
    if (busy) return;
    setEmailError(null);
    setError(null);
    setEmail(account.email);
    setPassword('unc-lpms-2026');
  };

  if (chooseFrom) return <ContinueAs roles={chooseFrom} onPick={continueAs} />;

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Brand />
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className={cx(styles.input, emailError && styles.inputInvalid)}
              type="email"
              autoComplete="username"
              autoFocus
              placeholder={'name@' + ALLOWED_EMAIL_DOMAIN}
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
              onBlur={() => setEmail((v) => completeEmail(v))}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'login-email-error' : 'login-email-help'}
            />
            {emailError
              ? <span id="login-email-error" className={styles.fieldError}>{emailError}</span>
              : <span id="login-email-help" className={styles.help}>Use your UNC email (@{ALLOWED_EMAIL_DOMAIN}).</span>}
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
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.alert} role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={busy}>
            {busy ? <><span className={styles.spinner} aria-hidden="true" />Signing in…</> : 'Sign in'}
          </button>
        </form>

        <div className={styles.demoSection}>
          <div className={styles.demoHeader}>Quick Demo Login</div>
          <div className={styles.demoGrid}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                className={styles.demoBtn}
                disabled={busy}
                onClick={() => handleQuickDemo(acc)}
              >
                <span className={styles.demoRole}>{acc.role}</span>
                <span className={styles.demoName}>{acc.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
