/**
 * HeaderA — the signed-in person's name and the role they're acting as, from
 * useCurrentUser() (no props: pages never pass a name or role any more).
 *
 * Clicking it opens the account menu: who you are, Switch role (only for
 * someone with more than one role) and Change password. This is the ONE place
 * roles are switched. Signing out lives in ONE place too: the sidebar's Log Out.
 *
 * To its right, at the header's far end, sits the bell: the server's unread count (polled every 60 s, on
 * load and when the tab regains focus) and a dropdown of the latest
 * notifications. Clicking one marks it read, closes the dropdown and opens what
 * it is about (services/notificationTarget.js). The same poll re-reads the
 * user, so the role switcher follows the roles the server holds, whatever the
 * notifications say.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Key, Check, Bell } from 'react-feather'
import { useCurrentUser } from '../services/currentUser.jsx'
import { homeFor, ROLE_DESCRIPTIONS } from '../services/roles.js'
import { NotificationsAPI } from '../services/api.js'
import { resolveTarget } from '../services/notificationTarget.js'
import { APP_TOAST_EVENT, showToast } from '../services/appToast.js'
import styles from '../styles/HeaderA.module.sass'

const POLL_MS = 60 * 1000
const TICK_MS = 30 * 1000
const TOAST_MS = 5000
const DROPDOWN_LIMIT = 10
const VIEW_ALL_LIMIT = 100

// Words that open a surname: "Kristine San Lorenzo" is K + San Lorenzo, so "KS".
const SURNAME_PARTICLES = new Set(['san', 'sta', 'de', 'del', 'dela', 'delos', 'la', 'los'])

const initialsOf = (name) => {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean)
    if (!words.length) return '?'
    const first = words[0][0] || ''
    let surname = words.length - 1
    while (surname > 1 && SURNAME_PARTICLES.has(words[surname - 1].toLowerCase())) surname -= 1
    const last = words.length > 1 ? words[surname][0] : ''
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

const AppToast = () => {
    const [message, setMessage] = React.useState(null)
    React.useEffect(() => {
        let timer = null
        const onToast = (e) => {
            setMessage(e.detail && e.detail.message)
            clearTimeout(timer)
            timer = setTimeout(() => setMessage(null), TOAST_MS)
        }
        window.addEventListener(APP_TOAST_EVENT, onToast)
        return () => { clearTimeout(timer); window.removeEventListener(APP_TOAST_EVENT, onToast) }
    }, [])
    return <div className={styles.appToast} role="status" aria-live="polite" hidden={!message}>{message}</div>
}

const NotificationBell = () => {
    const { activeRole, setActiveRole, user, refreshUser } = useCurrentUser()
    const navigate = useNavigate()
    const [open, setOpen] = React.useState(false)
    const [unread, setUnread] = React.useState(0)
    const [total, setTotal] = React.useState(0)
    const [items, setItems] = React.useState(null)   // null = not loaded yet
    const [showAll, setShowAll] = React.useState(false)
    const [error, setError] = React.useState(null)
    const [now, setNow] = React.useState(() => Date.now())
    const ref = React.useRef(null)
    const bellRef = React.useRef(null)

    const refreshCount = React.useCallback(() => {
        if (!user) return
        NotificationsAPI.unreadCount().then((r) => setUnread(r && r.unread ? r.unread : 0)).catch(() => {})
        refreshUser()
    }, [user, refreshUser])

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

    const load = React.useCallback((limit) => {
        setError(null)
        NotificationsAPI.list(limit)
            .then((r) => {
                setItems(Array.isArray(r.items) ? r.items : [])
                setUnread(r.unread || 0)
                setTotal(r.total || 0)
            })
            .catch((err) => setError(err.message || 'Could not load notifications.'))
    }, [])

    React.useEffect(() => {
        if (!open) return undefined
        setShowAll(false)
        setNow(Date.now())
        load(DROPDOWN_LIMIT)
        // "8 min ago" keeps moving while the dropdown is open.
        const tick = setInterval(() => setNow(Date.now()), TICK_MS)
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        const onKey = (e) => {
            if (e.key !== 'Escape') return
            setOpen(false)
            if (bellRef.current) bellRef.current.focus()
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            clearInterval(tick)
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open, load])

    const openItem = async (n) => {
        setOpen(false)
        if (!n.read_at) {
            setItems((prev) => (prev || []).map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
            NotificationsAPI.markRead(n.id).then((r) => setUnread(r.unread || 0)).catch(() => {})
        }
        if (!n.target) return
        // Decide on the roles the server holds now, not the ones loaded earlier.
        const fresh = await refreshUser()
        const roles = fresh && Array.isArray(fresh.roles) ? fresh.roles : []
        const stillActive = roles.includes(activeRole) ? activeRole : (roles[0] || null)
        const { role, path, toast } = resolveTarget(n, { roles, activeRole: stillActive })
        if (role && role !== activeRole) setActiveRole(role)
        if (toast) showToast(toast)
        if (path) navigate(path)
    }

    const markAll = () => {
        setItems((prev) => (prev || []).map((x) => (x.read_at ? x : { ...x, read_at: new Date().toISOString() })))
        NotificationsAPI.markAllRead()
            .then((r) => setUnread(r.unread || 0))
            .catch(() => { refreshCount(); load(showAll ? VIEW_ALL_LIMIT : DROPDOWN_LIMIT) })
    }

    const viewAll = () => {
        setShowAll(true)
        load(VIEW_ALL_LIMIT)
    }

    if (!user) return null
    const badge = unread > 9 ? '9+' : String(unread)

    return (
        <div className={styles.bellWrap} ref={ref}>
            <button
                type="button"
                ref={bellRef}
                className={`${styles.bell} ${open ? styles.bellOpen : ''}`}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                title="Notifications"
            >
                <Bell size={20} />
                {unread > 0 && <span className={styles.badge} aria-hidden="true">{badge}</span>}
            </button>

            {open && (
                <div className={styles.bellMenu} role="group" aria-label="Notifications">
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
                                <button key={n.id} type="button"
                                    className={`${styles.item} ${isUnread ? styles.itemUnread : ''}`}
                                    onClick={() => openItem(n)}>
                                    <span className={`${styles.dot} ${isUnread ? '' : styles.dotRead}`} aria-hidden="true" />
                                    <span className={styles.itemText}>
                                        <span className={`${styles.itemTitle} ${isUnread ? styles.itemTitleUnread : ''}`}>{n.title}</span>
                                        {n.body && <span className={styles.itemBody}>{n.body}</span>}
                                        <span className={styles.itemMeta}>
                                            {n.from ? 'from ' + n.from + ' · ' : ''}{relativeTime(n.created_at, now)}
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    {!showAll && total > DROPDOWN_LIMIT && (
                        <button type="button" className={styles.viewAll} onClick={viewAll}>View all ({total})</button>
                    )}
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
            <AppToast />
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
            <NotificationBell />
        </div>
    )
}

export default HeaderA
