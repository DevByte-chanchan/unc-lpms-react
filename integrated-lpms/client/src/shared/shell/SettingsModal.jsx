import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle,
  Lock,
  LogOut,
  Maximize,
  Minimize2,
  PenLine,
  RotateCcw,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { AuthAPI } from '../api.js';
import AppDialog from './AppDialog.jsx';
import SignOutDialog from './SignOutDialog.jsx';
import SignatureTab from './SignatureTab.jsx';
import styles from './SettingsModal.module.sass';

const SIGNATURE_ROLES = new Set([
  'Instructor',
  'Industry Consultant',
  'Program Head',
  'Director of Libraries',
  'Dean',
]);

const TABS = [
  { key: 'account', label: 'Account', Icon: User, about: 'Who is signed in.' },
  { key: 'security', label: 'Security', Icon: Lock, about: 'Change your password.' },
  {
    key: 'signature',
    label: 'Signature',
    Icon: PenLine,
    about: 'The signature printed on the plans you prepare or approve.',
    requireSigRole: true,
  },
];

export const initialsOf = (name) => {
  const raw = String(name || '').trim();
  if (!raw) return '?';
  if (raw.includes(',')) {
    const [family = '', given = ''] = raw.split(',').map((part) => part.trim());
    return ((given[0] || '') + (family[0] || '')).toUpperCase() || '?';
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
};

const Row = ({ label, hint, children }) => (
  <div className={styles.row}>
    <div className={styles.rowLabel}>
      <div>{label}</div>
      {hint && <div className={styles.rowHint}>{hint}</div>}
    </div>
    <div className={styles.rowValue}>{children}</div>
  </div>
);

const SecurityTab = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (field) => (event) => {
    setDone(false);
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const rules = [
    { label: 'At least 8 characters', ok: form.newPassword.length >= 8 },
    {
      label: 'A letter and a number',
      ok: /[a-z]/i.test(form.newPassword) && /[0-9]/.test(form.newPassword),
    },
    {
      label: 'Different from the current password',
      ok: !!form.newPassword && form.newPassword !== form.currentPassword,
    },
    {
      label: 'Confirmation matches',
      ok: !!form.confirm && form.confirm === form.newPassword,
    },
  ];
  const ready = !!form.currentPassword && rules.every((rule) => rule.ok);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setDone(false);
    if (form.newPassword !== form.confirm) {
      setError('The new password and its confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await AuthAPI.changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Could not change password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Row label="Current password">
        <input
          className={styles.control}
          type="password"
          autoComplete="current-password"
          aria-label="Current password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
        />
      </Row>
      <Row
        label="New password"
        hint="At least 8 characters, with a letter and a number. It must differ from the current one."
      >
        <input
          className={styles.control}
          type="password"
          autoComplete="new-password"
          aria-label="New password"
          value={form.newPassword}
          onChange={set('newPassword')}
        />
      </Row>
      {form.newPassword && (
        <ul className={styles.rules} aria-live="polite">
          {rules.map((rule) => (
            <li key={rule.label} className={rule.ok ? styles.good : styles.bad}>
              {rule.ok ? (
                <CheckCircle size={14} aria-hidden="true" />
              ) : (
                <AlertCircle size={14} aria-hidden="true" />
              )}{' '}
              {rule.label}
            </li>
          ))}
        </ul>
      )}
      <Row label="Confirm new password">
        <input
          className={styles.control}
          type="password"
          autoComplete="new-password"
          aria-label="Confirm new password"
          value={form.confirm}
          onChange={set('confirm')}
        />
      </Row>
      {error && (
        <div role="alert" className={`${styles.note} ${styles.bad}`}>
          <AlertCircle size={14} aria-hidden="true" /> {error}
        </div>
      )}
      {done && (
        <div role="status" className={`${styles.note} ${styles.good}`}>
          <CheckCircle size={14} aria-hidden="true" /> Your password was changed.
        </div>
      )}
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={busy || !ready}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  );
};

const SettingsModal = ({ open, onClose, initialTab = 'account' }) => {
  const { user, activeRole, roles = [], logout } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [expanded, setExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setResetError('');
    }
  }, [open, initialTab]);

  const close = useCallback(() => {
    if (resetting) return;
    setExpanded(false);
    onClose();
  }, [onClose, resetting]);

  const handleConfirmReset = useCallback(async (confirmed) => {
    setConfirmingReset(false);
    if (!confirmed || resetting) return;
    setResetError('');
    setResetting(true);
    try {
      await AuthAPI.resetDatabase();
      try {
        await logout();
      } catch {
        // Session cookie was already cleared by resetDatabase.
      }
      window.location.assign('/login');
    } catch (err) {
      setResetError(err?.message || 'Could not reset and reseed the database.');
      setResetting(false);
    }
  }, [logout, resetting]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape' || signingOut || confirmingReset || resetting) return;
      if (expanded) setExpanded(false);
      else close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, expanded, close, signingOut, confirmingReset, resetting]);

  if (!open) return null;

  const userRoles = roles.length ? roles : [activeRole].filter(Boolean);
  const hasSigRole = userRoles.some((r) => SIGNATURE_ROLES.has(r));
  const visibleTabs = TABS.filter((item) => !item.requireSigRole || hasSigRole);
  const current = visibleTabs.find((item) => item.key === tab) || visibleTabs[0];

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={`${styles.window} ${expanded ? styles.expanded : ''}`}
      >
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">Settings</h2>
            <div className={styles.sub}>Your account details, password and signature.</div>
          </div>
          <div className="app-window-actions">
            <button
              type="button"
              className="app-icon-btn"
              onClick={() => setExpanded((value) => !value)}
              title={expanded ? 'Exit full screen' : 'Full screen'}
              aria-label={expanded ? 'Exit full screen' : 'Full screen'}
              disabled={resetting}
            >
              {expanded ? <Minimize2 size={16} /> : <Maximize size={16} />}
            </button>
            <button
              type="button"
              className="app-icon-close"
              onClick={close}
              aria-label="Close settings"
              disabled={resetting}
            >
              <X size={16} strokeWidth={2} color="currentColor" />
            </button>
          </div>
        </div>

        <div className={styles.layout}>
          <nav className={styles.tabs} role="tablist" aria-label="Settings" aria-orientation="vertical">
            {visibleTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={current.key === item.key}
                className={`${styles.tab} ${current.key === item.key ? styles.tabOn : ''}`}
                onClick={() => setTab(item.key)}
                disabled={resetting}
              >
                <item.Icon size={16} aria-hidden="true" /> {item.label}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.tab} ${styles.signOut}`}
              onClick={() => setSigningOut(true)}
              disabled={resetting}
            >
              <LogOut size={16} aria-hidden="true" /> Sign out
            </button>
          </nav>

          <div className={styles.content}>
            <div className={styles.pageHead}>
              <h3>{current.label}</h3>
              <p>{current.about}</p>
            </div>
            {current.key === 'account' && (
              <>
                <div className={styles.profile}>
                  <span className={styles.avatar} aria-hidden="true">
                    {initialsOf(user?.name)}
                  </span>
                  <div className={styles.profileText}>
                    <strong>{user?.name || '—'}</strong>
                    <span>{user?.email || '—'}</span>
                  </div>
                </div>
                <Row label="Roles" hint="Switch between them from the account menu.">
                  <span className={styles.roleChips}>
                    {userRoles.map((key) => (
                      <span
                        key={key}
                        className={`${styles.roleChip} ${key === activeRole ? styles.roleChipOn : ''}`}
                      >
                        {key}
                      </span>
                    ))}
                  </span>
                </Row>
                <div className={styles.footnote}>
                  Your name, e-mail and roles are managed under User Accounts.
                </div>

                <div className={styles.dangerZone}>
                  <div className={styles.dangerHead}>
                    <div>
                      <div className={styles.dangerTitle}>Reset &amp; Reseed Database</div>
                      <p className={styles.dangerText}>
                        Wipe all database tables and reseed the initial UNC-LPMS data across all
                        modules. You will be signed out when finished.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      onClick={() => setConfirmingReset(true)}
                      disabled={resetting}
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                      {resetting ? 'Resetting database…' : 'Wipe & Reseed Database'}
                    </button>
                  </div>
                  {resetError && (
                    <div role="alert" className={`${styles.note} ${styles.bad}`} style={{ marginTop: 4 }}>
                      <AlertCircle size={14} aria-hidden="true" /> {resetError}
                    </div>
                  )}
                </div>
              </>
            )}
            {current.key === 'security' && <SecurityTab />}
            {current.key === 'signature' && <SignatureTab />}
          </div>
        </div>
      </div>

      <SignOutDialog
        open={signingOut}
        onCancel={() => setSigningOut(false)}
        onConfirm={async () => {
          setSigningOut(false);
          onClose();
          await logout();
          navigate('/login', { replace: true });
        }}
      />

      {confirmingReset && (
        <AppDialog
          title="Wipe and reseed database?"
          message="This will permanently erase all current changes in the database and restore the initial seeded data for all modules. You will be signed out when the reset finishes."
          confirmLabel="Wipe & Reseed"
          cancelLabel="Cancel"
          danger
          tone="warning"
          onDone={handleConfirmReset}
        />
      )}
    </>,
    document.body
  );
};

export default SettingsModal;
