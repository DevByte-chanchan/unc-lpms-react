import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Edit, XCircle, HelpCircle, Download } from 'react-feather';
import { fetchJson } from "../utils/api.js";
import { syllabiData } from "../data/syllabiData.js";
import { getWorkflow } from "../utils/workflowHelpers.js";
import PDFViewerModal from './PDFViewerModal.jsx';

const CoursesTable = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }

    const statuses = ["DRAFT", "PENDING", "RETURNED", "APPROVED"];

    const [searchParams, setSearchParams] = useSearchParams();

    const [selectedStatus, setSelectedStatus] = useState(() => {
        const fromUrl = searchParams.get('status');
        if (fromUrl && statuses.some(s => s.toLowerCase() === fromUrl.toLowerCase())) {
            return fromUrl.toUpperCase();
        }
        return 'DRAFT';
    });

    const updateStatus = (status) => {
        setSelectedStatus(status);
        setSearchParams({ status: status.toLowerCase() });
    };
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ open: false, data: null, pos: null });
    const [exportFile, setExportFile] = useState(null);

    useEffect(() => {
        loadAssignments();
    }, []);

    const handleStatusChange = (e) => updateStatus(e.target.value);


    // Map static syllabiData to the row shape the table expects
    const mapStaticToRows = () => {
        const now = new Date().toISOString();
        return syllabiData.map((s, i) => {
            const mod = i % 4;
            const row = {
                date_assigned: s.update || now,
                date_submitted: null,
                d_date_accepted: null,
                d_date_returned: null,
                ph_date_returned: null,
                ic_date_returned: null,
                ld_date_returned: null,
                date_updated: null,
                ProgramCourseOffering: {
                    Course: {
                        course_no: s.code,
                        course_title: s.name
                    }
                }
            };

            if (mod === 0) {
                // DRAFT — keep as-is
            } else if (mod === 1) {
                // PENDING — has date_submitted but no acceptances
                row.date_submitted = s.update || now;
            } else if (mod === 2) {
                // APPROVED — fully accepted
                row.date_submitted = s.update || now;
                row.ic_date_accepted = now;
                row.ld_date_accepted = now;
                row.ph_date_accepted = now;
                row.d_date_accepted = now;
            } else if (mod === 3) {
                // RETURNED — returned by one approver
                row.date_submitted = s.update || now;
                row.ic_date_accepted = now;
                row.ld_date_returned = now;
            }

            return row;
        });
    };

    async function loadAssignments() {
        setLoading(true);
        try {
            // Centralized fetch handles network checks and parsing automatically
            const data = await fetchJson('/api/assignments');

            // Normalize: backend may return { data: [...] } or { rows: [...] } or array
            const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
            setAssignments(rows);
        } catch (err) {
            console.warn("API unavailable, using static syllabiData as fallback");
            setAssignments(mapStaticToRows());
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

    const computeOverallStatus = (row) => {
        const code = getCode(row) || '';
        const wf = getWorkflow(code);
        const isDefault = !wf?.submittedAt &&
            wf?.currentStage === 'submitted' &&
            wf?.dean?.status === 'pending' &&
            wf?.parallelReview?.industry_consultant?.status === 'pending' &&
            wf?.parallelReview?.library_director?.status === 'pending' &&
            wf?.programHead?.status === 'pending';
        if (!isDefault) {
            if (wf?.currentStage === 'approved') return 'Approved';
            if (wf?.currentStage === 'returned') return 'Returned';
            return wf.submittedAt ? 'Pending' : 'Draft';
        }
        const { d_date_accepted, ic_date_accepted, ld_date_accepted, ph_date_accepted,
                d_date_returned, ph_date_returned, ic_date_returned, ld_date_returned, date_submitted } = row || {};
        if (d_date_returned || ph_date_returned || ic_date_returned || ld_date_returned) return 'Returned';
        if (!date_submitted) return 'Draft';
        if (d_date_accepted && ph_date_accepted && ic_date_accepted && ld_date_accepted) return 'Approved';
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

    const openPopup = (row, e) => {
        const rect = e?.currentTarget?.getBoundingClientRect();
        const code = getCode(row);
        const wf = getWorkflow(code || '');
        const popupH = 280;
        const top = rect ? (rect.bottom + 4 + popupH > window.innerHeight ? rect.top - popupH - 4 : rect.bottom + 4) : 80;
        setPopup({ open: true, data: { workflow: wf, code }, pos: rect ? { right: window.innerWidth - rect.right, top } : null });
    };

    const closePopup = () => setPopup({ open: false, data: null, pos: null });

    // Calculate counts for each status
    const getStatusCount = (statusName) => {
        return assignments.filter(row => computeOverallStatus(row).toUpperCase() === statusName).length;
    };


    const statusBadge = (status) => {
        const map = {
            Draft: { color: '#6b7280', background: '#f3f4f6' },
            Pending: { color: '#b45309', background: '#fffbeb' },
            Returned: { color: '#dc2626', background: '#fef2f2' },
            Approved: { color: '#047857', background: '#ecfdf5' },
        };
        const s = map[status] || { color: '#6b7280', background: '#f3f4f6' };
        return <span style={{ ...s, padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>{status}</span>;
    };

    // Filter rows by selectedStatus
    const filteredRows = assignments.filter(row => {
        const overall = computeOverallStatus(row);
        return overall.toUpperCase() === selectedStatus;
    });

    // Popup component
    const DetailsPopup = ({ data, onClose, pos }) => {
        if (!data) return null;
        const wf = data.workflow || {}
        const submittedAt = wf.submittedAt || null
        const approvers = [
            { key: 'Industry Consultant', wfKey: wf.parallelReview?.industry_consultant },
            { key: 'Library Director', wfKey: wf.parallelReview?.library_director },
            { key: 'Program Head', wfKey: wf.programHead },
            { key: 'Dean', wfKey: wf.dean },
        ]
        return (
            <>
                <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1199 }} />
                <div style={{
                    position: 'fixed',
                    right: pos?.right ?? 20,
                    top: pos?.top ?? 80,
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

                        {approvers.map((a, idx) => {
                            const status = a.wfKey?.status || 'pending'
                            return (
                            <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ fontWeight: 600 }}>{a.key}</div>
                                </div>
                                {status === 'done' && a.wfKey?.completedAt ? <div style={{ fontSize: 13, color: '#333' }}><strong>Approved at:</strong> {new Date(a.wfKey.completedAt).toLocaleString()}</div> : null}
                                {status === 'returned' && a.wfKey?.completedAt ? <div style={{ fontSize: 13, color: '#dc2626' }}><strong>Returned at:</strong> {new Date(a.wfKey.completedAt).toLocaleString()}</div> : null}
                                {status === 'pending' ? <div style={{ fontSize: 13, color: '#999' }}>Pending</div> : null}
                            </div>
                            );
                        })}
                    </div>
                </div>
            </>
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
                    <div className={styles['segmented-control']}>
                        {statuses.map((status) => {
                            const count = getStatusCount(status);
                            const isReturned = status === 'RETURNED';
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    className={`${styles['control-item']} ${selectedStatus === status ? styles['active'] : ''}`}
                                    onClick={() => handleStatusChange({ target: { value: status } })}
                                >

                                    {status.charAt(0) + status.slice(1).toLowerCase()}
                                    {/*<span*/}
                                    {/*    style={{*/}
                                    {/*    marginLeft: '4px',*/}
                                    {/*    color: isReturned ? '#e74c3c' : 'inherit',*/}
                                    {/*    fontWeight: isReturned ? 'bold' : 'normal'*/}
                                    {/*}}>*/}
                                    {/*    ({count})*/}
                                    {/*</span>*/}
                                </button>
                            );
                        })}
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
                            <th width={550}>COURSE NAME</th>
                            {selectedStatus === 'APPROVED' && <th width={250}>DATE APPROVED</th>}
                            {selectedStatus === 'APPROVED' && <th style={{ width: 80, textAlign: 'center' }}>EXPORT</th>}
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRows.map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{row.date_assigned ? new Date(row.date_assigned).toLocaleDateString() : '-'}</td>
                                <td width={150}>{getCode(row)}</td>
                                <td width={550}>{getName(row)}</td>
                                {selectedStatus === 'DRAFT' ? null : null}
                                {selectedStatus === 'APPROVED' && <td width={250}><span style={{ color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12, display: 'inline-block' }}>{(() => { const d = row.d_date_accepted || getWorkflow(getCode(row))?.dean?.completedAt; return d ? new Date(d).toLocaleDateString() : '-'; })()}</span></td>}
                                {selectedStatus === 'APPROVED' && <td style={{ width: 80, textAlign: 'center', fontWeight: 500 }}>
                                    <span className="actionLink" style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', justifyContent: 'center' }} onClick={() => setExportFile(row)}>
                                        Export <Download size={16} />
                                    </span>
                                </td>}
                                <td className={styles.fill}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Link
                                            className={'actionLink'}
                                            to={`/courses/${getCode(row)}/${selectedStatus.toLowerCase()}`}
                                            style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                        >
                                            {selectedStatus === 'DRAFT' ? 'Compose' : 'View'}
                                            <ChevronRight size={18} />
                                        </Link>

                                        {selectedStatus ==='APPROVED' &&
                                            <button onClick={(e) => openPopup(row, e)} className={styles.info}>
                                                <HelpCircle size={18} />
                                            </button>
                                        }

                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                }

                {(selectedStatus === 'PENDING' || selectedStatus === 'RETURNED') &&
                    <table>
                        <thead>
                        <tr>
                            <th width={200}>DATE ASSIGNED</th>
                            <th width={150}>CODE</th>
                            <th width={550}>COURSE NAME</th>
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
                                    <td width={550}>{getName(row)}</td>

                                    <td className={styles.fill}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {overallDisplay === 'Returned' ? (
                                                <Link className={'actionLink'}
                                                      to={`/courses/${getCode(row)}/${selectedStatus.toLowerCase()}`}
                                                      style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                                >
                                                    Update<Edit size={16} />
                                                </Link>
                                            ) : (
                                                <Link className={'actionLink'}
                                                      to={`/courses/${getCode(row)}/${selectedStatus.toLowerCase()}`}
                                                      style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                                >
                                                    View <ChevronRight size={16} />
                                                </Link>
                                            )}
                                            <button onClick={(e) => openPopup(row, e)} className={styles.info}>
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

            {popup.open && popup.data && <DetailsPopup data={popup.data} onClose={closePopup} pos={popup.pos} />}

            {exportFile && (
                <PDFViewerModal
                    file={{
                        file_url: '/syllabus-template.pdf',
                        file_name: `SYLLABUS_${getCode(exportFile)}.pdf`,
                        instructor_name: exportFile.instructor || '—',
                        course_id: getCode(exportFile),
                        course_name: getName(exportFile),
                        submission_date: exportFile.date_submitted || '',
                        period_label: '',
                    }}
                    kind="Syllabus"
                    onClose={() => setExportFile(null)}
                />
            )}
        </div>
    );
};

export default CoursesTable;