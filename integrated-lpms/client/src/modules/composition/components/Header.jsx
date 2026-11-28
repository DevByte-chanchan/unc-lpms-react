import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Key, Settings } from 'lucide-react';
import { useAuth } from '../../../shared/AuthContext.jsx';
import { ROLE_DESCRIPTIONS, getDefaultRouteForRole } from '../../../shared/navConfig.js';
import FullscreenToggle from '../../../shared/shell/FullscreenToggle.jsx';
import SettingsModal, { initialsOf } from '../../../shared/shell/SettingsModal.jsx';
import NotificationBell from './NotificationBell.jsx';
import styles from '../styles/Header.module.sass';

const Header = ({ department }) => {
  const { user, activeRole, roles = [], switchRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [settings, setSettings] = React.useState(null);
  const ref = React.useRef(null);

  const canSwitch = roles.length > 1;
  const initials = initialsOf(user?.name);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const switchTo = async (role) => {
    setOpen(false);
    if (role === activeRole) return;
    try {
      await switchRole(role);
    } finally {
      React.startTransition(() => {
        navigate(getDefaultRouteForRole(role), { replace: true });
      });
    }
  };

  const openSettings = (tab) => {
    setOpen(false);
    setSettings(tab);
  };

  // Intentionally do NOT add department name text on the left side when none is explicitly passed
  const departmentLabel = department || '';

  return (
    <div className={styles.header}>
      <div className={styles.department}>{departmentLabel}</div>
      {user && (
        <div className={styles.userMenu} ref={ref}>
          <button
            type="button"
            className={`${styles.info} ${open ? styles.infoOpen : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            title={canSwitch ? 'Account and role' : 'Account'}
          >
            <span className={styles.avatar} aria-hidden="true">
              {initials}
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{user.name}</span>
              <span className={styles.role}>{activeRole}</span>
            </span>
            <ChevronDown
              size={16}
              className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
              aria-hidden="true"
            />
          </button>

          {open && (
            <div className={styles.menu} role="menu">
              <div className={styles.menuHead}>
                <span className={`${styles.avatar} ${styles.avatarLg}`} aria-hidden="true">
                  {initials}
                </span>
                <div className={styles.menuWho}>
                  <div className={styles.menuName}>{user.name}</div>
                  <div className={styles.menuEmail}>{user.email}</div>
                  {!canSwitch && <span className={styles.roleChip}>{activeRole}</span>}
                </div>
              </div>

              {canSwitch && (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>Switch role</div>
                  {roles.map((role) => {
                    const active = role === activeRole;
                    return (
                      <button
                        key={role}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        className={`${styles.roleItem} ${active ? styles.roleItemActive : ''}`}
                        onClick={() => switchTo(role)}
                      >
                        <span className={styles.roleItemText}>
                          <span className={styles.roleItemName}>{role}</span>
                          {ROLE_DESCRIPTIONS[role] && (
                            <span className={styles.roleItemDesc}>{ROLE_DESCRIPTIONS[role]}</span>
                          )}
                        </span>
                        <span className={styles.roleCheck}>{active && <Check size={16} />}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className={styles.section}>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => openSettings('account')}
                >
                  <Settings size={16} /> Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => openSettings('security')}
                >
                  <Key size={16} /> Change password
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <FullscreenToggle className={styles.bell} />
      {user && activeRole !== 'Superuser' && <NotificationBell />}
      <SettingsModal
        open={settings !== null}
        initialTab={settings || 'account'}
        onClose={() => setSettings(null)}
      />
    </div>
  );
};

export default Header;
