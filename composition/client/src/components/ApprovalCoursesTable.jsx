import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, XCircle, HelpCircle, Download } from 'react-feather';
import { fetchJson } from "../utils/api.js";
import { buildSyllabusExportFile } from "../utils/exportSyllabus.js";
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
        const schoolYearLabel = `${i} - ${i + 1}`;
        yearOptions.push(
            <option key={i} value={i}>
                {schoolYearLabel}
            </option>
        );
    }

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedSem, setSelectedSem] = useState(semOptions[0] || "");

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
        // Same logic as the Export button inside the Learning Plan page:
        // fetch the complete syllabus from the server by offering + revision.
        const pcId = getOfferingID(row)
        const revNum = (row.ProgramCourseOffering || {}).revision_number || 1
        const code = getCode(row)
        const logoUrl = new URL(unclogo, window.location.origin).href
        const file = await buildSyllabusExportFile({ pcId, revNum, code, workflow: null, logoUrl })
        setExportFile({
          ...file,
          instructor_name: file.instructor_name !== '—' ? file.instructor_name : (row.instructor || '—'),
          course_name: file.course_name || getName(row),
          submission_date: file.submission_date || row.date_submitted || null,
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

    const computeOverallStatus = (row) => {
        const logs = row.logs || [];
        const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;

        if (latestLog && latestLog.action_type === 'RETURNED') {
            return 'Returned';
        }

        if (latestLog && latestLog.action_type === 'ACCEPTED' && latestLog.actor_role === 'DEAN') {
            return 'Approved';
        }

        const hasBeenSubmitted =
            row.date_submitted !== null ||
            logs.some(log => log.action_type === 'SUBMITTED' || log.action_type === 'ACCEPTED');

        if (hasBeenSubmitted) {
            return 'Pending';
        }

        return 'Draft';
    };

    const buildApproverStatus = (row) => {
        const logs = row.logs || [];

        const getLatestActionForRole = (roleKey) => {
            const roleLogs = logs.filter(l => l.actor_role === roleKey);
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

    const getCode = (row) => {
        const pco = row.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return course.course_no || course.code || course.course_id || pco.course_id || row.pc_offering_id || row.code || '-';
    };

    const getOfferingID = (row) => {
        return (row.ProgramCourseOffering || {}).pc_offering_id || row.pc_offering_id || row.offering_id;
    };

    const getName = (row) => {
        const pco = row.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return course.course_title || course.title || course.name || pco.course_description || row.name || '-';
    };

    async function loadAssignments() {
        setLoading(true);
        try {
            const data = await fetchJson('/api/assignments');
            const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
            setAssignments(rows);
        } catch (err) {
            console.error("Error loading assignments:", err);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }

    const filteredRows = (() => {
        const rows = assignments.filter(row => computeOverallStatus(row).toUpperCase() === selectedStatus);
        if (selectedStatus !== 'APPROVED') return rows;
        // Approved tab: show only the LATEST revision per course (older approved
        // revisions live in the Revisions page) — matches the instructor's table.
        const byCourse = new Map();
        rows.forEach(r => {
            const key = getCode(r);
            const rev = (r.ProgramCourseOffering || {}).revision_number || 1;
            const prev = byCourse.get(key);
            const prevRev = prev ? ((prev.ProgramCourseOffering || {}).revision_number || 1) : -1;
            if (rev > prevRev) byCourse.set(key, r);
        });
        return [...byCourse.values()];
    })();

    const getStatusCount = (statusName) => assignments.filter(row => computeOverallStatus(row).toUpperCase() === statusName).length;

    const openPopup = (row, e) => {
        const rect = e?.currentTarget?.getBoundingClientRect();
        const logs = row.logs || [];

        const submissionLogs = logs.filter(l => l.action_type === 'SUBMITTED')
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const submittedAt = submissionLogs.length > 0 ? submissionLogs[0].createdAt : row.date_submitted;
        const approverStatuses = buildApproverStatus(row);

        const popupH = 280;
        const top = rect ? (rect.bottom + 4 + popupH > window.innerHeight ? rect.top - popupH - 4 : rect.bottom + 4) : 80;
        setPopup({ open: true, data: { submittedAt, approverStatuses }, pos: rect ? { right: window.innerWidth - rect.right, top } : null });
    };

    const closePopup = () => setPopup({ open: false, data: null, pos: null });

    const getCourseLink = (row) => {
        const base = `/role/${role}/courses/${encodeURIComponent(getCode(row))}`;
        const offeringId = getOfferingID(row);
        const revNum = (row.ProgramCourseOffering || {}).revision_number || 1;
        return `${base}?status=${computeOverallStatus(row).toLowerCase()}&fromStatus=${selectedStatus.toLowerCase()}&pcId=${offeringId}&revNum=${revNum}`;
    };

    const DetailsPopup = ({ data, onClose, pos }) => {
        if (!data) return null;
        const { submittedAt, approverStatuses } = data;
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

                        {approverStatuses.map((a, idx) => {
                            const doneLabel = a.title === 'Dean' ? 'Approved' : 'Accepted';
                            return (
                            <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <div style={{ fontWeight: 600, color: '#666' }}>{a.title}</div>
                                </div>
                                {a.status === 'Accepted' && a.acceptedAt ? <div style={{ fontSize: 13, color: '#666' }}><strong>{doneLabel} at:</strong> {new Date(a.acceptedAt).toLocaleString()}</div> : null}
                                {a.status === 'Accepted' && !a.acceptedAt ? <div style={{ fontSize: 13, color: '#047857' }}>{doneLabel}</div> : null}
                                {a.status === 'Returned' && a.returnedAt ? <div style={{ fontSize: 13, color: '#666' }}><strong>Returned at:</strong> {new Date(a.returnedAt).toLocaleString()}</div> : null}
                                {a.status === 'Pending' ? <div style={{ fontSize: 13, color: '#666' }}>Pending</div> : null}
                            </div>
                            );
                        })}
                    </div>
                </div>
            </>
        );
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

    return (
        <div className={styles['courses-table']}>
            <div className={styles.header}>
                <h2>ASSIGNED COURSE OFFERINGS</h2>

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
                            <th width={350} style={{textAlign:'center'}}>COURSE NAME</th>
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
                                <td width={350}>{getName(row)}</td>
                                {selectedStatus === 'APPROVED' && <td width={200}>{formatDate(row.date_approved)}</td>}
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
                            const overallStatus = computeOverallStatus(row);
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
