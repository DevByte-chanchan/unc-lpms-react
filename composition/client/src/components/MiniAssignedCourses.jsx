import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronRight, Edit } from 'react-feather';
import styles from '../styles/Dashboard.module.sass';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[0];
};

const MiniAssignedCourses = ({ assignments = [], counts = {}, loading = false }) => {
    const navigate = useNavigate();
    const [selectedStatus, setSelectedStatus] = useState('DRAFT');

    const statusTabs = [
        { key: 'DRAFT', label: 'Draft', countKey: 'draft' },
        { key: 'PENDING', label: 'Pending', countKey: 'pending' },
        { key: 'RETURNED', label: 'Returned', countKey: 'returned' },
        { key: 'APPROVED', label: 'Approved', countKey: 'approved' },
    ];

    const getCode = (row) => {
        const pco = row.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return course.course_no || course.code || course.course_id || pco.course_id || row.pc_offering_id || '-';
    };

    const getName = (row) => {
        const pco = row.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return course.course_title || course.title || course.name || pco.course_description || '-';
    };

    const getOfferingID = (row) => {
        return row.ProgramCourseOffering?.pc_offering_id || row.pc_offering_id;
    };

    const getRevNum = (row) => {
        return row.ProgramCourseOffering?.revision_number ?? 1;
    };

    const filteredRows = assignments.filter((row) => {
        const status = (row.overallStatus || 'Draft').toUpperCase();
        return status === selectedStatus;
    });

    return (
        <div className={styles.blockCard}>
            {/* Header */}
            <div className={styles.blockHeader}>
                <div className={styles.blockTitleGroup}>
                    <h3>Assigned Learning Plans</h3>
                    <span className={styles.totalBadge}>
                        Total: {counts.total ?? assignments.length}
                    </span>
                </div>

                <div className={styles.headerActions}>
                    {/* Status filter tabs / segmented control */}
                    <div className={styles.segmentedControl}>
                        {statusTabs.map((tab) => {
                            const active = selectedStatus === tab.key;
                            const count = counts[tab.countKey] ?? 0;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`${styles.controlItem} ${active ? styles.active : ''}`}
                                    onClick={() => setSelectedStatus(tab.key)}
                                >
                                    <span>{tab.label}</span>
                                    <span className={styles.itemBadge}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ExternalLink icon button directing to actual assigned course offerings page */}
                    <button
                        type="button"
                        className={styles.goToIconBtn}
                        onClick={() => navigate('/assigned-courses')}
                        title="Go to Assigned Learning Plans"
                        aria-label="Go to Assigned Learning Plans"
                    >
                        <ExternalLink size={20} color="#334155" />
                    </button>
                </div>
            </div>

            {/* Content Body */}
            {loading ? (
                <div className={styles.emptyState}>Loading assigned learning plans...</div>
            ) : filteredRows.length === 0 ? (
                <div className={styles.emptyState}>
                    No {statusTabs.find((t) => t.key === selectedStatus)?.label || selectedStatus} learning plans found for the current term.
                </div>
            ) : (
                <div className={styles.miniGridContainer}>
                    {filteredRows.map((row, idx) => {
                        const offeringId = getOfferingID(row);
                        const revNum = getRevNum(row);
                        const statusParam = selectedStatus.toLowerCase();
                        const overall = (row.overallStatus || 'Draft').toLowerCase();

                        let actionBtn = null;
                        if (selectedStatus === 'DRAFT') {
                            actionBtn = (
                                <Link
                                    className={styles.miniActionBtn}
                                    to={`/courses/${offeringId}/${revNum}/${statusParam}`}
                                >
                                    Compose <ChevronRight size={13} />
                                </Link>
                            );
                        } else if (selectedStatus === 'RETURNED' || overall === 'returned') {
                            actionBtn = (
                                <Link
                                    className={styles.miniActionBtn}
                                    to={`/courses/${offeringId}/${revNum}/${statusParam}`}
                                >
                                    Update <Edit size={13} />
                                </Link>
                            );
                        } else {
                            actionBtn = (
                                <Link
                                    className={styles.miniActionBtn}
                                    to={`/courses/${offeringId}/${revNum}/${statusParam}`}
                                >
                                    View <ChevronRight size={13} />
                                </Link>
                            );
                        }

                        return (
                            <div key={idx} className={styles.miniCard}>
                                <div className={styles.miniCardMain}>
                                    <div className={styles.miniCardHeader}>
                                        <span className={styles.miniCardCode}>{getCode(row)}</span>
                                        <span className={styles.miniCardDate}>
                                            {formatDate(row.date_assigned)}
                                        </span>
                                    </div>
                                    <div className={styles.miniCardTitle} title={getName(row)}>
                                        {getName(row)}
                                    </div>
                                    <div className={styles.miniCardFooter}>
                                        {actionBtn}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MiniAssignedCourses;
