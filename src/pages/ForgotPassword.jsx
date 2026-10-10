/**
 * Forgot password — /forgot-password (public).
 *
 * An email (UNC addresses only; typing the part before the @ completes it)
 * and "Send reset link". The reply is always the same, whether or not the
 * email has an account, so the page never reveals who's registered. The
 * emailed link opens /reset-password and is good for 1 hour.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'react-feather';
import { AuthAPI } from '../services/api.js';
import { ALLOWED_EMAIL_DOMAIN, DOMAIN_MESSAGE, completeEmail, isAllowedEmail } from '../services/roles.js';
import { Brand } from './Login.jsx';
import styles from '../styles/Login.module.sass';

const cx = (...c) => c.filter(Boolean).join(' ');
const SENT = 'If that email is registered, we sent a reset link.';

const ForgotPassword = () => {
  const navigate = useNavigate();
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
    if (!isAllowedEmail(full)) { setEmailError(DOMAIN_MESSAGE); return; }
    setEmailError(null);

    setBusy(true);
    try {
      const { message } = await AuthAPI.forgotPassword(full);
      setSent(message || SENT);
    } catch (err) {
      setError(err.status ? err.message : 'Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Brand />
        <div>
          <h2 className={styles.title}>Forgot your password?</h2>
          <p className={styles.lead}>Enter your UNC email and we&apos;ll send you a link to choose a new one. The link works for 1 hour.</p>
        </div>

        {sent ? (
          <>
            <div className={styles.success} role="status">
              <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{sent} Check your inbox (and Spam).</span>
            </div>
            <button type="button" className={cx(styles.btn, styles.btnPrimary)} onClick={() => navigate('/login', { replace: true })}>
              Back to sign in
            </button>
          </>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                className={cx(styles.input, emailError && styles.inputInvalid)}
                type="email"
                autoComplete="username"
                autoFocus
                placeholder={'name@' + ALLOWED_EMAIL_DOMAIN}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
                onBlur={() => setEmail((v) => completeEmail(v))}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'forgot-email-error' : 'forgot-email-help'}
              />
              {emailError
                ? <span id="forgot-email-error" className={styles.fieldError}>{emailError}</span>
                : <span id="forgot-email-help" className={styles.help}>Use your UNC email (@{ALLOWED_EMAIL_DOMAIN}).</span>}
            </div>

            {error && (
              <div className={styles.alert} role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={busy}>
              {busy ? <><span className={styles.spinner} aria-hidden="true" />Sending…</> : 'Send reset link'}
            </button>
            <button type="button" className={styles.linkBtn} onClick={() => navigate('/login')}>
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
