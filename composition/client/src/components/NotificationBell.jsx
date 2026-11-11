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
            const stakeholderParam = user?.id ? `?stakeholder=${encodeURIComponent(user.id)}` : '?stakeholder=1';
            const res = await fetchJson(`/api/notifications${stakeholderParam}`);
            if (res) {
                const notifs = Array.isArray(res.notifications) ? res.notifications : [];
                setNotifications(notifs);
                const count = typeof res.unread_count === 'number'
                    ? res.unread_count
                    : (typeof res.unviewed_count === 'number'
                        ? res.unviewed_count
                        : notifs.filter(n => !n.is_viewed).length);
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

    const handleMarkAsViewed = async (item, e) => {
        if (e) e.stopPropagation();

        if (!item.is_viewed) {
            try {
                const targetIds = item.related_log_ids || [item.log_id];
                await fetchJson(`/api/notifications/${item.log_id}/view`, {
                    method: 'PATCH',
                    body: JSON.stringify({ is_viewed: true, log_ids: targetIds }),
                    headers: { 'Content-Type': 'application/json' }
                });
                setNotifications(prev =>
                    prev.map(n => (n.log_id === item.log_id || (item.related_log_ids && item.related_log_ids.includes(n.log_id))) ? { ...n, is_viewed: true } : n)
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
            const targetIds = item.related_log_ids || [item.log_id];
            await fetchJson(`/api/notifications/${item.log_id}/view`, {
                method: 'PATCH',
                body: JSON.stringify({ is_viewed: nextState, log_ids: targetIds }),
                headers: { 'Content-Type': 'application/json' }
            });
            setNotifications(prev =>
                prev.map(n => (n.log_id === item.log_id || (item.related_log_ids && item.related_log_ids.includes(n.log_id))) ? { ...n, is_viewed: nextState } : n)
            );
            setUnreadCount(prev => nextState ? Math.max(0, prev - 1) : prev + 1);
        } catch (err) {
            console.error('Error toggling notification read status:', err);
        }
    };

    const handleMarkAllAsViewed = async (e) => {
        e.stopPropagation();
        try {
            const stakeholderParam = user?.id ? `?stakeholder=${encodeURIComponent(user.id)}` : '?stakeholder=1';
            await fetchJson(`/api/notifications/view-all${stakeholderParam}`, { method: 'PATCH' });
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
                                    key={item.log_id}
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
