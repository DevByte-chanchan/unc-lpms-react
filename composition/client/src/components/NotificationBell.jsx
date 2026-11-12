import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight } from 'react-feather'
import { getSession } from '../utils/session.js'
import { POLL_MS, loadUnreadCount, loadNotifications, markRead, markAllRead } from '../utils/notificationsApi.js'
import { notificationPath, timeAgo } from '../utils/notificationLinks.js'
import headerStyles from '../styles/Header.module.sass'
import styles from '../styles/NotificationPanel.module.sass'

// Notifications: the round bell of the top bar (unread badge, polled every 45 s while the tab is visible) opening a
// drop-down under it: "Notifications · N New" and Mark all as read, an All / Unread switch with counts, then the
// latest items. Each item has a coloured tag for what happened, its time, a title ("Plan Returned: BIT313L"), the
// sentence, and a link to what it is about; unread ones are tinted with a dot. Opening one marks it read.
// Escape or a click outside closes it.

// What happened, by notification type: the tag, its colour and the title's first words.
const KIND = {
  course_assigned: { tag: 'Assigned', tone: 'blue', title: 'New Assignment' },
  course_unassigned: { tag: 'Unassigned', tone: 'grey', title: 'Assignment Removed' },
  plan_submitted: { tag: 'Submitted', tone: 'blue', title: 'Plan Submitted' },
  plan_returned: { tag: 'Returned', tone: 'red', title: 'Plan Returned' },
  plan_ready_for_dean: { tag: 'Endorsed', tone: 'teal', title: 'Ready for the Dean' },
  plan_approved: { tag: 'Approved', tone: 'green', title: 'Learning Plan Approved' },
  comment_added: { tag: 'Comment', tone: 'violet', title: 'New Comment' },
  comment_resolved: { tag: 'Resolved', tone: 'green', title: 'Comments Resolved' },
  revision_started: { tag: 'Revision', tone: 'blue', title: 'Revision Started' },
  poke: { tag: 'Reminder', tone: 'amber', title: 'Reminder' },
  reminder: { tag: 'Reminder', tone: 'amber', title: 'Reminder' },
  missing_digest: { tag: 'Reminder', tone: 'amber', title: 'Plans Not Submitted' },
  approval_waiting: { tag: 'Waiting', tone: 'amber', title: 'Waiting for Your Review' },
  returned_waiting: { tag: 'Waiting', tone: 'amber', title: 'Returned Plan Waiting' },
  reference_health: { tag: 'Library', tone: 'teal', title: 'Reference Check' },
  reference_flags: { tag: 'Library', tone: 'teal', title: 'References Flagged' },
  reference_unavailable: { tag: 'Library', tone: 'teal', title: 'Reference Unavailable' },
}

// "BIT321L — submitted for review by Instructor" -> title "Plan Submitted: BIT321L", sentence "Submitted for review by
// Instructor." A message without a course code stays whole as the sentence.
const describe = (item) => {
  const kind = KIND[item.type] || { tag: 'Update', tone: 'grey', title: 'Update' }
  const [code, ...rest] = String(item.message || '').split(' — ')
  const hasCode = rest.length > 0 && /^[A-Za-z0-9 ._-]{2,30}$/.test(code)
  const text = hasCode ? rest.join(' — ') : String(item.message || '')
  const sentence = text ? text.charAt(0).toUpperCase() + text.slice(1) + (/[.!?]$/.test(text) ? '' : '.') : ''
  return { ...kind, heading: hasCode ? `${kind.title}: ${code}` : kind.title, sentence }
}

// "5 min ago" for the last week, the date after that ("Jun 28, 2026").
const when = (iso) => (Date.now() - new Date(iso).getTime() < 7 * 86400000
  ? timeAgo(iso)
  : new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))

// Where the link goes, in words.
const linkLabel = (target) => (/reference/i.test(target) ? 'View References'
  : /status=not-submitted|missing/i.test(target) ? 'View List'
    : /\/(courses|offerings)\/|pcId=/.test(target) ? 'View Learning Plan' : 'Open')

