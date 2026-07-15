import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, XCircle, HelpCircle, Download } from 'react-feather';
import { fetchJson } from "../utils/api.js";
import { syllabiData } from "../data/syllabiData.js";
import { getWorkflow } from "../utils/workflowHelpers.js";
import { getCoursesForRole } from "../utils/demoCourses.js";
import { getSyllabi } from "../utils/dataStore.js";
import { buildSyllabusHtml } from "../utils/syllabusPdfHtml.js";
import PDFViewerModal from "./PDFViewerModal.jsx";
import unclogo from '../assets/unclogo.png';

const getProgram = (code) => {
  if (code && code.startsWith('IT ')) return 'Information Technology';
  return 'Computer Science';
};

const EXPORT_ROLES = ['dean', 'vpaa', 'instructor'];

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[0];
};

const ApprovalCoursesTable = ({ role = 'approver' }) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }

    const statuses = role === 'vpaa' ? ["APPROVED"] : ["PENDING", "RETURNED", "APPROVED"];

    const [searchParams, setSearchParams] = useSearchParams();
    const defaultStatus = role === 'vpaa' ? 'APPROVED' : 'PENDING';
    const [selectedStatus, setSelectedStatus] = useState(() => {
        const fromUrl = searchParams.get('status');
        if (fromUrl && statuses.some(s => s.toLowerCase() === fromUrl.toLowerCase())) {
            return fromUrl.toUpperCase();
        }
        return defaultStatus;
    });
    const updateStatus = (status) => {
        setSelectedStatus(status);
        setSearchParams({ status: status.toLowerCase() }, { replace: true });
    };
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ open: false, data: null, pos: null });
    const [exportFile, setExportFile] = useState(null);
    const [exporting, setExporting] = useState(false);

    const closeExportModal = () => {
      if (exportFile) URL.revokeObjectURL(exportFile.file_url)
      setExportFile(null)
    }

    const handleExport = async (row) => {
      try {
        setExporting(true)
        const syllabus = getSyllabi().find(s => s.code === getCode(row))
        if (!syllabus) { alert('Syllabus data not found'); setExporting(false); return }
        const workflow = getWorkflow(getCode(row))

        const logoUrl = new URL(unclogo, window.location.origin).href
        const html = buildSyllabusHtml(syllabus, getCode(row), workflow, logoUrl)
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        setExportFile({
          file_url: url,
          file_name: `Syllabus_${getCode(row)}.html`,
          instructor_name: row.instructor || '—',
          course_id: getCode(row),
          course_name: getName(row),
          submission_date: row.date_submitted || workflow?.submittedAt || null,
          period_label: row.period || '',
        })
      } catch (err) {
        console.warn('Export failed:', err)
        alert('Export error: ' + (err?.message || err || 'unknown'))
      } finally {
        setExporting(false)
      }
    }

    useEffect(() => {
        loadAssignments();
    }, []);

    const buildApproverStatus = (row) => {
        const approvers = [
            { key: 'Industry Consultant', accepted: row?.ic_date_accepted, returned: row?.ic_date_returned, updated: row?.date_updated },
            { key: 'Director of Libraries', accepted: row?.ld_date_accepted, returned: row?.ld_date_returned, updated: row?.date_updated },
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

    const getOverallStatus = (row) => {
        // Canonical demo status wins — keeps every role consistent.
        if (row.status) return row.status.charAt(0).toUpperCase() + row.status.slice(1);
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

    function loadAssignments() {
        setLoading(true);
        // Single source of truth — same courses/tabs for every role.
        setAssignments(getCoursesForRole(role));
        setLoading(false);
    }

    const getCode = (row) => row.code;
    const getName = (row) => row.name;

    const filteredRows = assignments.filter(row => getOverallStatus(row).toUpperCase() === selectedStatus);

    const getStatusCount = (statusName) => assignments.filter(row => getOverallStatus(row).toUpperCase() === statusName).length;

    const openPopup = (row, e) => {
        const rect = e?.currentTarget?.getBoundingClientRect();
        const code = getCode(row);
        const wf = getWorkflow(code || '');
        const popupH = 280;
        const top = rect ? (rect.bottom + 4 + popupH > window.innerHeight ? rect.top - popupH - 4 : rect.bottom + 4) : 80;
        setPopup({ open: true, data: { workflow: wf, code }, pos: rect ? { right: window.innerWidth - rect.right, top } : null });
    };

    const closePopup = () => setPopup({ open: false, data: null, pos: null });

    const getCourseLink = (row) => {
        const base = `/role/${role}/courses/${encodeURIComponent(row.code)}`;
        return `${base}?status=${getOverallStatus(row).toLowerCase()}&fromStatus=${selectedStatus.toLowerCase()}`;
    };

    const DetailsPopup = ({ data, onClose, pos }) => {
        if (!data) return null;
        const wf = data.workflow || {}
        const submittedAt = wf.submittedAt || null
        const approvers = [
            { key: 'Industry Consultant', wfKey: wf.parallelReview?.industry_consultant },
            { key: 'Director of Libraries', wfKey: wf.parallelReview?.library_director },
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
                        <strong style={{ color: '#666' }}>View details</strong>
                        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }} aria-label="Close details">
                            <XCircle size={18} />
                        </button>
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 10 }}>
                        <div style={{ color: '#666', marginBottom: 8 }}>
                            <strong>Submitted at:</strong> {submittedAt ? new Date(submittedAt).toLocaleString() : '-'}
                        </div>

                        {approvers.map((a, idx) => {
                            const status = a.wfKey?.status || 'pending';
                            // "Approved" is reserved for the Dean; the other three approvers "Accept".
                            const doneLabel = a.key === 'Dean' ? 'Approved' : 'Accepted';
                            return (
                            <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ fontWeight: 600, color: '#666' }}>{a.key}</div>
                                </div>
                                {status === 'done' && a.wfKey?.completedAt ? <div style={{ fontSize: 13, color: '#666' }}><strong>{doneLabel} at:</strong> {new Date(a.wfKey.completedAt).toLocaleString()}</div> : null}
                                {status === 'done' && !a.wfKey?.completedAt ? <div style={{ fontSize: 13, color: '#047857' }}>{doneLabel}</div> : null}
                                {status === 'returned' && a.wfKey?.completedAt ? <div style={{ fontSize: 13, color: '#666' }}><strong>Returned at:</strong> {new Date(a.wfKey.completedAt).toLocaleString()}</div> : null}
                                {status === 'pending' ? <div style={{ fontSize: 13, color: '#666' }}>Pending</div> : null}
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

                {role !== 'vpaa' && (
                <div className={styles['filter-container']}>
                    <div className={styles['segmented-control']}>
                        {statuses.map((status) => {
                            const count = getStatusCount(status);
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    className={`${styles['control-item']} ${selectedStatus === status ? styles['active'] : ''}`}
                                    onClick={() => updateStatus(status)}
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
                            <th width={200} style={{textAlign:'center'}}>DATE ASSIGNED</th>
                            <th width={150} style={{textAlign:'center'}}>CODE</th>
                            <th width={300} style={{textAlign:'center'}}>COURSE NAME</th>
                            {selectedStatus === 'APPROVED' && <th width={200} style={{textAlign:'center'}}>DATE APPROVED</th>}
                            {selectedStatus === 'APPROVED' && EXPORT_ROLES.includes(role) && <th style={{ width: 80, textAlign: 'center' }}></th>}
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRows.map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{formatDate(row.date_assigned)}</td>
                                <td width={150}>{getCode(row)}</td>
                                <td width={300}>{getName(row)}</td>
                                {selectedStatus === 'APPROVED' && <td width={200}>{(() => { const d = row.d_date_accepted || getWorkflow(getCode(row))?.dean?.completedAt; return d ? formatDate(d) : '-'; })()}</td>}
                                {selectedStatus === 'APPROVED' && EXPORT_ROLES.includes(role) && <td style={{ width: 80, textAlign: 'center', fontWeight: 500 }}>
                                    <span className="actionLink" style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: exporting ? 'wait' : 'pointer', justifyContent: 'center', color: '#6b7280' }} onClick={() => !exporting && handleExport(row)}>
                                        {exporting ? '...' : 'Export'} <Download size={16} />
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
                                            <ChevronRight size={16} />
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
                            <th width={200} style={{textAlign:'center'}}>DATE ASSIGNED</th>
                            <th width={150} style={{textAlign:'center'}}>CODE</th>
                            <th width={350} style={{textAlign:'center'}}>COURSE NAME</th>
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRows.map((row, index) => {
                            const overallStatus = getOverallStatus(row);
                            return (
                                <tr key={index}>
                                    <td width={200}>{formatDate(row.date_assigned)}</td>
                                    <td width={150}>{getCode(row)}</td>
                                    <td width={350}>{getName(row)}</td>

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
                file={exportFile}
                kind="Syllabus"
                onClose={closeExportModal}
              />
            )}
        </div>
    );
};

export default ApprovalCoursesTable;
