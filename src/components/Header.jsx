import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/HeaderA.module.sass';
import { Bell } from 'react-feather';

const INSTRUCTOR_NOTIFICATIONS = [
    {
        id: 1,
        type: 'assigned',
        tag: 'ASSIGNED',
        title: 'New Assignment: BIT313L',
        body: 'You have been assigned to prepare the Learning Plan for BIT313L - Human & Computer Interaction (Rev 1) by Olivia Vance.',
        time: '2m ago',
        actionText: 'View Learning Plan >',
        isUnread: true
    },
    {
        id: 2,
        type: 'tos-returned',
        tag: 'RETURNED',
        title: 'TOS Needs Revision: BSCS313L',
        body: 'Olivia Vance returned the Table of Specifications for BSCS313L - Software Engineering 1 with remarks.',
        time: '45m ago',
        actionText: 'View TOS >',
        actionPath: '/tos/BSCS313L',
        tosStatus: 'returned',
        isUnread: true
    },
    {
        id: 3,
        type: 'approved',
        tag: 'APPROVED',
        title: 'Learning Plan Approved: BIT213L',
        body: 'Sophia Sterling granted final institutional approval for BIT213L - Object-Oriented Programming (Rev 2).',
        time: 'Jun 28, 2026',
        actionText: 'View Learning Plan >',
        isUnread: true
    },
    {
        id: 4,
        type: 'tos-approved',
        tag: 'APPROVED',
        title: 'TOS Approved: BSCS212L',
        body: 'Olivia Vance approved the Table of Specifications for BSCS212L - Operating Systems.',
        time: 'Jun 26, 2026',
        actionText: 'View TOS >',
        actionPath: '/tos/BSCS212L',
        tosStatus: 'approved',
        isUnread: true
    },
    {
        id: 5,
        type: 'endorsed',
        tag: 'ENDORSED',
        title: 'Review Endorsed: BIT213L',
        body: 'Olivia Vance reviewed and endorsed BIT213L - Object-Oriented Programming (Rev 2).',
        time: 'Jun 25, 2026',
        actionText: 'View Learning Plan >',
        isUnread: true
    }
];

const PROGRAM_HEAD_NOTIFICATIONS = [
    {
        id: 101,
        type: 'submitted',
        tag: 'SUBMITTED',
        title: 'TOS Submitted: BSCS313L',
        body: 'Monica Norton submitted the Table of Specifications for BSCS313L - Human & Computer Interaction for your review.',
        time: '15m ago',
        actionText: 'Review TOS >',
        actionPath: '/tos/BSCS313L',
        tosStatus: 'pending',
        isUnread: true
    },
    {
        id: 102,
        type: 'submitted',
        tag: 'SUBMITTED',
        title: 'Learning Plan Submitted: BSCS212L',
        body: 'Monica Norton submitted the Learning Plan for BSCS212L - Web Development I.',
        time: '2h ago',
        actionText: 'Review Learning Plan >',
        isUnread: true
    },
    {
        id: 103,
        type: 'endorsed',
        tag: 'ENDORSED',
        title: 'Dean Endorsed: BSCS111L',
        body: 'Dean Sophia Sterling endorsed the syllabus and Table of Specifications for BSCS111L.',
        time: 'Yesterday',
        actionText: 'View Endorsement >',
        actionPath: '/tos/BSCS111L',
        tosStatus: 'approved',
        isUnread: true
    },
    {
        id: 104,
        type: 'resubmitted',
        tag: 'RESUBMITTED',
        title: 'Revised TOS Resubmitted: BSCS214L',
        body: 'Monica Norton addressed your remarks and resubmitted the Table of Specifications for BSCS214L.',
        time: 'Jun 27, 2026',
        actionText: 'Review Revision >',
        actionPath: '/tos/BSCS214L',
        tosStatus: 'pending',
        isUnread: false
    }
];

