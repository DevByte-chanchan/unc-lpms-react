import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertCircle, BookOpen, MessageSquare, ChevronRight, Check, Eye, EyeOff } from 'react-feather';
import styles from '../styles/NotificationBell.module.sass';
import { fetchJson } from '../utils/api.js';
import { useCurrentUser } from '../services/currentUser.jsx';

function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

const normalizeActionType = (rawType) => {
    const t = String(rawType || '').toUpperCase();
    if (t.includes('ASSIGN')) return 'ASSIGNED';
    if (t.includes('RETURN')) return 'RETURNED';
    if (t.includes('APPROV')) return 'APPROVED';
    if (t.includes('ACCEPT') || t.includes('ENDORS') || t.includes('READY_FOR_DEAN')) return 'ACCEPTED';
    return t || 'UPDATE';
};

const normalizeUnifiedNotifs = (res) => {
    const wf = Array.isArray(res?.workflowNotifications) ? res.workflowNotifications : [];
    const base = Array.isArray(res?.notifications) ? res.notifications : [];

    const mappedWf = wf.map((w) => {
        const actionType = normalizeActionType(w.action_type);
        const courseLabel = [w.course_no, w.course_title].filter(Boolean).join(' — ');
        const statusWord = actionType === 'RETURNED' ? 'Returned'
            : actionType === 'APPROVED' ? 'Approved'
            : actionType === 'ACCEPTED' ? 'Endorsed'
            : 'Assigned';
        const statusParam = actionType === 'RETURNED' ? 'Returned'
            : actionType === 'APPROVED' ? 'Approved'
            : 'Draft';
        return {
            _source: 'log',
            key_id: `log-${w.log_id}`,
            log_id: w.log_id,
            action_type: actionType,
            title: w.title || (courseLabel ? `${statusWord}: ${courseLabel}` : `Learning Plan ${statusWord}`),
            message: w.message || w.note || (w.actor_name ? `${w.actor_name} updated your learning plan.` : 'Learning plan status updated.'),
            is_viewed: Boolean(w.is_viewed ?? w.is_read),
            createdAt: w.createdAt || w.created_at,
            comments: Array.isArray(w.comments) ? w.comments : [],
            related_log_ids: w.related_log_ids || [w.log_id],
            target_url: w.target_url || (w.pc_offering_id ? `/courses/${w.pc_offering_id}/${w.revision_number || 1}/${statusParam}` : '/instructor/assigned-courses'),
        };
    });

    const mappedBase = base.map((n) => {
        const actionType = normalizeActionType(n.action_type || n.type);
        const isLegacyLog = Boolean(n.log_id && !n.id);
        const targetUrl = n.target_url || n.link_url || (n.pc_offering_id ? `/courses/${n.pc_offering_id}/1/Draft` : '/instructor/assigned-courses');
        return {
            _source: isLegacyLog ? 'log' : 'notif',
            key_id: isLegacyLog ? `log-${n.log_id}` : `notif-${n.id}`,
            id: n.id,
            log_id: n.log_id || n.id,
            action_type: actionType,
            title: n.title || 'Learning Plan Update',
            message: n.message || n.body || '',
            is_viewed: Boolean(n.is_viewed ?? n.is_read),
            createdAt: n.createdAt || n.created_at,
            comments: Array.isArray(n.comments) ? n.comments : [],
            related_log_ids: n.related_log_ids,
            target_url: targetUrl,
        };
    });

    return [...mappedWf, ...mappedBase].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
};

