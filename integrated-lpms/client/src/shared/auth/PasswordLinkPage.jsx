import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'react-feather';
import { AuthAPI } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { homeFor, newPasswordChecks } from './authRules.js';
import { Brand, ContinueAs, FullPageSpinner } from './Login.jsx';
import { PasswordField, PasswordChecklist } from './PasswordFields.jsx';
import styles from './Login.module.sass';

const cx = (...c) => c.filter(Boolean).join(' ');
const GONE_INVITE =
  'This link has been replaced by a newer one or has expired. Check your inbox for the latest email from LPMS.';
const GONE_RESET = 'This link has expired or was already used. Ask for a new one from Forgot password.';

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || name;

const PasswordLinkPage = ({ mode = 'invite' }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { user, loading, activeRole, logout, signIn, switchRole } = useAuth();

  const [info, setInfo] = React.useState(null);
  const [gone, setGone] = React.useState(null);
  const [switching, setSwitching] = React.useState(false);
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [chooseFrom, setChooseFrom] = React.useState(null);

  const goneMsg = mode === 'invite' ? GONE_INVITE : GONE_RESET;

  React.useEffect(() => {
    let cancelled = false;
    if (!token) {
      setGone(goneMsg);
      return undefined;
    }
    if (mode === 'reset') {
      // Unified backend validates reset token on POST /api/auth/reset-password
      setInfo({ email: searchParams.get('email') || '', display_name: '' });
      return undefined;
    }
    AuthAPI.invitation(token)
      .then((data) => {
        if (!cancelled) setInfo(data?.invitation || data);
      })
      .catch((err) => {
        if (!cancelled) {
          setGone(
            err.status
              ? err.message || goneMsg
              : 'Could not reach the server. Check your connection and reload this page.'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, mode, goneMsg, searchParams]);

  if (chooseFrom) {
    return (
      <ContinueAs
        roles={chooseFrom}
        onPick={async (role) => {
          await switchRole(role);
          navigate(homeFor(role), { replace: true });
        }}
      />
    );
  }
  if (loading || (!info && !gone)) return <FullPageSpinner />;

  if (gone) {
    return (
      <div className={styles.screen}>
        <div className={styles.card}>
          <Brand />
          <div className={styles.alert} role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{gone}</span>
          </div>
          <button
            type="button"
            className={cx(styles.btn, styles.btnPrimary)}
            onClick={() => navigate(mode === 'reset' ? '/forgot-password' : '/login', { replace: true })}
          >
            {mode === 'reset' ? 'Forgot password' : 'Go to login'}
          </button>
        </div>
      </div>
    );
  }

  const someoneElse = !!(
    user &&
    info?.email &&
    String(user.email).toLowerCase() !== String(info.email).toLowerCase()
  );

  const checks = newPasswordChecks(next, confirm);
  const emailClash = Boolean(info?.email) && next.trim().toLowerCase() === String(info.email).toLowerCase();
  const valid = checks.every((c) => c.ok) && !emailClash;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!valid || busy || someoneElse) return;
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === 'invite'
          ? await AuthAPI.acceptInvitation(token, next)
          : await AuthAPI.resetPassword(token, next);
      if (res?.user) {
        const u = signIn(res.user, res.token);
        if ((u?.roles || []).length > 1) {
          setChooseFrom(u.roles);
        } else {
          navigate(homeFor(u?.activeRole), { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err) {
      if (err.status === 410) setGone(err.message || goneMsg);
      else setError(err.status ? err.message : 'Could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  };

  const toggle = () => setShow((s) => !s);

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Brand />
        {someoneElse ? (
          <div className={styles.notice} role="alert">
            <span>
              You&apos;re signed in as <strong>{user.display_name}</strong>. Continue to{' '}
              {mode === 'invite' ? 'set a password' : 'reset the password'} for{' '}
              <strong>{info.display_name || info.email}</strong>? You&apos;ll be signed out of{' '}
              {firstName(user.display_name)}&apos;s account.
            </span>
            <div className={styles.noticeActions}>
              <button
                type="button"
                className={cx(styles.btn, styles.btnPrimary)}
                disabled={switching}
                onClick={async () => {
                  setSwitching(true);
                  try {
                    await logout();
                  } finally {
                    setSwitching(false);
                  }
                }}
              >
                {switching ? 'Signing out…' : 'Continue'}
              </button>
              <button
                type="button"
                className={cx(styles.btn, styles.btnSecondary)}
                disabled={switching}
                onClick={() => navigate(homeFor(activeRole), { replace: true })}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className={styles.title}>
                {mode === 'invite'
                  ? `Welcome, ${info.display_name || info.name || info.email}`
                  : 'Choose a new password'}
              </h2>
              {mode === 'invite' && (
                <p className={styles.lead}>Choose a password to finish setting up your LPMS account.</p>
              )}
            </div>

            {info.email && (
              <div className={styles.field}>
                <span className={styles.label}>Email</span>
                <div className={styles.readonly}>{info.email}</div>
              </div>
            )}

            {mode === 'invite' && Array.isArray(info.roles) && info.roles.length > 0 && (
              <div className={styles.field}>
                <span className={styles.label}>Your access</span>
                <div className={styles.chips}>
                  {info.roles.map((r) => (
                    <span key={r} className={styles.chip}>{r}</span>
                  ))}
                </div>
              </div>
            )}

            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <PasswordField
                id="pl-new"
                label="New password"
                value={next}
                onChange={setNext}
                autoComplete="new-password"
                autoFocus
                show={show}
                onToggle={toggle}
              />
              <PasswordField
                id="pl-confirm"
                label="Confirm new password"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                show={show}
                onToggle={toggle}
              />
              <PasswordChecklist checks={checks} emailClash={emailClash} />
              {error && (
                <div className={styles.alert} role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={!valid || busy}>
                {busy
                  ? mode === 'invite'
                    ? 'Setting password…'
                    : 'Saving…'
                  : mode === 'invite'
                    ? 'Set password'
                    : 'Save new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export const ResetPassword = () => <PasswordLinkPage mode="reset" />;
export const SetPassword = () => <PasswordLinkPage mode="invite" />;
export default PasswordLinkPage;
