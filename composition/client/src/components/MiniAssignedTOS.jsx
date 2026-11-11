import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronRight } from 'react-feather';
import styles from '../styles/Dashboard.module.sass';

const MiniAssignedTOS = () => {
    const navigate = useNavigate();
    const [selectedStatus, setSelectedStatus] = useState('DRAFT');

    const statusTabs = [
        { key: 'DRAFT', label: 'Draft', count: 1 },
        { key: 'PENDING', label: 'Pending', count: 0 },
        { key: 'RETURNED', label: 'Returned', count: 0 },
        { key: 'APPROVED', label: 'Approved', count: 0 },
    ];

    const currentTab = statusTabs.find((t) => t.key === selectedStatus);

    return (
        <div className={styles.blockCard}>
            {/* Header */}
            <div className={styles.blockHeader}>
                <div className={styles.blockTitleGroup}>
                    <h3>Assigned TOS</h3>
                    <span className={styles.totalBadge}>Total: 1</span>
                </div>

                <div className={styles.headerActions}>
                    {/* Status filter tabs / segmented control */}
                    <div className={styles.segmentedControl}>
                        {statusTabs.map((tab) => {
                            const active = selectedStatus === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`${styles.controlItem} ${active ? styles.active : ''}`}
                                    onClick={() => setSelectedStatus(tab.key)}
                                >
                                    <span>{tab.label}</span>
                                    <span className={styles.itemBadge}>{tab.count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ExternalLink icon button directing to assigned course offerings page */}
                    <button
                        type="button"
                        className={styles.goToIconBtn}
                        onClick={() => navigate('/assigned-courses')}
                        title="Go to Assigned TOS"
                        aria-label="Go to Assigned TOS"
                    >
                        <ExternalLink size={20} color="#334155" />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            {selectedStatus === 'DRAFT' ? (
                <div className={styles.miniGridContainer}>
                    <div className={styles.miniCard}>
                        <div className={styles.miniCardMain}>
                            <div className={styles.miniCardHeader}>
                                <span className={styles.miniCardCode}>BIT213L</span>
                                <span className={styles.miniCardDate}>2026-06-01</span>
                            </div>
                            <div className={styles.miniCardTitle} title="Object-Oriented Programming">
                                Object-Oriented Programming
                            </div>
                            <div className={styles.miniCardFooter}>
                                <button
                                    type="button"
                                    className={styles.miniActionBtn}
                                    onClick={() => navigate('/assigned-courses')}
                                >
                                    Compose <ChevronRight size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.emptyState}>
                    No {currentTab?.label || selectedStatus} table of specifications found for the current term.
                </div>
            )}
        </div>
    );
};

export default MiniAssignedTOS;