const NotificationBell = () => {
    const { user } = useCurrentUser();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
    const wrapperRef = useRef(null);

    const loadNotifications = useCallback(async () => {
        try {
            const stakeholderParam = user?.id ? `?stakeholder=${encodeURIComponent(user.id)}` : '';
            const res = await fetchJson(`/api/notifications${stakeholderParam}`);
            if (res) {
                const notifs = normalizeUnifiedNotifs(res);
                setNotifications(notifs);
                const count = typeof res.unreadCount === 'number'
                    ? res.unreadCount
                    : typeof res.unread_count === 'number'
                        ? res.unread_count
                        : typeof res.unviewed_count === 'number'
                            ? res.unviewed_count
                            : notifs.filter(n => !n.is_viewed).length;
                setUnreadCount(count);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
    }, [user?.id]);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 45000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        if (nextState) {
            loadNotifications();
        }
    };

    const persistReadState = async (item, nextState) => {
        if (item._source === 'notif' && item.id) {
            await fetchJson(`/api/notifications/${item.id}/read`, {
                method: 'PATCH',
                body: JSON.stringify({ is_read: nextState }),
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            const targetIds = item.related_log_ids || [item.log_id];
            await fetchJson(`/api/notifications/${item.log_id}/view`, {
                method: 'PATCH',
                body: JSON.stringify({ is_viewed: nextState, log_ids: targetIds }),
                headers: { 'Content-Type': 'application/json' }
            });
        }
    };

    const handleMarkAsViewed = async (item, e) => {
        if (e) e.stopPropagation();

        if (!item.is_viewed) {
            try {
                await persistReadState(item, true);
                setNotifications(prev =>
                    prev.map(n => (n.key_id === item.key_id || (item.related_log_ids && n._source === 'log' && item.related_log_ids.includes(n.log_id))) ? { ...n, is_viewed: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error('Error marking notification as viewed:', err);
            }
        }

        if (item.target_url) {
            setIsOpen(false);
            navigate(item.target_url);
        }
    };

    const handleToggleItemRead = async (item, e) => {
        if (e) e.stopPropagation();
        const nextState = !item.is_viewed;
        try {
            await persistReadState(item, nextState);
            setNotifications(prev =>
                prev.map(n => (n.key_id === item.key_id || (item.related_log_ids && n._source === 'log' && item.related_log_ids.includes(n.log_id))) ? { ...n, is_viewed: nextState } : n)
            );
            setUnreadCount(prev => nextState ? Math.max(0, prev - 1) : prev + 1);
        } catch (err) {
            console.error('Error toggling notification read status:', err);
        }
    };

    const handleMarkAllAsViewed = async (e) => {
        e.stopPropagation();
        try {
            await fetchJson('/api/notifications/view-all', { method: 'PATCH' });
            setNotifications(prev => prev.map(n => ({ ...n, is_viewed: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as viewed:', err);
        }
    };

    const displayedNotifications = activeTab === 'unread'
        ? notifications.filter(n => !n.is_viewed)
        : notifications;

    const renderTypeBadge = (actionType) => {
        switch (actionType) {
            case 'ASSIGNED':
                return <span className={`${styles.typeBadge} ${styles.assigned}`}>Assigned</span>;
            case 'RETURNED':
                return <span className={`${styles.typeBadge} ${styles.returned}`}>Returned</span>;
            case 'APPROVED':
                return <span className={`${styles.typeBadge} ${styles.approved}`}>Approved</span>;
            case 'ACCEPTED':
                return <span className={`${styles.typeBadge} ${styles.endorsed}`}>Endorsed</span>;
            default:
                return <span className={styles.typeBadge}>{actionType}</span>;
        }
    };

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            <button
                type="button"
                className={`${styles.bellButton} ${isOpen ? styles.active : ''}`}
                onClick={handleToggle}
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={isOpen}
            >
                <Bell size={19} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={styles.panel} role="dialog" aria-label="Notifications Panel">
                    {/* Panel Header */}
                    <div className={styles.panelHeader}>
                        <div className={styles.headerTitleGroup}>
                            <span className={styles.title}>Notifications</span>
                            {unreadCount > 0 ? (
                                <span className={styles.unreadChip}>{unreadCount} Unread</span>
                            ) : (
                                <span className={styles.allReadChip}>All caught up</span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className={styles.markAllBtn}
                                onClick={handleMarkAllAsViewed}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className={styles.tabsRow}>
                        <button
                            type="button"
                            className={`${styles.tabButton} ${activeTab === 'all' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            type="button"
                            className={`${styles.tabButton} ${activeTab === 'unread' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('unread')}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className={styles.listContainer}>
                        {displayedNotifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <CheckCircle size={32} color="#10B981" />
                                <div className={styles.emptyTitle}>
                                    {activeTab === 'unread' ? 'All caught up!' : 'No notifications'}
                                </div>
                                <div className={styles.emptySubtitle}>
                                    {activeTab === 'unread'
                                        ? 'No unread notifications at the moment. Switch to the "All" tab to view history.'
                                        : 'You have no notifications yet.'}
                                </div>
                            </div>
                        ) : (
                            displayedNotifications.map((item) => (
                                <div
                                    key={item.key_id || item.log_id}
                                    className={`${styles.notificationItem} ${!item.is_viewed ? styles.unread : ''}`}
                                    onClick={(e) => handleMarkAsViewed(item, e)}
                                >
                                    <div className={styles.itemTopRow}>
                                        <div className={styles.itemBadgeGroup}>
                                            {!item.is_viewed ? (
                                                <span className={styles.newBadge}>NEW</span>
                                            ) : (
                                                <span className={styles.readStatusText}>Read</span>
                                            )}
                                            {renderTypeBadge(item.action_type)}
                                        </div>
                                        <div className={styles.itemTopRight}>
                                            <span className={styles.timeText}>{formatTimeAgo(item.createdAt)}</span>
                                            <button
                                                type="button"
                                                className={styles.toggleReadBtn}
                                                onClick={(e) => handleToggleItemRead(item, e)}
                                                title={item.is_viewed ? "Mark as unread" : "Mark as read"}
                                                aria-label={item.is_viewed ? "Mark as unread" : "Mark as read"}
                                            >
                                                {item.is_viewed ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.itemTitle}>{item.title}</div>
                                    <div className={styles.itemMessage}>{item.message}</div>

                                    {/* Review Comments Section for Returned Learning Plans */}
                                    {item.action_type === 'RETURNED' && item.comments && item.comments.length > 0 && (
                                        <div className={styles.commentsBox}>
                                            <div className={styles.commentsHeader}>
                                                <MessageSquare size={13} />
                                                <span>Review Comments ({item.comments.length}):</span>
                                            </div>
                                            {item.comments.slice(0, 2).map((c, idx) => (
                                                <div key={c.comment_id || idx} className={styles.commentSnippet}>
                                                    • {c.comment_for ? `[${c.comment_for.toUpperCase()}] ` : ''}{c.message}
                                                </div>
                                            ))}
                                            {item.comments.length > 2 && (
                                                <div style={{ color: '#BE123C', marginTop: 2, fontStyle: 'italic' }}>
                                                    + {item.comments.length - 2} more comment{item.comments.length - 2 > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className={styles.itemActionHint}>
                                        <span>View Learning Plan</span>
                                        <ChevronRight size={14} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className={styles.footer}>
                        Learning Plan Composition
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
