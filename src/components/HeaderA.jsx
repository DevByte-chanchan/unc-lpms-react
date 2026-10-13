/**
 * HeaderA — the signed-in person's name and the role they're acting as, from
 * useCurrentUser() (no props: pages never pass a name or role any more).
 *
 * Clicking it opens the account menu: who you are, Switch role (only for
 * someone with more than one role) and Change password. This is the ONE place
 * roles are switched. Signing out lives in ONE place too: the sidebar's Log Out.
 *
 * To its left sits the bell: the unread count (polled every 60 s, on load and
 * when the tab regains focus) and a dropdown of the latest notifications.
 * Clicking one marks it read and goes to its link — switching the active role
 * first when the link belongs to another of this person's roles.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Key, Check, Bell } from 'react-feather'
import { useCurrentUser } from '../services/currentUser.jsx'
import { homeFor, ROLE_DESCRIPTIONS, roleForPath } from '../services/roles.js'
import { NotificationsAPI } from '../services/api.js'
import styles from '../styles/HeaderA.module.sass'

const POLL_MS = 60 * 1000

const initialsOf = (name) => {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean)
    if (!words.length) return '?'
    const first = words[0][0] || ''
    const last = words.length > 1 ? words[words.length - 1][0] : ''
    return (first + last).toUpperCase()
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", else a short date. */
export const relativeTime = (value, now = Date.now()) => {
    const t = new Date(value).getTime()
    if (Number.isNaN(t)) return ''
    const s = Math.max(0, Math.round((now - t) / 1000))
    if (s < 45) return 'just now'
    const m = Math.round(s / 60)
    if (m < 60) return m + ' min ago'
    const h = Math.round(m / 60)
    if (h < 24) return h + (h === 1 ? ' hour ago' : ' h ago')
    const d = Math.round(h / 24)
    if (d < 7) return d + (d === 1 ? ' day ago' : ' days ago')
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const NotificationBell = () => {
    const { roles = [], activeRole, setActiveRole, user } = useCurrentUser()
    const navigate = useNavigate()
    const [open, setOpen] = React.useState(false)
    const [unread, setUnread] = React.useState(0)
    const [items, setItems] = React.useState(null)   // null = not loaded yet
    const [error, setError] = React.useState(null)
    const ref = React.useRef(null)

    const refreshCount = React.useCallback(() => {
        if (!user) return
        NotificationsAPI.unreadCount().then((r) => setUnread(r && r.unread ? r.unread : 0)).catch(() => {})
    }, [user])

    // On load, every minute, and when the tab comes back.
    React.useEffect(() => {
        if (!user) return undefined
        refreshCount()
        const id = setInterval(refreshCount, POLL_MS)
        const onFocus = () => refreshCount()
        const onVisible = () => { if (document.visibilityState === 'visible') refreshCount() }
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            clearInterval(id)
            window.removeEventListener('focus', onFocus)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [user, refreshCount])

    const load = React.useCallback(() => {
        setError(null)
        NotificationsAPI.list(20)
            .then((r) => { setItems(Array.isArray(r.items) ? r.items : []); setUnread(r.unread || 0) })
            .catch((err) => setError(err.message || 'Could not load notifications.'))
    }, [])

    React.useEffect(() => {
        if (!open) return undefined
        load()
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open, load])

    const openItem = async (n) => {
        setOpen(false)
        if (!n.read_at) {
            setItems((prev) => (prev || []).map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
            setUnread((u) => Math.max(0, u - 1))
            NotificationsAPI.markRead(n.id).catch(() => {})
        }
        const link = n.link || '/'
        // A link for another of this person's roles switches to that role first.
        const needed = roleForPath(link.split(/[?#]/)[0])
        if (needed && needed !== activeRole && roles.includes(needed)) setActiveRole(needed)
        navigate(roles.includes(needed) || needed === null ? link : homeFor(activeRole))
    }

    const markAll = () => {
        setItems((prev) => (prev || []).map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() })))
        setUnread(0)
        NotificationsAPI.markAllRead().catch(() => {})
    }

    if (!user) return null
    const badge = unread > 9 ? '9+' : String(unread)

    return (
        <div className={styles.bellWrap} ref={ref}>
            <button
                type="button"
                className={`${styles.bell} ${open ? styles.bellOpen : ''}`}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                title="Notifications"
            >
                <Bell size={20} />
                {unread > 0 && <span className={styles.badge} aria-hidden="true">{badge}</span>}
            </button>

            {open && (
                <div className={styles.bellMenu} role="menu" aria-label="Notifications">
                    <div className={styles.bellHead}>
                        <span className={styles.bellTitle}>Notifications</span>
                        <button type="button" className={styles.markAll} onClick={markAll} disabled={!unread}>
                            Mark all as read
                        </button>
                    </div>
                    <div className={styles.bellList}>
                        {error && <div className={styles.bellError}>{error}</div>}
                        {!error && items === null && <div className={styles.bellEmpty}>Loading…</div>}
                        {!error && items && items.length === 0 && <div className={styles.bellEmpty}>No notifications yet</div>}
                        {!error && items && items.map((n) => {
                            const isUnread = !n.read_at
                            return (
                                <button key={n.id} type="button" role="menuitem"
                                    className={`${styles.item} ${isUnread ? styles.itemUnread : ''}`}
                                    onClick={() => openItem(n)}>
                                    <span className={`${styles.dot} ${isUnread ? '' : styles.dotRead}`} aria-hidden="true" />
                                    <span className={styles.itemText}>
                                        <span className={`${styles.itemTitle} ${isUnread ? styles.itemTitleUnread : ''}`}>{n.title}</span>
                                        {n.body && <span className={styles.itemBody}>{n.body}</span>}
                                        <span className={styles.itemMeta}>
                                            {n.from ? 'from ' + n.from + ' · ' : ''}{relativeTime(n.created_at)}
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
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
            <NotificationBell />
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
