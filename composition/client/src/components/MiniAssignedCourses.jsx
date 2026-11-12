import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronRight, Edit, ChevronDown, ChevronUp } from 'react-feather';
import styles from '../styles/Dashboard.module.sass';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[0];
};

const buildApproverStatus = (row, isApproved) => {
    const logs = row.logs || row.workflowLogs || [];

    const getLatestActionForRole = (role) => {
        const roleLogs = logs.filter((l) => l.actor_role === role);
        if (roleLogs.length === 0) return null;
        return roleLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    };

    const instructorSubmissions = logs.filter((l) => l.action_type === 'SUBMITTED');
    const latestSubmission = instructorSubmissions.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    const latestSubmissionAt = latestSubmission ? latestSubmission.createdAt : row.date_submitted;

    const getStatusFor = (roleKey, label) => {
        const latestAction = getLatestActionForRole(roleKey);
        if (!latestAction) {
            return { title: label, roleKey, status: 'Pending' };
        }
        if (latestAction.action_type === 'ACCEPTED' || latestAction.action_type === 'APPROVED') {
            return { title: label, roleKey, status: 'Accepted', acceptedAt: latestAction.createdAt };
        }
        if (latestAction.action_type === 'Suggest' || latestAction.action_type === 'SUGGEST') {
            return { title: label, roleKey, status: 'Suggested', suggestedAt: latestAction.createdAt };
        }
        if (latestAction.action_type === 'RETURNED') {
            const details = { title: label, roleKey, status: 'Returned', returnedAt: latestAction.createdAt };
            if (latestSubmission && new Date(latestSubmission.createdAt) > new Date(latestAction.createdAt)) {
                details.updatedAt = latestSubmission.createdAt;
            }
            return details;
        }
        return { title: label, roleKey, status: 'Pending' };
    };

    const libStatus = getStatusFor('LIBRARY_DIRECTOR', 'Library Director');
    const phStatus = getStatusFor('PROGRAM_HEAD', 'Program Head');
    const deanStatus = getStatusFor('DEAN', 'Dean');

    // Sequential rule: Dean receives submission only after BOTH Library Director and Program Head have accepted
    const libAccepted = libStatus.status === 'Accepted' || libStatus.status === 'Suggested';
    const phAccepted = phStatus.status === 'Accepted';
    const bothApproved = libAccepted && phAccepted;

    deanStatus.hasReachedDean = bothApproved || deanStatus.status === 'Accepted' || deanStatus.status === 'Returned';
    if (bothApproved && deanStatus.status === 'Pending') {
        const libDate = new Date(libStatus.acceptedAt || libStatus.suggestedAt || 0);
        const phDate = new Date(phStatus.acceptedAt || 0);
        deanStatus.submittedAt = libDate > phDate ? (libStatus.acceptedAt || libStatus.suggestedAt) : phStatus.acceptedAt;
    }

    const result = [libStatus, phStatus, deanStatus];

    if (isApproved) {
        const icStatus = getStatusFor('INDUSTRY_CONSULTANT', 'Industry Consultant');
        result.unshift(icStatus);
    }

    return result;
};

