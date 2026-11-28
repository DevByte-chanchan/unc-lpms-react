import React from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ChevronRight, ChevronDown } from 'react-feather';
import unclogo from '../../assets/unclogo.png';
import { AuthAPI } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  ALLOWED_EMAIL_DOMAIN,
  DOMAIN_MESSAGE,
  ROLE_DESCRIPTIONS,
  completeEmail,
  homeFor,
  isAllowedEmail,
  safeNext,
} from './authRules.js';
import styles from './Login.module.sass';

const cx = (...c) => c.filter(Boolean).join(' ');

export const FullPageSpinner = () => (
  <div className={styles.screen} role="status" aria-label="Loading">
    <span className={styles.spinnerDark} />
  </div>
);

export const Brand = () => (
  <div className={styles.brand}>
    <img className={styles.logo} src={unclogo} alt="University of Nueva Caceres logo" />
    <h1 className={styles.heading}>University of Nueva Caceres</h1>
    <div className={styles.subheading}>Learning Plan Management System</div>
  </div>
);

export const ContinueAs = ({ roles, onPick, busyRole = null }) => (
  <div className={styles.screen}>
    <div className={styles.card}>
      <Brand />
      <div>
        <h2 className={styles.title}>Continue as…</h2>
        <p className={styles.lead}>Your account has more than one role. You can switch later from the menu.</p>
      </div>
      <div className={styles.roleList}>
        {roles.map((role) => (
          <button
            key={role}
            type="button"
            className={styles.roleOption}
            disabled={Boolean(busyRole)}
            onClick={() => onPick(role)}
          >
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
  const { user, loading, activeRole, login, switchRole } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [emailError, setEmailError] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [chooseFrom, setChooseFrom] = React.useState(null);
  const [busyRole, setBusyRole] = React.useState(null);
  const [showDemos, setShowDemos] = React.useState(false);
  const [demoAccounts, setDemoAccounts] = React.useState([]);
  const [demosLoaded, setDemosLoaded] = React.useState(false);
  const passwordRef = React.useRef(null);

  const toggleDemos = async () => {
    const nextOpen = !showDemos;
    setShowDemos(nextOpen);
    if (nextOpen && !demosLoaded) {
      setDemosLoaded(true);
      try {
        const res = await AuthAPI.demoAccounts();
        setDemoAccounts(Array.isArray(res?.accounts) ? res.accounts : []);
      } catch {
        setDemoAccounts([]);
      }
    }
  };

  if (loading) return <FullPageSpinner />;

  if (user && !chooseFrom && !busy) {
    if (user.must_change_password) return <Navigate to="/change-password" replace />;
    return <Navigate to={safeNext(next, user.roles) || homeFor(activeRole)} replace />;
  }

  const continueAs = async (role) => {
    setBusyRole(role);
    try {
      await switchRole(role);
      navigate(homeFor(role), { replace: true });
    } catch {
      navigate(homeFor(role), { replace: true });
    } finally {
      setBusyRole(null);
    }
  };

  const performLogin = async (emailInput, passwordInput) => {
    setError(null);
    const full = completeEmail(emailInput);
    if (full !== emailInput) setEmail(full);
    if (!isAllowedEmail(full)) {
      setEmailError(DOMAIN_MESSAGE);
      return;
    }
    setEmailError(null);
    if (!passwordInput) {
      setError('Enter your password.');
      passwordRef.current && passwordRef.current.focus();
      return;
    }

    setBusy(true);
    try {
      const u = await login(full, passwordInput);
      const roles = u?.roles || [];
      const target = safeNext(next, roles);
      if (u?.must_change_password) {
        navigate('/change-password', { replace: true });
      } else if (target) {
        navigate(target, { replace: true });
      } else if (roles.length === 1) {
        navigate(homeFor(roles[0]), { replace: true });
      } else if (roles.length > 1) {
        setChooseFrom(roles);
      } else {
        navigate(homeFor(u?.activeRole), { replace: true });
      }
    } catch (err) {
      setPassword('');
      setError(err.status ? err.message : 'Could not reach the server. Check your connection and try again.');
      if (err.status === 400 && /email/i.test(err.message)) setEmailError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    await performLogin(email, password);
  };

  const onQuickFill = (acc) => {
    setEmail(acc.email || '');
    setPassword(acc.demo_password || acc.password || '');
    setEmailError(null);
    setError(null);
  };

  if (chooseFrom) return <ContinueAs roles={chooseFrom} onPick={continueAs} busyRole={busyRole} />;

  return (
    <div className={cx('lpms-auth-scope', styles.screen)}>
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
              placeholder={`name@${ALLOWED_EMAIL_DOMAIN}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              onBlur={() => setEmail((v) => completeEmail(v))}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'login-email-error' : 'login-email-help'}
            />
            {emailError ? (
              <span id="login-email-error" className={styles.fieldError}>{emailError}</span>
            ) : (
              <span id="login-email-help" className={styles.help}>
                Use your UNC email (@{ALLOWED_EMAIL_DOMAIN}).
              </span>
            )}
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
            {busy ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <button type="button" className={styles.linkBtn} onClick={() => navigate('/forgot-password')}>
          Forgot password?
        </button>

        {/* Subtle collapsible QA helper — hidden by default so authentic Login card is untouched */}
        <div className={styles.demoFooter}>
          <button
            type="button"
            className={styles.demoToggle}
            onClick={toggleDemos}
            aria-expanded={showDemos}
          >
            <span>Demo accounts</span>
            <ChevronDown
              size={13}
              style={{ transform: showDemos ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
            />
          </button>

          {showDemos && (
            <div className={styles.demoDrawer}>
              <div className={styles.demoHint}>Click a seeded account to fill credentials</div>
              <div className={styles.demoList}>
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    className={styles.demoItem}
                    onClick={() => onQuickFill(acc)}
                  >
                    <span className={styles.demoRole}>
                      {Array.isArray(acc.roles) && acc.roles.length > 0 ? acc.roles.join(' / ') : acc.role}
                    </span>
                    <span className={styles.demoEmail}>{acc.email}</span>
                  </button>
                ))}
                {demoAccounts.length === 0 && (
                  <div className={styles.demoHint}>No demo accounts loaded.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
