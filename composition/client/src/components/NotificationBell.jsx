import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell, BookOpen, ChevronRight, Clock, Maximize, Minimize2, X } from 'react-feather'
import { getSession } from '../utils/session.js'
import useDialogFocus from '../utils/useDialogFocus.js'
import { POLL_MS, loadUnreadCount, loadNotifications, markRead, markAllRead } from '../utils/notificationsApi.js'
import { notificationPath, timeAgo } from '../utils/notificationLinks.js'
import navStyles from '../styles/SideNavigation.module.sass'
import styles from '../styles/NotificationPanel.module.sass'

// Notifications: an item of the left navigation bar (a bell with an unread badge, polled every 45 s while the tab
// is visible) that opens a window like the app's other large windows: a header with Mark all read, maximise and
// close, an All / Unread switch, and the latest items. An item opens the page it is about (a course, the list of
// plans not yet submitted, the Reference library) and is marked read on the way. Escape leaves full screen first,
// then closes the window.
const KIND = {
  reminder: { Icon: Clock, tone: 'warn' },
  missing_digest: { Icon: Clock, tone: 'warn' },
  approval_waiting: { Icon: Clock, tone: 'warn' },
  reference_health: { Icon: BookOpen, tone: 'info' },
  reference_flags: { Icon: BookOpen, tone: 'info' },
  reference_unavailable: { Icon: BookOpen, tone: 'info' }
}

const NotificationBell = () => {
  const navigate = useNavigate()
  const role = getSession()?.role
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [failed, setFailed] = useState(false)
  const trigger = useRef(null)

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

  const windowRef = useRef(null)
  useDialogFocus(windowRef, open)

  const close = useCallback(() => {
    setOpen(false)
    setExpanded(false)
    trigger.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (expanded) setExpanded(false)
      else close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, expanded, close])

  const toggle = () => {
    if (!open) { setFilter('all'); refreshList() }
    setOpen(!open)
  }

  const openItem = async (item) => {
    if (!item.isRead) {
      setItems(list => list.map(n => (n.id === item.id ? { ...n, isRead: true } : n)))
      setCount(c => Math.max(0, c - 1))
      markRead(item.id).catch(refreshCount)
    }
    const target = notificationPath(role, item)
    if (target) { close(); navigate(target) }
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
      <div
        ref={trigger}
        className={navStyles.list}
        role="button"
        tabIndex={0}
        title="Notifications"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle() } }}
      >
        <Bell size={20} />
        <span className={navStyles.listText}>Notifications</span>
        {count > 0 && (
          <span aria-hidden="true" className={navStyles.listText} style={{ marginLeft: 'auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: 'var(--danger-solid)', color: '#fff', fontSize: 11, fontWeight: 600, lineHeight: '20px', textAlign: 'center', boxSizing: 'border-box' }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>

      {open && createPortal(
        <>
          <div className={styles.backdrop} onClick={close} />
          <div ref={windowRef} role="dialog" aria-modal="true" aria-label="Notifications" className={`${styles.window} ${expanded ? styles.expanded : ''}`}>
            <div className="app-window-header">
              <div>
                <h2 className="app-window-title">Notifications</h2>
                <div className={styles.sub}>{count > 0 ? `${count} unread` : items.length > 0 ? 'No unread notifications' : 'You are all caught up'}</div>
              </div>
              <div className="app-window-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={readAll} disabled={count === 0}>Mark all read</button>
                <button type="button" className="app-icon-btn" onClick={() => setExpanded(value => !value)}
                  title={expanded ? 'Exit full screen' : 'Full screen'} aria-label={expanded ? 'Exit full screen' : 'Full screen'}>
                  {expanded ? <Minimize2 size={16} /> : <Maximize size={16} />}
                </button>
                <button type="button" className="app-icon-close" onClick={close} aria-label="Close notifications">
                  <X size={16} strokeWidth={2.5} color="currentColor" />
                </button>
              </div>
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Show">
              <button type="button" role="tab" aria-selected={filter === 'all'} className={`${styles.tab} ${filter === 'all' ? styles.tabOn : ''}`} onClick={() => setFilter('all')}>All</button>
              <button type="button" role="tab" aria-selected={filter === 'unread'} className={`${styles.tab} ${filter === 'unread' ? styles.tabOn : ''}`} onClick={() => setFilter('unread')}>
                Unread{count > 0 && <span className={styles.tabCount}>{count}</span>}
              </button>
            </div>

            <div className={styles.list}>
              {failed && <div role="alert" className={styles.note} style={{ color: 'var(--danger)' }}>Notifications could not be loaded.</div>}
              {!failed && shown.length === 0 && (
                <div className={styles.empty}>
                  <Bell size={22} strokeWidth={1.6} aria-hidden="true" />
                  <strong>{filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}</strong>
                  <span>{filter === 'unread' ? 'Everything has been read.' : 'Reminders and updates about your plans appear here.'}</span>
                </div>
              )}
              {shown.map(item => {
                const kind = KIND[item.type] || { Icon: Bell, tone: 'plain' }
                const target = notificationPath(role, item)
                return (
                  <button key={item.id} type="button" className={`${styles.item} ${item.isRead ? '' : styles.unread}`} onClick={() => openItem(item)}
                    title={target ? 'Open' : undefined}>
                    <span className={`${styles.kind} ${styles[kind.tone]}`}><kind.Icon size={16} aria-hidden="true" /></span>
                    <span className={styles.body}>
                      <span className={styles.message}>{item.message}</span>
                      <span className={styles.time}>{timeAgo(item.createdAt)}</span>
                    </span>
                    {!item.isRead && <span className={styles.dot} aria-label="unread" />}
                    {target && <span className={styles.open}>Open <ChevronRight size={14} aria-hidden="true" /></span>}
                  </button>
                )
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default NotificationBell
