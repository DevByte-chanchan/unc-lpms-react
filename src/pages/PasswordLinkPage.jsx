/**
 * The page behind an emailed link — shared by:
 *   /set-password?token=…    (SetPassword.jsx: an invitation, mode="invite")
 *   /reset-password?token=…  (ResetPassword.jsx: a reset link, mode="reset")
 *
 * Public: no session needed. On success the server signs in the link's
 * account, replacing whatever session the browser had, and we go on to that
 * person's home (or "Continue as…" when they have several roles).
 *
 * Signed in as someone ELSE when the link opens (e.g. testing Kristine's
 * invitation while signed in as Sophia)? We stop and ask first: Continue
 * signs the current person out and stays here; Cancel goes back to their
 * home. One person's link is never applied to another person's session.
 *
 * A dead invitation link is never a dead end: newer invitations supersede
 * older ones, so the page explains that and offers "Send me a new link".
 */
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'react-feather';
import { AuthAPI } from '../services/api.js';
import { useCurrentUser } from '../services/currentUser.jsx';
import { homeFor, ALLOWED_EMAIL_DOMAIN, completeEmail, isAllowedEmail } from '../services/roles.js';
import { Brand, ContinueAs } from './Login.jsx';
import { FullPageSpinner } from '../components/RequireAuth.jsx';
import { PasswordField, PasswordChecklist } from '../components/PasswordFields.jsx';
import { newPasswordChecks } from '../services/passwordRules.js';
import styles from '../styles/Login.module.sass';

const cx = (...c) => c.filter(Boolean).join(' ');
const GONE_INVITE = 'This link has been replaced by a newer one or has expired. Check your inbox for the latest email from LPMS, or get a new link.';
const GONE_RESET = 'This link has expired or was already used. Ask for a new one from Forgot password.';
const REQUESTED = "If that address has an LPMS account waiting to be set up, we've sent a new link.";

const COPY = {
  invite: {
    load: (token) => AuthAPI.invitation(token),
    submit: (token, password) => AuthAPI.acceptInvitation(token, password),
    title: (info) => 'Welcome, ' + info.display_name,
    lead: 'Choose a password to finish setting up your LPMS account.',
    button: 'Set password',
    busy: 'Setting password…',
    purpose: 'set a password',
    gone: GONE_INVITE,
  },
  reset: {
    load: (token) => AuthAPI.resetInfo(token),
    submit: (token, password) => AuthAPI.resetPassword(token, password),
    title: () => 'Choose a new password',
    lead: null,
    button: 'Save new password',
    busy: 'Saving…',
    purpose: 'reset the password',
    gone: GONE_RESET,
  },
};

const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || name;

