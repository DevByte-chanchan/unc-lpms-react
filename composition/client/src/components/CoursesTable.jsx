import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Edit, XCircle, HelpCircle } from 'react-feather';


const CoursesTable = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }

    const statuses = ["DRAFT", "PENDING", "APPROVED"];

    const [selectedStatus, setSelectedStatus] = useState('DRAFT');
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ open: false, data: null });

    useEffect(() => {
        loadAssignments();
    }, []);

    const handleStatusChange = (e) => setSelectedStatus(e.target.value);

    async function loadAssignments() {
        setLoading(true);
        try {
            // Use full backend URL if your frontend and backend are on different origins
            const res = await fetch('http://localhost:5000/api/assignments');
            if (!res.ok) throw new Error('Failed to fetch assignments');
            const data = await res.json();
            // Normalize: backend may return { data: [...] } or { rows: [...] } or array
            const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
            setAssignments(rows);
        } catch (err) {
            console.error(err);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }

    // Safe accessors for code and name (preserve table columns)
    const getCode = (assignment) => {
        const pco = assignment.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return course.course_no || course.code || course.course_id || pco.course_id || assignment.pc_offering_id || '-';
    };

    const getName = (assignment) => {
        const pco = assignment.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return course.course_title || course.title || course.name || pco.course_description || '-';
    };

    // Consolidated status logic:
    // 1. If any *_date_returned exists => Returned
    // 2. If no date_submitted => Draft
    // 3. If dean accepted (d_date_accepted) => Approved
    // 4. Otherwise => Pending
    const computeOverallStatus = (row) => {
        const {
            date_submitted,
            d_date_accepted,
            d_date_returned,
            ph_date_returned,
            ic_date_returned,
            ld_date_returned
        } = row || {};

        // Returned has highest priority
        if (d_date_returned || ph_date_returned || ic_date_returned || ld_date_returned) {
            return 'Returned';

        }

        // Draft if not submitted
        if (!date_submitted) {
            return 'Draft';
        }

        // Approved if dean accepted (simplified rule)
        if (d_date_accepted) {
            return 'Approved';
        }

        // Otherwise pending
        return 'Pending';
    };

    // Build per-approver display object for popup
    const buildApproverStatus = (row) => {
        const approvers = [
            {
                key: 'Industry Consultant',
                accepted: row?.ic_date_accepted,
                returned: row?.ic_date_returned,
                updated: row?.date_updated
            },
            {
                key: 'Library Director',
                accepted: row?.ld_date_accepted,
                returned: row?.ld_date_returned,
                updated: row?.date_updated
            },
            {
                key: 'Program Head',
                accepted: row?.ph_date_accepted,
                returned: row?.ph_date_returned,
                updated: row?.date_updated
            },
            {
                key: 'Dean',
                accepted: row?.d_date_accepted,
                returned: row?.d_date_returned,
                updated: row?.date_updated
            }
        ];

        return approvers.map(a => {
            if (a.accepted) {
                return { title: a.key, status: 'Accepted', acceptedAt: a.accepted };
            }
            if (a.returned) {
                const details = { title: a.key, status: 'Returned', returnedAt: a.returned };
                if (a.updated && a.updated !== a.returned) details.updatedAt = a.updated;
                return details;
            }
            return { title: a.key, status: 'Pending' };
        });
    };

    const openPopup = (row) => {
        const submittedAt = row?.date_submitted || null;
        const approverStatuses = buildApproverStatus(row);
        setPopup({ open: true, data: { submittedAt, approverStatuses } });
    };

    const closePopup = () => setPopup({ open: false, data: null });

    // Filter rows by selectedStatus
    const filteredRows = assignments.filter(row => {
        const overall = computeOverallStatus(row);
        if (selectedStatus === 'DRAFT') return overall === 'Draft';
        if (selectedStatus === 'APPROVED') return overall === 'Approved';
        if (selectedStatus === 'PENDING') return overall === 'Pending' || overall === 'Returned';
        return true;
    });

    // Popup component
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
                        <strong>Submitted at:</strong> {submittedAt ? new Date(submittedAt).toLocaleString() : '-'}
                    </div>

                    {approverStatuses.map((a, idx) => (
                        <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ fontWeight: 600 }}>{a.title}</div>
                            <div style={{ fontSize: 13, color: '#333' }}>
                                {a.status === 'Accepted' && <div>Accepted at: {new Date(a.acceptedAt).toLocaleString()}</div>}
                                {a.status === 'Returned' && (
                                    <>
                                        <div>Returned at: {a.returnedAt ? new Date(a.returnedAt).toLocaleString() : '-'}</div>
                                        {a.updatedAt && <div>Updated at: {new Date(a.updatedAt).toLocaleString()}</div>}
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
                <h2>ASSIGNED COURSES</h2>

                <div className={styles.filterA}>
                    <select className={styles['header-select']}>
                        {yearOptions}
                    </select>
                    <select className={styles['header-select']}>
                        {semOptions.map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.fill}></div>

                <div className={styles['filter-container']}>
                    <p>Filter by <strong>Status</strong>:</p>
                    <div className={styles['segmented-control']}>
                        {statuses.map((status) => (
                            <button
                                key={status}
                                type="button"
                                className={`${styles['control-item']} ${selectedStatus === status ? styles['active'] : ''}`}
                                onClick={() => handleStatusChange({ target: { value: status } })}
                            >
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles['table-container']}>
                {loading && <div>Loading...</div>}

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
                                <td width={200}>{row.date_assigned ? new Date(row.date_assigned).toLocaleDateString() : '-'}</td>
                                <td width={150}>{getCode(row)}</td>
                                <td width={350}>{getName(row)}</td>
                                {selectedStatus === 'APPROVED' && <td width={200}>{row.d_date_accepted ? new Date(row.d_date_accepted).toLocaleDateString() : '-'}</td>}
                                <td className={styles.fill}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Link className={'actionLink'} to={selectedStatus === 'APPROVED' ? `/role/instructor/courses/${getCode(row)}?status=approved` : `/courses/${getCode(row)}`}>
                                            {selectedStatus === 'DRAFT' ? 'Compose' : 'View'}
                                            <ChevronRight size={18} />
                                        </Link>

                                        {selectedStatus ==='APPROVED' &&
                                            <button onClick={() => openPopup(row)} className={styles.info}>
                                                <HelpCircle size={18} />
                                            </button>
                                        }

                                    </div>
                                </td>
                                <td>

                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                }

                {(selectedStatus !== 'DRAFT' && selectedStatus !== 'APPROVED') &&
                    <table>
                        <thead>
                        <tr>
                            <th width={200}>DATE ASSIGNED</th>
                            <th width={150}>CODE</th>
                            <th width={300}>COURSE_NAME</th>
                            <th width={250}>STATUS</th>
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRows.map((row, index) => {
                            const overallStatus = computeOverallStatus(row);
                            let overallDisplay = overallStatus;
                            return (
                                <tr key={index}>
                                    <td width={200}>{row.date_assigned ? new Date(row.date_assigned).toLocaleDateString() : '-'}</td>
                                    <td width={150}>{getCode(row)}</td>
                                    <td width={300}>{getName(row)}</td>

                                    <td width={250}>
                                        <div style={{ fontWeight: 500 }}>{overallDisplay}</div>
                                    </td>

                                    <td className={styles.fill}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {overallDisplay === 'Returned' ? (
                                                <Link className={'actionLink'} to={`/revisions/${getCode(row)}`}>
                                                    Update<Edit size={16} />
                                                </Link>
                                            ) : (
                                                <Link className={'actionLink'} to={`/role/instructor/courses/${getCode(row)}`}>
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