const NotificationBell = () => {
  const navigate = useNavigate()
  const role = getSession()?.role
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [failed, setFailed] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const trigger = useRef(null)
  const panel = useRef(null)

  const refreshCount = useCallback(async () => {
    try { setCount(await loadUnreadCount()); setFailed(false) } catch { setFailed(true) }
  }, [])

  const refreshList = useCallback(async () => {
    try {
      const data = await loadNotifications(50)
      setItems(data.rows)
      setCount(data.unread)
      setFailed(false)
    } catch { setFailed(true) }
  }, [])

  useEffect(() => {
    refreshCount()
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      if (open) refreshList(); else refreshCount()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [open, refreshCount, refreshList])

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) trigger.current?.focus()
  }, [])

  // Under the bell, right edges aligned.
  useLayoutEffect(() => {
    if (!open) return undefined
    const place = () => {
      const r = trigger.current?.getBoundingClientRect()
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') close() }
    const onDown = (event) => {
      if (panel.current?.contains(event.target) || trigger.current?.contains(event.target)) return
      close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open, close])

  const toggle = () => {
    if (!open) { setFilter('all'); refreshList() }
    setOpen(!open)
  }

  const openItem = (item) => {
    if (!item.isRead) {
      setItems(list => list.map(n => (n.id === item.id ? { ...n, isRead: true } : n)))
      setCount(c => Math.max(0, c - 1))
      markRead(item.id).catch(refreshCount)
    }
    const target = notificationPath(role, item)
    if (target) { close(false); navigate(target) }
  }

  const readAll = async () => {
    setItems(list => list.map(n => ({ ...n, isRead: true })))
    setCount(0)
    try { await markAllRead() } catch { refreshList() }
  }

  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications'
  const shown = filter === 'unread' ? items.filter(item => !item.isRead) : items

  return (
    <div>
      <button ref={trigger} type="button" className={`${headerStyles.bell} ${open ? headerStyles.bellOpen : ''}`}
        title="Notifications" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <Bell size={20} />
        {count > 0 && <span className={headerStyles.badge} aria-hidden="true">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && createPortal(
        <div ref={panel} role="dialog" aria-label="Notifications" className={styles.panel} style={{ top: pos.top, right: pos.right }}>
          <div className={styles.head}>
            <h2 className={styles.title}>Notifications</h2>
            {count > 0 && <span className={styles.newCount}>{count} New</span>}
            <button type="button" className={styles.markAll} onClick={readAll} disabled={count === 0}>Mark all as read</button>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Show">
            <button type="button" role="tab" aria-selected={filter === 'all'} className={`${styles.tab} ${filter === 'all' ? styles.tabOn : ''}`} onClick={() => setFilter('all')}>
              All ({items.length})
            </button>
            <button type="button" role="tab" aria-selected={filter === 'unread'} className={`${styles.tab} ${filter === 'unread' ? styles.tabOn : ''}`} onClick={() => setFilter('unread')}>
              Unread ({count})
            </button>
          </div>

          <div className={styles.list}>
            {failed && (
              <div role="alert" className={styles.note}>
                Notifications could not be loaded.{' '}
                <button type="button" className={styles.markAll} onClick={refreshList}>Try again</button>
              </div>
            )}
            {!failed && shown.length === 0 && (
              <div className={styles.empty}>
                <Bell size={22} strokeWidth={1.6} aria-hidden="true" />
                <strong>{filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}</strong>
              </div>
            )}
            {shown.map(item => {
              const info = describe(item)
              const target = notificationPath(role, item)
              return (
                <button key={item.id} type="button" className={`${styles.item} ${item.isRead ? '' : styles.unread}`} onClick={() => openItem(item)}>
                  <span className={styles.itemTop}>
                    {!item.isRead && <span className={styles.dot} aria-label="unread" />}
                    <span className={`${styles.tag} ${styles[info.tone]}`}>{info.tag}</span>
                    <time className={styles.time} dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{when(item.createdAt)}</time>
                  </span>
                  <span className={styles.heading}>{info.heading}</span>
                  {info.sentence && <span className={styles.sentence}>{info.sentence}</span>}
                  {target && <span className={styles.link}>{linkLabel(target)} <ChevronRight size={14} aria-hidden="true" /></span>}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default NotificationBell