/** "Send me a new link": an email and one button; the reply never says whether the email exists. */
const NewLinkForm = () => {
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const full = completeEmail(email);
    if (full !== email) setEmail(full);
    // Any address shaped like an email is sent to the server (an outside
    // consultant address may be allowed there); a UNC one is completed for you.
    if (!isAllowedEmail(full) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(full)) { setEmailError('Enter your email address.'); return; }
    setEmailError(null);
    setBusy(true);
    try {
      const { message } = await AuthAPI.requestInvitation(full);
      setSent(message || REQUESTED);
    } catch (err) {
      setError(err.status ? err.message : 'Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.success} role="status">
        <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{sent} Check your inbox (and Spam).</span>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="newlink-email">Email</label>
        <input
          id="newlink-email"
          className={cx(styles.input, emailError && styles.inputInvalid)}
          type="email"
          autoComplete="username"
          placeholder={'name@' + ALLOWED_EMAIL_DOMAIN}
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
          onBlur={() => setEmail((v) => completeEmail(v))}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'newlink-email-error' : 'newlink-email-help'}
        />
        {emailError
          ? <span id="newlink-email-error" className={styles.fieldError}>{emailError}</span>
          : <span id="newlink-email-help" className={styles.help}>The address your invitation was sent to (@{ALLOWED_EMAIL_DOMAIN}).</span>}
      </div>
      {error && (
        <div className={styles.alert} role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}
      <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={busy}>
        {busy ? <><span className={styles.spinner} aria-hidden="true" />Sending…</> : 'Send me a new link'}
      </button>
    </form>
  );
};

const PasswordLinkPage = ({ mode }) => {
  const copy = COPY[mode];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { user, loading, activeRole, logout, signIn, setActiveRole } = useCurrentUser();

  const [info, setInfo] = React.useState(null);      // who the link is for
  const [gone, setGone] = React.useState(null);      // 410 / bad link message
  const [switching, setSwitching] = React.useState(false);
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [chooseFrom, setChooseFrom] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!token) { setGone(copy.gone); return undefined; }
    copy.load(token)
      .then((data) => { if (!cancelled) setInfo(data); })
      .catch((err) => {
        if (cancelled) return;
        setGone(err.status ? (err.message || copy.gone) : 'Could not reach the server. Check your connection and reload this page.');
      });
    return () => { cancelled = true; };
  }, [token, copy]);

  if (chooseFrom) {
    return <ContinueAs roles={chooseFrom} onPick={(role) => { setActiveRole(role); navigate(homeFor(role), { replace: true }); }} />;
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
          {mode === 'invite' && <NewLinkForm />}
          <button type="button" className={cx(styles.btn, mode === 'invite' ? styles.btnSecondary : styles.btnPrimary)} onClick={() => navigate(mode === 'reset' ? '/forgot-password' : '/login', { replace: true })}>
            {mode === 'reset' ? 'Forgot password' : 'Go to login'}
          </button>
        </div>
      </div>
    );
  }

  const someoneElse = !!(user && info && String(user.email).toLowerCase() !== String(info.email).toLowerCase());

  const continueAsLinkOwner = async () => {
    setSwitching(true);
    try { await logout(); } finally { setSwitching(false); }
  };

  const checks = newPasswordChecks(next, confirm);
  const emailClash = next.trim().toLowerCase() === String(info.email).toLowerCase();
  const valid = checks.every((c) => c.ok) && !emailClash;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!valid || busy || someoneElse) return;
    setBusy(true);
    setError(null);
    try {
      const { user: u } = await copy.submit(token, next);
      signIn(u);
      if (u.roles.length > 1) {
        setChooseFrom(u.roles);
      } else {
        setActiveRole(u.roles[0]);
        navigate(homeFor(u.roles[0]), { replace: true });
      }
    } catch (err) {
      if (err.status === 410) setGone(err.message || copy.gone);
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
              You&apos;re signed in as <strong>{user.display_name}</strong>. Continue to {copy.purpose} for{' '}
              <strong>{info.display_name}</strong>? You&apos;ll be signed out of {firstName(user.display_name)}&apos;s account.
            </span>
            <div className={styles.noticeActions}>
              <button type="button" className={cx(styles.btn, styles.btnPrimary)} onClick={continueAsLinkOwner} disabled={switching}>
                {switching ? <><span className={styles.spinner} aria-hidden="true" />Signing out…</> : 'Continue'}
              </button>
              <button type="button" className={cx(styles.btn, styles.btnSecondary)} onClick={() => navigate(homeFor(activeRole), { replace: true })} disabled={switching}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className={styles.title}>{copy.title(info)}</h2>
              {copy.lead && <p className={styles.lead}>{copy.lead}</p>}
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Email</span>
              <div className={styles.readonly}>{info.email}</div>
            </div>

            {mode === 'invite' && Array.isArray(info.roles) && info.roles.length > 0 && (
              <div className={styles.field}>
                <span className={styles.label}>Your access</span>
                <div className={styles.chips}>
                  {info.roles.map((r) => <span key={r} className={styles.chip}>{r}</span>)}
                </div>
              </div>
            )}

            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <PasswordField id="pl-new" label="New password" value={next} onChange={setNext}
                autoComplete="new-password" autoFocus show={show} onToggle={toggle} />
              <PasswordField id="pl-confirm" label="Confirm new password" value={confirm} onChange={setConfirm}
                autoComplete="new-password" show={show} onToggle={toggle} />
              {/* Lets password managers save the new password against the right account. */}
              <input type="email" autoComplete="username" value={info.email} readOnly hidden />

              <PasswordChecklist checks={checks} emailClash={emailClash} />

              {error && (
                <div className={styles.alert} role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={!valid || busy}>
                {busy ? <><span className={styles.spinner} aria-hidden="true" />{copy.busy}</> : copy.button}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PasswordLinkPage;
