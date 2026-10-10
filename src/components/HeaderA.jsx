/**
 * HeaderA — the signed-in person's name and the role they're acting as, from
 * useCurrentUser() (no props: pages never pass a name or role any more).
 *
 * Clicking it opens the account menu: who you are, Switch role (only for
 * someone with more than one role) and Change password. This is the ONE place
 * roles are switched. Signing out lives in ONE place too: the sidebar's Log Out.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Key, Check } from 'react-feather'
import { useCurrentUser } from '../services/currentUser.jsx'
import { homeFor, ROLE_DESCRIPTIONS } from '../services/roles.js'
import styles from '../styles/HeaderA.module.sass'

const initialsOf = (name) => {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean)
    if (!words.length) return '?'
    const first = words[0][0] || ''
    const last = words.length > 1 ? words[words.length - 1][0] : ''
    return (first + last).toUpperCase()
}

const HeaderA = () => {
    const { name, activeRole, roles = [], setActiveRole, user } = useCurrentUser()
    const navigate = useNavigate()
    const [open, setOpen] = React.useState(false)
    const ref = React.useRef(null)
    const canSwitch = roles.length > 1
    const initials = initialsOf(name)

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
        if (role === activeRole) return
        setActiveRole(role)
        navigate(homeFor(role))
    }

    return (
        <div className={styles.header}>
            <div className={styles.department}>

            </div>
            <div className={styles.userMenu} ref={ref}>
                <button
                    type="button"
                    className={`${styles.info} ${open ? styles.infoOpen : ''}`}
                    onClick={() => setOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    title={canSwitch ? 'Account and role' : 'Account'}
                >
                    <span className={styles.avatar} aria-hidden="true">{initials}</span>
                    <span className={styles.text}>
                        <span className={styles.name}>{name}</span>
                        <span className={styles.role}>{activeRole}</span>
                    </span>
                    <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
                </button>

                {open && (
                    <div className={styles.menu} role="menu">
                        <div className={styles.menuHead}>
                            <span className={`${styles.avatar} ${styles.avatarLg}`} aria-hidden="true">{initials}</span>
                            <div className={styles.menuWho}>
                                <div className={styles.menuName}>{name}</div>
                                <div className={styles.menuEmail}>{user && user.email}</div>
                                {!canSwitch && activeRole && <span className={styles.roleChip}>{activeRole}</span>}
                            </div>
                        </div>

                        {canSwitch && (
                            <div className={styles.section}>
                                <div className={styles.sectionLabel}>Switch role</div>
                                {roles.map((r) => {
                                    const active = r === activeRole
                                    return (
                                        <button key={r} type="button" role="menuitemradio" aria-checked={active}
                                            className={`${styles.roleItem} ${active ? styles.roleItemActive : ''}`}
                                            onClick={() => switchTo(r)}>
                                            <span className={styles.roleItemText}>
                                                <span className={styles.roleItemName}>{r}</span>
                                                {ROLE_DESCRIPTIONS[r] && <span className={styles.roleItemDesc}>{ROLE_DESCRIPTIONS[r]}</span>}
                                            </span>
                                            <span className={styles.roleCheck}>{active && <Check size={16} />}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        <div className={styles.section}>
                            <button type="button" role="menuitem" className={styles.menuItem}
                                onClick={() => { setOpen(false); navigate('/change-password') }}>
                                <Key size={16} /> Change password
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default HeaderA
