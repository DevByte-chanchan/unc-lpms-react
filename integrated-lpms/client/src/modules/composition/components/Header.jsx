import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import styles from '../styles/Header.module.sass';
import { useCurrentUser } from '../services/currentUser.jsx';
import { ROLE_DISPLAY } from '../services/roles.js';
import { getDefaultRouteForRole } from '../../../shared/navConfig.js';
import NotificationBell from './NotificationBell.jsx';

const Header = ({ department, name: propName, role: propRole }) => {
  const { user, activeRole, roles = [], switchRole } = useCurrentUser();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const meta = (activeRole && ROLE_DISPLAY[activeRole]) || {};
  const displayName = user
    ? user.lastName && user.firstName
      ? `${user.lastName.toUpperCase()}, ${user.firstName.toUpperCase()}`
      : (user.name || user.email || 'USER').toUpperCase()
    : propName || 'NORTON, MONICA';

  const displayRole = activeRole ? meta.title || activeRole : propRole || 'Instructor';
  const canSwitch = roles.length > 1;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleSwitchRole = async (nextRole) => {
    setMenuOpen(false);
    if (nextRole === activeRole) return;
    try {
      await switchRole(nextRole);
    } finally {
      navigate(getDefaultRouteForRole(nextRole), { replace: true });
    }
  };

  return (
    <div className={styles.header}>
      <div className={styles.department}>{department}</div>
      <div className={styles.userSection}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <div
            className={styles.info}
            onClick={canSwitch ? () => setMenuOpen((o) => !o) : undefined}
            role={canSwitch ? 'button' : undefined}
            tabIndex={canSwitch ? 0 : undefined}
            title={canSwitch ? 'Switch role' : undefined}
            style={canSwitch ? { cursor: 'pointer', padding: '4px 8px', borderRadius: 8 } : undefined}
          >
            <div className={styles.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>{displayName}</span>
              {canSwitch && (
                <ChevronDown
                  size={15}
                  style={{
                    color: '#6B7280',
                    transform: menuOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              )}
            </div>
            <div className={styles.role}>{displayRole}</div>
          </div>

          {canSwitch && menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: 240,
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
                padding: 6,
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  padding: '4px 10px 6px',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: '#9CA3AF',
                }}
              >
                Switch role
              </div>
              {roles.map((r) => {
                const isCurrent = r === activeRole;
                return (
                  <button
                    key={r}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isCurrent}
                    onClick={() => handleSwitchRole(r)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: 7,
                      background: isCurrent ? '#F3F4F6' : 'transparent',
                      color: '#18191A',
                      fontSize: 13.5,
                      fontWeight: isCurrent ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{r}</span>
                    {isCurrent && <Check size={15} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <NotificationBell />
      </div>
    </div>
  );
};

export default Header;
