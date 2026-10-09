import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'react-feather'
import { getSession } from '../utils/session.js'
import { POLL_MS, loadUnreadCount, loadNotifications, markRead, markAllRead } from '../utils/notificationsApi.js'
import { notificationPath, timeAgo } from '../utils/notificationLinks.js'

// The bell in the header: unread badge (polled every 45 s while the tab is visible), a dropdown of
// the latest items with read / unread state, mark one or all read, and click to open the course.
const NotificationBell = () => {
  const navigate = useNavigate()
  const role = getSession()?.role
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [failed, setFailed] = useState(false)
  const box = useRef(null)

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
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) refreshList()
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

  return (
    <div ref={box} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" onClick={toggle} aria-haspopup="true" aria-expanded={open}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'} title="Notifications"
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'inherit', display: 'inline-flex' }}>
        <Bell size={20} />
        {count > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 11, lineHeight: '16px', textAlign: 'center' }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications"
          style={{ position: 'absolute', right: 0, top: '100%', width: 340, maxHeight: 420, overflowY: 'auto', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.15)', zIndex: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
            <strong>Notifications</strong>
            <button type="button" onClick={readAll} disabled={count === 0}
              style={{ background: 'none', border: 'none', cursor: count ? 'pointer' : 'default', color: count ? '#2563eb' : '#9ca3af', fontSize: 12 }}>
              Mark all read
            </button>
          </div>
          {failed && <div role="alert" style={{ padding: 12, color: '#b91c1c', fontSize: 13 }}>Notifications could not be loaded.</div>}
          {!failed && items.length === 0 && <div style={{ padding: 16, color: '#6b7280', fontSize: 13 }}>No notifications.</div>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map(item => (
              <li key={item.id}>
                <button type="button" onClick={() => openItem(item)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderBottom: '1px solid #f3f4f6', background: item.isRead ? '#fff' : '#eff6ff', cursor: 'pointer', color: 'inherit' }}>
                  <div style={{ fontSize: 13, fontWeight: item.isRead ? 400 : 600 }}>
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
