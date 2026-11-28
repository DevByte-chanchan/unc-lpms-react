import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  BookOpen,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  GitBranch,
  Hourglass,
  ListTodo,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { fetchJson } from '../api.js';
import headerStyles from './CoreHeader.module.sass';
import styles from './NotificationPanel.module.sass';

const POLL_MS = 45000;

const KIND = {
  course_assigned: { tag: 'Assigned', tone: 'blue', title: 'New Assignment', Icon: UserPlus },
  course_unassigned: { tag: 'Unassigned', tone: 'grey', title: 'Assignment Removed', Icon: UserMinus },
  plan_submitted: { tag: 'Submitted', tone: 'blue', title: 'Plan Submitted', Icon: Send },
  plan_returned: { tag: 'Returned', tone: 'red', title: 'Plan Returned', Icon: RotateCcw },
  plan_ready_for_dean: { tag: 'Endorsed', tone: 'teal', title: 'Ready for the Dean', Icon: ShieldCheck },
  plan_approved: { tag: 'Approved', tone: 'green', title: 'Learning Plan Approved', Icon: CircleCheck },
  comment_added: { tag: 'Comment', tone: 'violet', title: 'New Comment', Icon: MessageSquare },
  comment_resolved: { tag: 'Resolved', tone: 'green', title: 'Comments Resolved', Icon: CheckCheck },
  revision_started: { tag: 'Revision', tone: 'blue', title: 'Revision Started', Icon: GitBranch },
  poke: { tag: 'Reminder', tone: 'amber', title: 'Reminder', Icon: BellRing },
  reminder: { tag: 'Reminder', tone: 'amber', title: 'Reminder', Icon: BellRing },
  missing_digest: { tag: 'Reminder', tone: 'amber', title: 'Plans Not Submitted', Icon: ListTodo },
  overdue_escalation: { tag: 'Overdue', tone: 'red', title: 'Plans Overdue', Icon: ListTodo },
  approval_waiting: { tag: 'Waiting', tone: 'amber', title: 'Waiting for Your Review', Icon: Hourglass },
  returned_waiting: { tag: 'Waiting', tone: 'amber', title: 'Returned Plan Waiting', Icon: Hourglass },
  reference_health: { tag: 'Library', tone: 'teal', title: 'Reference Check', Icon: BookOpen },
  reference_flags: { tag: 'Library', tone: 'teal', title: 'References Flagged', Icon: BookOpen },
  reference_unavailable: { tag: 'Library', tone: 'teal', title: 'Reference Unavailable', Icon: BookOpen },
  title_request: { tag: 'Library', tone: 'teal', title: 'Title Requested', Icon: BookOpen },
  title_request_answered: { tag: 'Library', tone: 'teal', title: 'Title Request Answered', Icon: BookOpen },
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const describe = (item) => {
  const kind = KIND[item.type] || { tag: 'Update', tone: 'grey', title: item.title || 'Update', Icon: Bell };
  const rawMsg = String(item.message || '');
  const [code, ...rest] = rawMsg.split(' — ');
  const hasCode = rest.length > 0 && /^[A-Za-z0-9 ._-]{2,30}$/.test(code);
  const text = hasCode ? rest.join(' — ') : rawMsg;
  const sentence = text
    ? text.charAt(0).toUpperCase() + text.slice(1) + (/[.!?]$/.test(text) ? '' : '.')
    : '';
  return {
    ...kind,
    heading: item.title || (hasCode ? `${kind.title}: ${code}` : kind.title),
    sentence,
  };
};

const targetForNotification = (role, item) => {
  if (item.link_url && String(item.link_url).startsWith('/')) return item.link_url;
  const pcId = item.pc_offering_id || item.entity_id;
  if (/reference|title_request/.test(item.type || '')) {
    return role === 'Director of Libraries' ? '/library/references' : null;
  }
  if (pcId && /plan_|comment_|revision_|approval_|returned_|poke|reminder/.test(item.type || '')) {
    if (role === 'Instructor') return `/courses/${pcId}/1/Draft`;
    return `/submissions/review/${pcId}`;
  }
  if (item.type === 'missing_digest' || item.type === 'overdue_escalation') {
    if (role === 'Program Head') return '/program-head/learning-plans';
    if (role === 'Dean') return '/dean/learning-plans';
  }
  return null;
};

const linkLabel = (target) =>
  /reference/i.test(target)
    ? 'View References'
    : /\/(courses|submissions\/review)\//.test(target)
      ? 'View Learning Plan'
      : 'Open';

const CoreNotificationBell = () => {
  const navigate = useNavigate();
  const { activeRole } = useAuth();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const trigger = useRef(null);
  const panel = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetchJson('/api/notifications/unread-count');
      setCount(Number(res?.count ?? res?.unreadCount ?? 0));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const res = await fetchJson('/api/notifications');
      const rows = (Array.isArray(res?.notifications) ? res.notifications : []).map((n) => ({
        id: n.id,
        type: n.type || 'update',
        title: n.title || '',
        message: n.message || '',
        link_url: n.link_url || null,
        pc_offering_id: n.pc_offering_id || null,
        entity_id: n.entity_id || null,
        isRead: Boolean(n.is_read ?? n.isRead),
        createdAt: n.created_at || n.createdAt || new Date().toISOString(),
      }));
      setItems(rows);
      setCount(
        typeof res?.unreadCount === 'number'
          ? res.unreadCount
          : rows.filter((r) => !r.isRead).length
      );
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      if (open) refreshList();
      else refreshCount();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [open, refreshCount, refreshList]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    const onDown = (event) => {
      if (panel.current?.contains(event.target) || trigger.current?.contains(event.target)) return;
      close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, close]);

  const toggle = () => {
    if (!open) {
      setFilter('all');
      refreshList();
    }
    setOpen(!open);
  };

  const openItem = (item) => {
    if (!item.isRead) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      setCount((c) => Math.max(0, c - 1));
      fetchJson(`/api/notifications/${item.id}/read`, { method: 'PATCH' }).catch(refreshCount);
    }
    const target = targetForNotification(activeRole, item);
    if (target) {
      close(false);
      navigate(target);
    }
  };

  const readAll = async () => {
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    setCount(0);
    try {
      await fetchJson('/api/notifications/read-all', { method: 'PATCH' });
    } catch {
      refreshList();
    }
  };

  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications';
  const shown = filter === 'unread' ? items.filter((item) => !item.isRead) : items;

  return (
    <div>
      <button
        ref={trigger}
        type="button"
        className={`${headerStyles.bell} ${open ? headerStyles.bellOpen : ''}`}
        title="Notifications"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className={headerStyles.badge} aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label="Notifications"
            className={styles.panel}
            style={{ top: pos.top, right: pos.right }}
          >
            <div className={styles.head}>
              <h2 className={styles.title}>Notifications</h2>
              {count > 0 && <span className={styles.newCount}>{count} New</span>}
              <button
                type="button"
                className={styles.markAll}
                onClick={readAll}
                disabled={count === 0}
              >
                Mark all as read
              </button>
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Show">
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'all'}
                className={`${styles.tab} ${filter === 'all' ? styles.tabOn : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'unread'}
                className={`${styles.tab} ${filter === 'unread' ? styles.tabOn : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread ({count})
              </button>
            </div>

            <div className={styles.list}>
              {failed && (
                <div role="alert" className={styles.note}>
                  Notifications could not be loaded.{' '}
                  <button type="button" className={styles.markAll} onClick={refreshList}>
                    Try again
                  </button>
                </div>
              )}
              {!failed && shown.length === 0 && (
                <div className={styles.empty}>
                  <Bell size={22} strokeWidth={1.6} aria-hidden="true" />
                  <strong>{filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}</strong>
                </div>
              )}
              {shown.map((item) => {
                const info = describe(item);
                const target = targetForNotification(activeRole, item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.item} ${item.isRead ? '' : styles.unread}`}
                    onClick={() => openItem(item)}
                    aria-label={`${item.isRead ? '' : 'Unread. '}${info.tag}: ${info.heading}`}
                  >
                    <span className={`${styles.icon} ${styles[info.tone]}`} aria-hidden="true">
                      <info.Icon size={16} />
                    </span>
                    <span className={styles.body}>
                      <span className={styles.itemTop}>
                        <span className={styles.heading}>{info.heading}</span>
                        <time
                          className={styles.time}
                          dateTime={item.createdAt}
                          title={new Date(item.createdAt).toLocaleString()}
                        >
                          {timeAgo(item.createdAt)}
                        </time>
                        {!item.isRead && <span className={styles.dot} aria-hidden="true" />}
                      </span>
                      {info.sentence && <span className={styles.sentence}>{info.sentence}</span>}
                      {target && (
                        <span className={styles.link}>
                          {linkLabel(target)} <ChevronRight size={14} aria-hidden="true" />
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CoreNotificationBell;