const HeaderA = ({ department, name, role }) => {
    const navigate = useNavigate();
    const isProgramHead = (role || '').toLowerCase().includes('program head');
    const getInitialList = () => isProgramHead ? PROGRAM_HEAD_NOTIFICATIONS : INSTRUCTOR_NOTIFICATIONS;

    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [notifications, setNotifications] = useState(getInitialList);
    const popoverRef = useRef(null);

    useEffect(() => {
        const list = (role || '').toLowerCase().includes('program head') ? PROGRAM_HEAD_NOTIFICATIONS : INSTRUCTOR_NOTIFICATIONS;
        setNotifications(list);
    }, [role]);

    const totalCount = notifications.length;
    const unreadCount = notifications.filter(n => n.isUnread).length;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMarkAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
    };

    const handleActionClick = (item) => {
        setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isUnread: false } : n));
        if (item.actionPath) {
            setIsOpen(false);
            if (isProgramHead) {
                navigate(item.actionPath, {
                    state: { role: 'program-head', tosStatus: item.tosStatus }
                });
            } else {
                navigate(item.actionPath, {
                    state: { tosStatus: item.tosStatus }
                });
            }
        }
    };

    const getTagClass = (type) => {
        switch (type) {
            case 'approved':
            case 'tos-approved':
                return styles.tagApproved;
            case 'endorsed':
                return styles.tagEndorsed;
            case 'tos-returned':
            case 'returned':
                return styles.tagReturned;
            case 'submitted':
            case 'resubmitted':
            case 'assigned':
            default:
                return styles.tagAssigned;
        }
    };

    const displayedNotifications = activeTab === 'unread'
        ? notifications.filter(n => n.isUnread)
        : notifications;

    return (
        <div className={styles.header}>
            <div className={styles.department}>
                {department}
            </div>
            <div className={styles.rightSection}>
                <div className={styles.info}>
                    <div className={styles.name}>{name}</div>
                    <div className={styles.role}>{role}</div>
                </div>

                {/* Notifications Bell Button */}
                <div className={styles.notifContainer} ref={popoverRef}>
                    <button
                        type="button"
                        className={styles.bellBtn}
                        onClick={() => setIsOpen(prev => !prev)}
                        aria-label="Toggle notifications"
                        title="Notifications"
                    >
                        <Bell size={20} color="#2563EB" strokeWidth={2} />
                        {unreadCount > 0 && (
                            <span className={styles.bellBadge}>
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {isOpen && (
                        <div className={styles.notifPopover}>
                            <div className={styles.popoverHeader}>
                                <div className={styles.popoverTitleRow}>
                                    <span className={styles.popoverTitle}>Notifications</span>
                                    {unreadCount > 0 && (
                                        <span className={styles.newBadge}>{unreadCount} New</span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        className={styles.markAllBtn}
                                        onClick={handleMarkAllAsRead}
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            <div className={styles.tabRow}>
                                <button
                                    type="button"
                                    className={`${styles.tabBtn} ${activeTab === 'all' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('all')}
                                >
                                    All ({totalCount})
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.tabBtn} ${activeTab === 'unread' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('unread')}
                                >
                                    Unread ({unreadCount})
                                </button>
                            </div>

                            <div className={styles.notifList}>
                                {displayedNotifications.length === 0 ? (
                                    <div className={styles.emptyNotifs}>
                                        {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
                                    </div>
                                ) : (
                                    displayedNotifications.map(item => (
                                        <div
                                            key={item.id}
                                            className={styles.notifItem}
                                            onClick={() => handleActionClick(item)}
                                            style={{ cursor: item.actionPath ? 'pointer' : 'default' }}
                                        >
                                            <div className={styles.itemMeta}>
                                                <div className={styles.badgeGroup}>
                                                    {item.isUnread && <span className={styles.unreadDot} />}
                                                    <span className={getTagClass(item.type)}>
                                                        {item.tag}
                                                    </span>
                                                </div>
                                                <span className={styles.itemTime}>{item.time}</span>
                                            </div>
                                            <h4 className={styles.itemTitle}>{item.title}</h4>
                                            <p className={styles.itemBody}>{item.body}</p>
                                            <button
                                                type="button"
                                                className={styles.itemAction}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleActionClick(item);
                                                }}
                                            >
                                                {item.actionText}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HeaderA;
