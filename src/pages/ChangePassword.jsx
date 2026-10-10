/**
 * Change password — /change-password (signed in).
 *
 * Forced after a new account or an admin reset (must_change_password): the page
 * says so and offers no way around it. Otherwise it's reachable from the user
 * menu and can be cancelled. The server re-issues the session on success.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'react-feather';
import { AuthAPI } from '../services/api.js';
import { useCurrentUser } from '../services/currentUser.jsx';
import { homeFor } from '../services/roles.js';
import { Brand } from './Login.jsx';
import { PasswordField, PasswordChecklist } from '../components/PasswordFields.jsx';
import { newPasswordChecks } from '../services/passwordRules.js';
import styles from '../styles/Login.module.sass';

const cx = (...c) => c.filter(Boolean).join(' ');

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, activeRole, signIn, logout } = useCurrentUser();
  const forced = !!(user && user.must_change_password);

  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const checks = [
    ...newPasswordChecks(next, confirm),
    { ok: next !== '' && next !== current, label: 'Different from your current password' },
  ];
  const notEmail = !(user && next.trim().toLowerCase() === user.email);
  const valid = current !== '' && checks.every((c) => c.ok) && notEmail;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user: u } = await AuthAPI.changePassword(current, next);
      signIn(u);
      navigate(homeFor(activeRole), { replace: true });
    } catch (err) {
      setError(err.message || 'Could not change the password.');
      setBusy(false);
    }
  };

  const toggle = () => setShow((s) => !s);

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <Brand />
        <div>
          <h2 className={styles.title}>{forced ? 'Set a new password to continue' : 'Change password'}</h2>
          <p className={styles.lead}>
            {forced
              ? 'You signed in with a temporary password. Choose your own before going on.'
              : 'Signed in as ' + (user ? user.email : '') + '.'}
          </p>
        </div>
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <PasswordField id="cp-current" label={forced ? 'Temporary password' : 'Current password'} value={current} onChange={setCurrent}
            autoComplete="current-password" autoFocus show={show} onToggle={toggle} />
          <PasswordField id="cp-new" label="New password" value={next} onChange={setNext}
            autoComplete="new-password" show={show} onToggle={toggle} />
          <PasswordField id="cp-confirm" label="Confirm new password" value={confirm} onChange={setConfirm}
            autoComplete="new-password" show={show} onToggle={toggle} />

          <PasswordChecklist checks={checks} emailClash={!notEmail} />

          {error && (
            <div className={styles.alert} role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={!valid || busy}>
            {busy ? <><span className={styles.spinner} aria-hidden="true" />Saving…</> : 'Save new password'}
          </button>
          {forced ? (
            <button type="button" className={styles.linkBtn}
              onClick={async () => { await logout(); navigate('/login', { replace: true }); }}>
              Sign out instead
            </button>
          ) : (
            <button type="button" className={cx(styles.btn, styles.btnSecondary)} onClick={() => (window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate(homeFor(activeRole)))}>
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
