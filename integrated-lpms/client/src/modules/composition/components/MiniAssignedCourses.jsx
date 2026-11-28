import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, ChevronRight, Edit, ChevronDown, ChevronUp } from 'react-feather';
import Select from './Select.jsx';
import { fetchJson } from '../utils/api.js';
import { useCurrentUser } from '../services/currentUser.jsx';
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

const computeOverallStatus = (row) => {
    if (row.overallStatus) return row.overallStatus;
    const logs = row.logs || row.workflowLogs || [];
    const deanApproval = logs.find(
        (log) =>
            (log.action_type === 'ACCEPTED' || log.action_type === 'APPROVED') &&
            log.actor_role === 'DEAN'
    );
    if (deanApproval) return 'Approved';

    const instructorSubmissions = logs.filter((l) => l.action_type === 'SUBMITTED');
    const hasBeenSubmitted =
        row.date_submitted !== null ||
        instructorSubmissions.length > 0 ||
        logs.some((log) => log.action_type === 'ACCEPTED');
    if (!hasBeenSubmitted) return 'Draft';

    const sortedSubmissions = [...instructorSubmissions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestSubmissionTime = sortedSubmissions.length > 0
        ? new Date(sortedSubmissions[0].createdAt).getTime()
        : (row.date_submitted ? new Date(row.date_submitted).getTime() : 0);

    const postSubLogs = [...logs]
        .filter((l) => new Date(l.createdAt).getTime() >= latestSubmissionTime)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let returnedToInstructor = false;
    for (const l of postSubLogs) {
        const act = String(l.action_type || '').toUpperCase();
        const role = String(l.actor_role || '').toUpperCase();
        if (act === 'RETURNED' && (role === 'LIBRARY_DIRECTOR' || role === 'PROGRAM_HEAD')) {
            returnedToInstructor = true;
        } else if (act === 'FORWARDED' && role === 'PROGRAM_HEAD') {
            returnedToInstructor = true;
        } else if (act === 'COUNTERED' && role === 'PROGRAM_HEAD') {
            returnedToInstructor = false;
        }
    }
    return returnedToInstructor ? 'Returned' : 'Pending';
};

const MiniAssignedCourses = ({ assignments = [], counts = {}, loading = false }) => {
    const navigate = useNavigate();
    const { user } = useCurrentUser();
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(
            <option key={i} value={String(i)}>
                {`${i} - ${i + 1}`}
            </option>
        );
    }

    const [selectedYear, setSelectedYear] = useState(String(currentYear));
    const [selectedSem, setSelectedSem] = useState(semOptions[0]);
    const [selectedStatus, setSelectedStatus] = useState('DRAFT');
    const [fetchedAssignments, setFetchedAssignments] = useState(null);
    const [fetching, setFetching] = useState(false);

    const isDefaultCurrentTerm = String(selectedYear) === String(currentYear) && selectedSem === semOptions[0];
    const isPastYear = String(selectedYear) !== String(currentYear);

    useEffect(() => {
        if (isPastYear) {
            setSelectedStatus('APPROVED');
        } else if (selectedStatus === 'APPROVED' && isDefaultCurrentTerm) {
            setSelectedStatus('DRAFT');
        }
    }, [selectedYear]);

    useEffect(() => {
        if (isDefaultCurrentTerm) {
            setFetchedAssignments(null);
            return;
        }
        let mounted = true;
        const load = async () => {
            setFetching(true);
            try {
                const stakeholderParam = user?.id ? `&stakeholder=${encodeURIComponent(user.id)}` : '';
                const url = `/api/assignments?year=${encodeURIComponent(selectedYear)}&semester=${encodeURIComponent(selectedSem)}${stakeholderParam}`;
                const data = await fetchJson(url);
                const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
                if (mounted) setFetchedAssignments(rows);
            } catch (err) {
                console.error('Error loading filtered mini assignments:', err);
                if (mounted) setFetchedAssignments([]);
            } finally {
                if (mounted) setFetching(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [selectedYear, selectedSem, user?.id, isDefaultCurrentTerm]);

    const activeAssignments = isDefaultCurrentTerm ? assignments : (fetchedAssignments || []);
    const activeLoading = isDefaultCurrentTerm ? loading : fetching;

    const computedCounts = activeAssignments.reduce(
        (acc, row) => {
            const st = String(computeOverallStatus(row) || 'Draft').toLowerCase();
            if (acc[st] !== undefined) acc[st] += 1;
            acc.total += 1;
            return acc;
        },
        { total: 0, draft: 0, pending: 0, returned: 0, approved: 0 }
    );
    const displayCounts = isDefaultCurrentTerm && counts && typeof counts.total === 'number'
        ? counts
        : computedCounts;

    const allStatusTabs = [
        { key: 'DRAFT', label: 'Draft', countKey: 'draft' },
        { key: 'PENDING', label: 'Pending', countKey: 'pending' },
        { key: 'RETURNED', label: 'Returned', countKey: 'returned' },
        { key: 'APPROVED', label: 'Approved', countKey: 'approved' },
    ];
    const statusTabs = isPastYear ? allStatusTabs.filter(t => t.key === 'APPROVED') : allStatusTabs;

    const filteredRows = activeAssignments.filter((row) => {
        const status = String(computeOverallStatus(row) || 'Draft').toUpperCase();
        return status === selectedStatus;
    });

    return (
        <div className={styles.blockCard}>
            {/* Header */}
            <div className={styles.blockHeader}>
                <div className={styles.blockTitleGroup}>
                    <h3>Assigned Learning Plans</h3>
                    <span className={styles.totalBadge}>
                        Total: {displayCounts.total ?? activeAssignments.length}
                    </span>
                </div>

                <div className={styles.headerActions}>
                    {/* Year & Semester dropdowns — left of status filter */}
                    <div className={styles.miniTermFilters}>
                        <Select
                            variant="pill"
                            size="sm"
                            value={String(selectedYear)}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            aria-label="School year"
                        >
                            {yearOptions}
                        </Select>

                        <Select
                            variant="pill"
                            size="sm"
                            value={selectedSem}
                            onChange={(e) => setSelectedSem(e.target.value)}
                            aria-label="Semester"
                        >
                            {semOptions.map(sem => (
                                <option key={sem} value={sem}>
                                    {sem === '1st Sem' ? '1st Semester' : sem === '2nd Sem' ? '2nd Semester' : sem}
                                </option>
                            ))}
                        </Select>
                    </div>

                    {/* Status filter tabs / segmented control */}
                    <div className={styles.segmentedControl}>
                        {statusTabs.map((tab) => {
                            const active = selectedStatus === tab.key;
                            const count = displayCounts[tab.countKey] ?? 0;
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
            <div className={styles.blockBody}>
                {activeLoading ? (
                    <div className={styles.emptyState}>Loading assigned learning plans...</div>
                ) : filteredRows.length === 0 ? (
                    <div className={styles.emptyState}>
                        No {statusTabs.find((t) => t.key === selectedStatus)?.label || selectedStatus} learning plans found for {selectedYear} - {Number(selectedYear) + 1} ({selectedSem}).
                    </div>
                ) : (
                    <div className={styles.miniGridContainer}>
                        {filteredRows.map((row, idx) => (
                            <MiniCourseCard key={row.co_assign_id || idx} row={row} selectedStatus={selectedStatus} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MiniAssignedCourses;
