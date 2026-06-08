import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, XCircle, HelpCircle, Download } from 'react-feather';
import { fetchJson } from "../utils/api.js";
import { syllabiData } from "../data/syllabiData.js";
import { getWorkflow } from "../utils/workflowHelpers.js";
import PDFViewerModal from './PDFViewerModal.jsx';

const getProgram = (code) => {
  if (code && code.startsWith('IT ')) return 'Information Technology';
  return 'Computer Science';
};

const ApprovalCoursesTable = ({ role = 'approver' }) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }

    const statuses = role === 'oic-ovpaa' ? ["APPROVED"] : ["PENDING", "RETURNED", "APPROVED"];

    const [selectedStatus, setSelectedStatus] = useState(role === 'oic-ovpaa' ? 'APPROVED' : 'PENDING');
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ open: false, data: null, pos: null });
    const [exportFile, setExportFile] = useState(null);

    useEffect(() => {
        loadAssignments();
    }, []);

    const buildApproverStatus = (row) => {
        const approvers = [
            { key: 'Industry Consultant', accepted: row?.ic_date_accepted, returned: row?.ic_date_returned, updated: row?.date_updated },
            { key: 'Library Director', accepted: row?.ld_date_accepted, returned: row?.ld_date_returned, updated: row?.date_updated },
            { key: 'Program Head', accepted: row?.ph_date_accepted, returned: row?.ph_date_returned, updated: row?.date_updated },
            { key: 'Dean', accepted: row?.d_date_accepted, returned: row?.d_date_returned, updated: row?.date_updated }
        ];
        return approvers.map(a => {
            if (a.accepted) return { title: a.key, status: 'Accepted', acceptedAt: a.accepted };
            if (a.returned) {
                const details = { title: a.key, status: 'Returned', returnedAt: a.returned };
                if (a.updated && a.updated !== a.returned) details.updatedAt = a.updated;
                return details;
            }
            return { title: a.key, status: 'Pending' };
        });
    };

    const mapStaticToRows = () => {
        const now = new Date().toISOString();
        return syllabiData.map((s, i) => {
            const mod = i % 4;
            const row = {
                code: s.code,
                name: s.name,
                program: getProgram(s.code),
                instructor: 'Danny Casimero',
                date_assigned: s.update || now,
                date_submitted: null,
                d_date_accepted: null,
                d_date_returned: null,
                ph_date_returned: null,
                ic_date_returned: null,
                ld_date_returned: null,
                date_updated: null,
                ic_date_accepted: null,
                ld_date_accepted: null,
                ph_date_accepted: null,
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

    const getOverallStatus = (row) => {
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

    const statusBadge = (status) => {
        const map = {
            Pending: { color: '#b45309', background: '#fffbeb' },
            Returned: { color: '#dc2626', background: '#fef2f2' },
            Approved: { color: '#047857', background: '#ecfdf5' },
            Draft: { color: '#6b7280', background: '#f3f4f6' },
        };
        const s = map[status] || { color: '#6b7280', background: '#f3f4f6' };
        return <span style={{ ...s, padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 }}>{status}</span>;
    };

    async function loadAssignments() {
        setLoading(true);
        try {
            const data = await fetchJson('/api/assignments');
            const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
            setAssignments(rows.map(r => ({
                code: r.ProgramCourseOffering?.Course?.course_no || r.code || '-',
                name: r.ProgramCourseOffering?.Course?.course_title || r.name || '-',
                program: getProgram(r.ProgramCourseOffering?.Course?.course_no || r.code || ''),
                instructor: r.instructor || 'Danny Casimero',
                date_assigned: r.date_assigned || '',
                date_submitted: r.date_submitted || null,
                d_date_accepted: r.d_date_accepted || null,
                d_date_returned: r.d_date_returned || null,
                ph_date_returned: r.ph_date_returned || null,
                ic_date_returned: r.ic_date_returned || null,
                ld_date_returned: r.ld_date_returned || null,
                ic_date_accepted: r.ic_date_accepted || null,
                ld_date_accepted: r.ld_date_accepted || null,
                ph_date_accepted: r.ph_date_accepted || null,
                date_updated: r.date_updated || null,
            })));
        } catch (err) {
            console.warn("API unavailable, using static syllabiData as fallback");
            setAssignments(mapStaticToRows());
        } finally {
            setLoading(false);
        }
    }

    const getCode = (row) => row.code;
    const getName = (row) => row.name;

    const filteredRows = assignments.filter(row => getOverallStatus(row).toUpperCase() === selectedStatus);

    const getStatusCount = (statusName) => assignments.filter(row => getOverallStatus(row).toUpperCase() === statusName).length;

    const openPopup = (row, e) => {
        const rect = e?.currentTarget?.getBoundingClientRect();
        const code = getCode(row);
        const wf = getWorkflow(code || '');
        setPopup({ open: true, data: { workflow: wf, code }, pos: rect ? { right: window.innerWidth - rect.right, top: rect.bottom + 4 } : null });
    };

    const closePopup = () => setPopup({ open: false, data: null, pos: null });

    const getCourseLink = (row) => {
        const base = `/role/${role}/courses/${encodeURIComponent(row.code)}`;
        return `${base}?status=${getOverallStatus(row).toLowerCase()}`;
    };

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
        const badgeMap = {
            Accepted: { color: '#047857', background: '#ecfdf5' },
            Returned: { color: '#dc2626', background: '#fef2f2' },
            Pending: { color: '#b45309', background: '#fffbeb' },
        }
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
                            const label = status === 'done' ? 'Accepted' : status === 'returned' ? 'Returned' : 'Pending'
                            const b = badgeMap[label] || { color: '#6b7280', background: '#f3f4f6' }
                            return (
                            <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ fontWeight: 600 }}>{a.key}</div>
                                    <span style={{ ...b, padding: '2px 8px', borderRadius: 99, fontWeight: 600, fontSize: 11 }}>{label}</span>
                                </div>
                                {a.wfKey?.completedAt ? <div style={{ fontSize: 13, color: '#333' }}>{new Date(a.wfKey.completedAt).toLocaleString()}</div> : <div style={{ fontSize: 13, color: '#999' }}>—</div>}
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

                {role !== 'oic-ovpaa' && (
                <div className={styles['filter-container']}>
                    <div className={styles['segmented-control']}>
                        {statuses.map((status) => {
                            const count = getStatusCount(status);
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    className={`${styles['control-item']} ${selectedStatus === status ? styles['active'] : ''}`}
                                    onClick={() => setSelectedStatus(status)}
                                >
                                    {status.charAt(0) + status.slice(1).toLowerCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>
                )}
            </div>

            <div className={styles['table-container']}>
                {loading && <div>Loading...</div>}

                {selectedStatus === 'APPROVED' &&
                    <table>
                        <thead>
                        <tr>
                            <th width={200}>DATE ASSIGNED</th>
                            <th width={150}>CODE</th>
                            <th width={300}>COURSE NAME</th>
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
                                <td width={300}>{getName(row)}</td>
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
                                            to={getCourseLink(row)}
                                            style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                        >
                                            View
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
                            <th width={300}>COURSE NAME</th>
                            <th width={250}>STATUS</th>
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRows.map((row, index) => {
                            const overallStatus = getOverallStatus(row);
                            return (
                                <tr key={index}>
                                    <td width={200}>{row.date_assigned ? new Date(row.date_assigned).toLocaleDateString() : '-'}</td>
                                    <td width={150}>{getCode(row)}</td>
                                    <td width={300}>{getName(row)}</td>

                                    <td width={250}>
                                        {statusBadge(overallStatus)}
                                    </td>

                                    <td className={styles.fill}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <Link className={'actionLink'}
                                                  to={getCourseLink(row)}
                                                  style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                            >
                                                View <ChevronRight size={16} />
                                            </Link>
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
                        file_url: 'https://pdfobject.com/pdf/sample.pdf',
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

export default ApprovalCoursesTable;
