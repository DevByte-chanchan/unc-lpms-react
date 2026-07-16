import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Edit, XCircle, HelpCircle } from 'react-feather';
import { fetchJson } from "../utils/api.js";

// --- Custom Date Formatters to Ensure Global Consistency ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[0]; // Outputs: YYYY-MM-DD
};

const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';

    const datePart = d.toISOString().split('T')[0]; // YYYY-MM-DD

    // Manually construct 12-hour time to avoid browser locale inconsistencies
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // convert hour '0' to '12'

    const timePart = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    return `${datePart} ${timePart}`; // Outputs: YYYY-MM-DD HH:MM AM/PM
};

const CoursesTable = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        const schoolYearLabel = `${i} - ${i + 1}`;
        yearOptions.push(
            <option key={i} value={i}>
                {schoolYearLabel}
            </option>
        );
    }

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedSem, setSelectedSem] = useState(semOptions[0]);

    const statusesOptions = ["DRAFT", "PENDING", "RETURNED", "APPROVED"];
    const [statuses, setStatuses] = useState(statusesOptions);
    const [selectedStatus, setSelectedStatus] = useState('DRAFT');

    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ open: false, data: null });

    // Handle Status Constraints based on Year Selection
    useEffect(() => {
        if (String(selectedYear) !== String(currentYear)) {
            setStatuses(["APPROVED"]);
            setSelectedStatus("APPROVED");
        } else {
            setStatuses(statusesOptions);
            setSelectedStatus("DRAFT");
        }
    }, [selectedYear, currentYear]);

    // Fetch data whenever Year or Semester changes
    useEffect(() => {
        loadAssignments();
    }, [selectedYear, selectedSem]);

    const handleStatusChange = (e) => setSelectedStatus(e.target.value);

    async function loadAssignments() {
        setLoading(true);
        try {
            // Append the filter query parameters to the URL
            const url = `/api/assignments?year=${selectedYear}&semester=${encodeURIComponent(selectedSem)}`;
            const data = await fetchJson(url);
            const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
            setAssignments(rows);
        } catch (err) {
            console.error("Error loading assignments architecture:", err);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }

    const getCode = (assignment) => {
        const pco = assignment.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return course.course_no || course.code || course.course_id || pco.course_id || assignment.pc_offering_id || '-';
    };

    const getOfferingID = (assignment) => {
        return assignment.ProgramCourseOffering.pc_offering_id;
    };

    const getRevNum = (assignment) => {
        return assignment.ProgramCourseOffering.revision_number;
    };

    const getName = (assignment) => {
        const pco = assignment.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return course.course_title || course.title || course.name || pco.course_description || '-';
    };

    const computeOverallStatus = (row) => {
        const logs = row.logs || [];
        const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;

        // 1. Is it Approved? Check if the Dean has EVER accepted it.
        // This is the strongest state and overrides previous submissions/returns.
        const deanApproval = logs.find(log => log.action_type === 'ACCEPTED' && log.actor_role === 'DEAN');
        if (deanApproval) {
            return 'Approved';
        }

        // 2. If not approved, is it currently Returned?
        if (latestLog && latestLog.action_type === 'RETURNED') {
            return 'Returned';
        }

        // 3. If neither Approved nor Returned, is it currently Pending?
        const hasBeenSubmitted =
            row.date_submitted !== null ||
            logs.some(log => log.action_type === 'SUBMITTED' || log.action_type === 'ACCEPTED');

        if (hasBeenSubmitted) {
            return 'Pending';
        }

        // 4. Default state
        return 'Draft';
    };

    const buildApproverStatus = (row) => {
        const logs = row.logs || [];

        const getLatestActionForRole = (role) => {
            const roleLogs = logs.filter(l => l.actor_role === role);
            if (roleLogs.length === 0) return null;
            return roleLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        };

        const rolesToTrack = [
            { label: 'Industry Consultant', roleKey: 'INDUSTRY_CONSULTANT' },
            { label: 'Library Director', roleKey: 'LIBRARY_DIRECTOR' },
            { label: 'Program Head', roleKey: 'PROGRAM_HEAD' },
            { label: 'Dean', roleKey: 'DEAN' }
        ];

        return rolesToTrack.map(r => {
            const latestAction = getLatestActionForRole(r.roleKey);

            if (!latestAction) {
                return { title: r.label, status: 'Pending' };
            }

            if (latestAction.action_type === 'ACCEPTED') {
                return { title: r.label, status: 'Accepted', acceptedAt: latestAction.createdAt };
            }

            if (latestAction.action_type === 'RETURNED') {
                const instructorSubmissions = logs.filter(l => l.action_type === 'SUBMITTED');
                const latestSubmission = instructorSubmissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

                const details = { title: r.label, status: 'Returned', returnedAt: latestAction.createdAt };

                if (latestSubmission && new Date(latestSubmission.createdAt) > new Date(latestAction.createdAt)) {
                    details.updatedAt = latestSubmission.createdAt;
                }
                return details;
            }

            return { title: r.label, status: 'Pending' };
        });
    };

    const openPopup = (row) => {
        const logs = row.logs || [];

        const submissionLogs = logs.filter(l => l.action_type === 'SUBMITTED')
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const submittedAt = submissionLogs.length > 0 ? submissionLogs[0].createdAt : row.date_submitted;
        const approverStatuses = buildApproverStatus(row);

        setPopup({ open: true, data: { submittedAt, approverStatuses } });
    };

    const closePopup = () => setPopup({ open: false, data: null });

    const filteredRows = assignments.filter(row => {
        const overall = computeOverallStatus(row);
        return overall.toUpperCase() === selectedStatus;
    });

    const DetailsPopup = ({ data, onClose }) => {
        if (!data) return null;
        const { submittedAt, approverStatuses } = data;
        return (
            <div style={{
                position: 'fixed',
                right: 20,
                top: 80,
                width: 340,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 6,
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                zIndex: 1200,
                padding: 12
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>View details</strong>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }} aria-label="Close details">
                        <XCircle size={18} />
                    </button>
                </div>

                <div style={{ fontSize: 13, marginBottom: 10 }}>
                    <div style={{ color: '#666', marginBottom: 8 }}>
                        <strong>Submitted at:</strong> {formatDateTime(submittedAt)}
                    </div>

                    {approverStatuses.map((a, idx) => (
                        <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ fontWeight: 600 }}>{a.title}</div>
                            <div style={{ fontSize: 13, color: '#333' }}>
                                {a.status === 'Accepted' && <div>Accepted at: {formatDateTime(a.acceptedAt)}</div>}
                                {a.status === 'Returned' && (
                                    <>
                                        <div>Returned at: {formatDateTime(a.returnedAt)}</div>
                                        {a.updatedAt && <div>Updated at: {formatDateTime(a.updatedAt)}</div>}
                                    </>
                                )}
                                {a.status === 'Pending' && <div>Pending</div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={styles['courses-table']}>
            <div className={styles.header}>
                <h2>ASSIGNED COURSE OFFERINGS </h2>
                <div className={styles.filterA}>
                    <select
                        className={styles['header-select']}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {yearOptions}
                    </select>

                    <select
                        className={styles['header-select']}
                        value={selectedSem}
                        onChange={(e) => setSelectedSem(e.target.value)}
                    >
                        {semOptions.map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.fill}></div>

                <div className={styles['filter-container']}>
                    <div className={styles['segmented-control']}>
                        {statuses.map((status) => {
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    className={`${styles['control-item']} ${selectedStatus === status ? styles['active'] : ''}`}
                                    onClick={() => handleStatusChange({ target: { value: status } })}
                                >
                                    {status.charAt(0) + status.slice(1).toLowerCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className={styles['table-container']}>
                {loading && <div>Loading...</div>}

                {/* DRAFT and APPROVED TABLE */}
                {(selectedStatus === 'DRAFT' || selectedStatus === 'APPROVED') &&
                    <table>
                        <thead>
                        <tr>
                            <th width={200}>DATE ASSIGNED</th>
                            <th width={150}>CODE</th>
                            <th width={350}>COURSE NAME</th>
                            {selectedStatus === 'APPROVED' && <th width={200}>DATE APPROVED</th>}
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRows.map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{formatDate(row.date_assigned)}</td>
                                <td width={150}>{getCode(row)}</td>
                                <td width={350}>{getName(row)}</td>
                                {selectedStatus === 'APPROVED' && <td width={200}>{formatDate(row.date_approved)}</td>}
                                <td className={styles.fill}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Link
                                            className={'actionLink'}
                                            to={`/courses/${getOfferingID(row)}/${getRevNum(row)}/${selectedStatus.toLowerCase()}`}
                                        >
                                            {selectedStatus === 'DRAFT' ? 'Compose' : 'View'}
                                            <ChevronRight size={18} />
                                        </Link>

                                        {selectedStatus === 'APPROVED' &&
                                            <button onClick={() => openPopup(row)} className={styles.info}>
                                                <HelpCircle size={18} />
                                            </button>
                                        }
                                    </div>
                                </td>
                                <td></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                }

                {/* PENDING and RETURNED TABLE (Status column completely removed) */}
                {(selectedStatus === 'PENDING' || selectedStatus === 'RETURNED') &&
                    <table>
                        <thead>
                        <tr>
                            <th width={200}>DATE ASSIGNED</th>
                            <th width={150}>CODE</th>
                            <th width={350}>COURSE NAME</th>
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRows.map((row, index) => {
                            const overallStatus = computeOverallStatus(row);
                            return (
                                <tr key={index}>
                                    <td width={200}>{formatDate(row.date_assigned)}</td>
                                    <td width={150}>{getCode(row)}</td>
                                    <td width={350}>{getName(row)}</td>

                                    <td className={styles.fill}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {overallStatus === 'Returned' ? (
                                                <Link className={'actionLink'}
                                                      to={`/courses/${getOfferingID(row)}/${getRevNum(row)}/${selectedStatus.toLowerCase()}`}
                                                >
                                                    Update<Edit size={16} />
                                                </Link>
                                            ) : (
                                                <Link className={'actionLink'}
                                                      to={`/courses/${getOfferingID(row)}/${getRevNum(row)}/${selectedStatus.toLowerCase()}`}
                                                >
                                                    View <ChevronRight size={16} />
                                                </Link>
                                            )}
                                            <button onClick={() => openPopup(row)} className={styles.info}>
                                                <HelpCircle opacity={.8} size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                }
            </div>

            {popup.open && <DetailsPopup data={popup.data} onClose={closePopup} />}
        </div>
    );
};

export default CoursesTable;