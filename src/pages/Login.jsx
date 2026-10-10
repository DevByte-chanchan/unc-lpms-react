/**
 * Sign in — /login (public).
 *
 * Email + password. The email must be a UNC address; typing just the part
 * before the @ completes it. After sign-in:
 *   - a forced password change goes to /change-password first;
 *   - a safe `?next=` the user's roles can open wins;
 *   - one role → that role's home; several → "Continue as…" on this card.
 * Someone already signed in is sent to their active role's home.
 */
import React from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ChevronRight } from 'react-feather';
import unclogo from '../assets/unclogo.png';
import { AuthAPI } from '../services/api.js';
import { useCurrentUser } from '../services/currentUser.jsx';
import {
  ALLOWED_EMAIL_DOMAIN, DOMAIN_MESSAGE, ROLE_DESCRIPTIONS,
  completeEmail, homeFor, isAllowedEmail, safeNext,
} from '../services/roles.js';
import { FullPageSpinner } from '../components/RequireAuth.jsx';
import styles from '../styles/Login.module.sass';

const cx = (...c) => c.filter(Boolean).join(' ');

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
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const { user, loading, activeRole, signIn, setActiveRole } = useCurrentUser();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [emailError, setEmailError] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  // Set once signed in with several roles: the "Continue as…" step.
  const [chooseFrom, setChooseFrom] = React.useState(null);
  const passwordRef = React.useRef(null);

  if (loading) return <FullPageSpinner />;
  // Already signed in (and not mid-choice): straight home.
  if (user && !chooseFrom && !busy) {
    if (user.must_change_password) return <Navigate to="/change-password" replace />;
    return <Navigate to={safeNext(next, user.roles) || homeFor(activeRole)} replace />;
  }

  const continueAs = (role) => {
    setActiveRole(role);
    navigate(homeFor(role), { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const full = completeEmail(email);
    if (full !== email) setEmail(full);
    if (!isAllowedEmail(full)) { setEmailError(DOMAIN_MESSAGE); return; }
    setEmailError(null);
    if (!password) { setError('Enter your password.'); passwordRef.current && passwordRef.current.focus(); return; }

    setBusy(true);
    try {
      const { user: u } = await AuthAPI.login(full, password);
      const target = safeNext(next, u.roles);
      if (u.must_change_password) {
        signIn(u);
        navigate('/change-password', { replace: true });
      } else if (target) {
        signIn(u);
        navigate(target, { replace: true });
      } else if (u.roles.length === 1) {
        setActiveRole(u.roles[0]);
        signIn(u);
        navigate(homeFor(u.roles[0]), { replace: true });
      } else {
        setChooseFrom(u.roles);
        signIn(u);
      }
    } catch (err) {
      setPassword('');
      setError(err.status ? err.message : 'Could not reach the server. Check your connection and try again.');
      if (err.status === 400 && /email/i.test(err.message)) setEmailError(err.message);
    } finally {
      setBusy(false);
    }
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

        <button type="button" className={styles.linkBtn} onClick={() => navigate('/forgot-password')}>
          Forgot password?
        </button>
      </div>
    </div>
  );
};

export default Login;
