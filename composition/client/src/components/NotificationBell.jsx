import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'react-feather'
import { getSession } from '../utils/session.js'
import { POLL_MS, loadUnreadCount, loadNotifications, markRead, markAllRead } from '../utils/notificationsApi.js'
import { notificationPath, timeAgo } from '../utils/notificationLinks.js'
import navStyles from '../styles/SideNavigation.module.sass'

// Notifications, as an item of the left navigation bar: a bell with an unread badge (polled every
// 45 s while the tab is visible) that opens a panel of the latest items with read / unread state,
// mark one or all read, and click to open the course. The panel is positioned with `fixed` from the
// item's own position, so the narrow bar's overflow cannot clip it.
const PANEL_WIDTH = 340
const PANEL_MAX_HEIGHT = 420

const NotificationBell = () => {
  const navigate = useNavigate()
  const role = getSession()?.role
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [failed, setFailed] = useState(false)
  const [anchor, setAnchor] = useState({ left: 0, top: 0 })
  const box = useRef(null)
  const trigger = useRef(null)

  const refreshCount = useCallback(async () => {
    try { setCount(await loadUnreadCount()); setFailed(false) } catch { setFailed(true) }
  }, [])

  const refreshList = useCallback(async () => {
    try {
      const data = await loadNotifications(15)
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

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false) }
    const onKey = (event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  const toggle = () => {
    const next = !open
    if (next && trigger.current) {
      const rect = trigger.current.getBoundingClientRect()
      setAnchor({
        left: Math.min(rect.right + 10, window.innerWidth - PANEL_WIDTH - 8),
        top: Math.max(8, Math.min(rect.top, window.innerHeight - PANEL_MAX_HEIGHT - 8))
      })
      refreshList()
    }
    setOpen(next)
  }

  const openItem = async (item) => {
    if (!item.isRead) {
      setItems(list => list.map(n => (n.id === item.id ? { ...n, isRead: true } : n)))
      setCount(c => Math.max(0, c - 1))
      markRead(item.id).catch(refreshCount)
    }
    const target = notificationPath(role, item)
    if (target) { setOpen(false); navigate(target) }
  }

  const readAll = async () => {
    setItems(list => list.map(n => ({ ...n, isRead: true })))
    setCount(0)
    try { await markAllRead() } catch { refreshList() }
  }

  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications'

  return (
    <div ref={box}>
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
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Bell size={24} />
          {count > 0 && (
            <span aria-hidden="true" style={{ position: 'absolute', top: -6, right: -8, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 600, lineHeight: '16px', textAlign: 'center', boxSizing: 'border-box' }}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
        <span className={navStyles.listText}>Notifications</span>
      </div>

      {open && (
        <div role="dialog" aria-label="Notifications"
          style={{ position: 'fixed', left: anchor.left, top: anchor.top, width: PANEL_WIDTH, maxWidth: 'calc(100vw - 16px)', maxHeight: PANEL_MAX_HEIGHT, overflowY: 'auto', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 12px 32px rgba(15,23,42,.18)', zIndex: 1300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff' }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            <button type="button" onClick={readAll} disabled={count === 0}
              style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: count ? 'pointer' : 'default', color: count ? '#2563eb' : '#9ca3af', fontSize: 12, opacity: 1 }}>
              Mark all read
            </button>
          </div>
          {failed && <div role="alert" style={{ padding: 14, color: '#b91c1c', fontSize: 13 }}>Notifications could not be loaded.</div>}
          {!failed && items.length === 0 && <div style={{ padding: 18, color: '#6b7280', fontSize: 13 }}>No notifications.</div>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => openItem(item)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderBottom: '1px solid #f3f4f6', borderRadius: 0, background: item.isRead ? '#fff' : '#eff6ff', cursor: 'pointer', color: '#111827' }}>
                  <div style={{ fontSize: 13, fontWeight: item.isRead ? 400 : 600, whiteSpace: 'normal' }}>
                    {!item.isRead && <span aria-label="unread" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#2563eb', marginRight: 6 }} />}
                    {item.type === 'poke' ? '🔔 ' : ''}{item.message}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{timeAgo(item.createdAt)}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
