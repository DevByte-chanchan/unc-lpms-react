import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Key, Settings } from 'react-feather'
import styles from '../styles/Header.module.sass'
import { getSession, setActiveRole, homeRouteForRole, roleMeta } from '../utils/session'
import { ROLE_DESCRIPTIONS } from '../utils/accountAuth.js'
import { initialsOf } from '../utils/userInitials.js'
import NotificationBell from './NotificationBell.jsx'
import SettingsModal from './SettingsModal.jsx'

// The top bar of every screen, in the layout of feature/course-assignment: the department (when a page passes
// one) on the left; on the right the signed-in person (avatar, name, the role they act as) and the bell.
// Clicking the person opens the account menu: who you are, Switch role (an account with more than one role),
// Settings and Change password. Signing out stays in the sidebar. The signed-in user wins over whatever a page
// passes: the props are demo placeholders.
const Header = ({ department }) => {
  const session = getSession()
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const [settings, setSettings] = React.useState(null) // null, or the Settings tab to open
  const ref = React.useRef(null)
  const roles = session?.roles || []
  const canSwitch = roles.length > 1
  const initials = initialsOf(session?.name)
  const label = (role) => roleMeta(role)?.label || role

  React.useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const switchTo = (role) => {
    setOpen(false)
    if (role === session?.role) return
    // One render for both: drawn apart, the new role on the old role's page made the app switch straight back.
    React.startTransition(() => {
      setActiveRole(role)
      navigate(homeRouteForRole(role))
    })
  }
  const openSettings = (tab) => { setOpen(false); setSettings(tab) }

  return (
    <div className={styles.header}>
      <div className={styles.department}>{department}</div>
      {session && (
        <div className={styles.userMenu} ref={ref}>
          <button type="button" className={`${styles.info} ${open ? styles.infoOpen : ''}`}
            onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}
            title={canSwitch ? 'Account and role' : 'Account'}>
            <span className={styles.avatar} aria-hidden="true">{initials}</span>
            <span className={styles.text}>
              <span className={styles.name}>{session.name}</span>
              <span className={styles.role}>{session.roleLabel || label(session.role)}</span>
            </span>
            <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true" />
          </button>

          {open && (
            <div className={styles.menu} role="menu">
              <div className={styles.menuHead}>
                <span className={`${styles.avatar} ${styles.avatarLg}`} aria-hidden="true">{initials}</span>
                <div className={styles.menuWho}>
                  <div className={styles.menuName}>{session.name}</div>
                  <div className={styles.menuEmail}>{session.email}</div>
                  {!canSwitch && <span className={styles.roleChip}>{label(session.role)}</span>}
                </div>
              </div>

              {canSwitch && (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>Switch role</div>
                  {roles.map(role => {
                    const active = role === session.role
                    return (
                      <button key={role} type="button" role="menuitemradio" aria-checked={active}
                        className={`${styles.roleItem} ${active ? styles.roleItemActive : ''}`} onClick={() => switchTo(role)}>
                        <span className={styles.roleItemText}>
                          <span className={styles.roleItemName}>{label(role)}</span>
                          {ROLE_DESCRIPTIONS[role] && <span className={styles.roleItemDesc}>{ROLE_DESCRIPTIONS[role]}</span>}
                        </span>
                        <span className={styles.roleCheck}>{active && <Check size={16} />}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className={styles.section}>
                <button type="button" role="menuitem" className={styles.menuItem} onClick={() => openSettings('account')}>
                  <Settings size={16} /> Settings
                </button>
                <button type="button" role="menuitem" className={styles.menuItem} onClick={() => openSettings('security')}>
                  <Key size={16} /> Change password
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {session && session.role !== 'superuser' && <NotificationBell />}
      <SettingsModal open={settings !== null} initialTab={settings || 'account'} onClose={() => setSettings(null)} />
    </div>
  )
}

export default Header