const MiniCourseCard = ({ row, selectedStatus }) => {
    const [expanded, setExpanded] = useState(false);

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

    const offeringId = getOfferingID(row);
    const revNum = getRevNum(row);
    const statusParam = selectedStatus.toLowerCase();
    const overall = (row.overallStatus || 'Draft').toLowerCase();

    const isDraft = selectedStatus === 'DRAFT';
    const isApproved = selectedStatus === 'APPROVED' || overall === 'approved';
    const hasDetails = !isDraft; // Expandable if pending, returned, approved

    const logs = row.logs || row.workflowLogs || [];
    const submissionLogs = logs
        .filter((l) => l.action_type === 'SUBMITTED')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestSubmissionAt = submissionLogs.length > 0 ? submissionLogs[0].createdAt : row.date_submitted;
    const initialSubmissionLog = submissionLogs.length > 0 ? submissionLogs[submissionLogs.length - 1] : null;
    const initialSubmissionAt = initialSubmissionLog ? initialSubmissionLog.createdAt : row.date_submitted;

    const approverStatuses = buildApproverStatus(row, isApproved);

    let actionBtn = null;
    if (selectedStatus === 'DRAFT') {
        actionBtn = (
            <Link className={styles.miniActionBtn} to={`/courses/${offeringId}/${revNum}/${statusParam}`}>
                Compose <ChevronRight size={13} />
            </Link>
        );
    } else if (selectedStatus === 'RETURNED' || overall === 'returned') {
        actionBtn = (
            <Link className={styles.miniActionBtn} to={`/courses/${offeringId}/${revNum}/${statusParam}`}>
                Update <Edit size={13} />
            </Link>
        );
    } else {
        actionBtn = (
            <Link className={styles.miniActionBtn} to={`/courses/${offeringId}/${revNum}/${statusParam}`}>
                View <ChevronRight size={13} />
            </Link>
        );
    }

    return (
        <div className={styles.miniCard}>
            <div className={styles.miniCardMain}>
                <div className={styles.miniCardHeader}>
                    <span className={styles.miniCardCode}>{getCode(row)}</span>
                    <span className={styles.miniCardDate}>{formatDate(row.date_assigned)}</span>
                </div>
                <div className={styles.miniCardTitle} title={getName(row)}>
                    {getName(row)}
                </div>
                <div className={styles.miniCardFooter}>
                    {actionBtn}
                    {hasDetails && (
                        <button
                            type="button"
                            className={styles.toggleDetailsBtn}
                            onClick={() => setExpanded(!expanded)}
                            title={expanded ? 'Hide Details' : 'Show Details'}
                        >
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    )}
                </div>
            </div>

            {hasDetails && expanded && (
                <div className={styles.cardDetails}>
                    <div className={styles.detailsContent}>
                        {!isApproved && (
                            <div className={styles.detailRow}>
                                <span style={{ fontWeight: 400 }}>Initial Submission</span>
                                <span>{formatDate(initialSubmissionAt)}</span>
                            </div>
                        )}
                        {approverStatuses.map((a, idx) => {
                            let dateDisplay = null;
                            if (isApproved) {
                                if (a.status === 'Accepted') {
                                    dateDisplay = <div>Approved: {formatDate(a.acceptedAt)}</div>;
                                } else if (a.status === 'Suggested') {
                                    dateDisplay = <div>Suggested: {formatDate(a.suggestedAt)}</div>;
                                } else {
                                    dateDisplay = <div>Approved</div>;
                                }
                            } else {
                                if (a.status === 'Accepted') {
                                    dateDisplay = <div>Approved: {formatDate(a.acceptedAt)}</div>;
                                } else if (a.status === 'Suggested') {
                                    dateDisplay = <div>Suggested: {formatDate(a.suggestedAt)}</div>;
                                } else if (a.status === 'Returned') {
                                    dateDisplay = (
                                        <>
                                            <div>Returned: {formatDate(a.returnedAt)}</div>
                                            {a.updatedAt && <div>Resubmitted: {formatDate(a.updatedAt)}</div>}
                                        </>
                                    );
                                } else {
                                    // Pending
                                    if (a.roleKey === 'DEAN') {
                                        if (a.hasReachedDean && a.submittedAt) {
                                            dateDisplay = (
                                                <div className={styles.pendingText}>
                                                    Submitted: {formatDate(a.submittedAt)}
                                                </div>
                                            );
                                        } else {
                                            dateDisplay = (
                                                <div className={styles.pendingText}>
                                                    Pending
                                                </div>
                                            );
                                        }
                                    } else {
                                        dateDisplay = (
                                            <div className={styles.pendingText}>
                                                Submitted: {formatDate(latestSubmissionAt)}
                                            </div>
                                        );
                                    }
                                }
                            }

                            return (
                                <div key={idx} className={styles.detailRowApprover}>
                                    <div className={styles.approverTitle}>{a.title}</div>
                                    <div className={styles.approverDates}>{dateDisplay}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
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
                    {filteredRows.map((row, idx) => (
                        <MiniCourseCard key={row.co_assign_id || idx} row={row} selectedStatus={selectedStatus} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MiniAssignedCourses;
