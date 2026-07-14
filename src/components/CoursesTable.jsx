import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Edit, XCircle, HelpCircle, Download, MoreVertical } from 'react-feather';
import { fetchJson } from "../utils/api.js";
import { getWorkflow } from "../utils/workflowHelpers.js";
import { getSyllabi } from "../utils/dataStore.js";
import { buildSyllabusHtml } from "../utils/syllabusPdfHtml.js";
import PDFViewerModal from './PDFViewerModal.jsx';
import unclogo from '../assets/unclogo.png';

// --- Custom Date Formatters to Ensure Global Consistency (mirrors composition client) ---
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

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const timePart = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    return `${datePart} ${timePart}`;
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
    const [selectedSem, setSelectedSem] = useState(semOptions[0] || "");

    const statusesOptions = ["DRAFT", "PENDING", "RETURNED", "APPROVED"];
    const [statuses, setStatuses] = useState(statusesOptions);

    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedStatus, setSelectedStatus] = useState(() => {
        const fromUrl = searchParams.get('status');
        if (fromUrl && statusesOptions.some(s => s.toLowerCase() === fromUrl.toLowerCase())) {
            return fromUrl.toUpperCase();
        }
        return 'DRAFT';
    });

    // Year drives which status tabs are available (past years only show APPROVED)
    useEffect(() => {
        if (String(selectedYear) !== String(currentYear)) {
            setStatuses(["APPROVED"]);
            setSelectedStatus("APPROVED");
        } else {
            setStatuses(statusesOptions);
            setSelectedStatus(prev => (statusesOptions.includes(prev) ? prev : "DRAFT"));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear, currentYear]);

    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ open: false, data: null });
    const [exportFile, setExportFile] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [menuOpenIndex, setMenuOpenIndex] = useState(null);

    useEffect(() => {
        loadAssignments();
    }, []);

    const updateStatus = (status) => {
        setSelectedStatus(status);
        setSearchParams({ status: status.toLowerCase() });
    };
    const handleStatusChange = (e) => updateStatus(e.target.value);

    // === LOGIC RETAINED: static seed rows (mirrors the composition demo assignments) ===
    // Each row's date fields drive computeOverallStatus (Draft / Pending / Returned / Approved).
    const makeRow = ({ code, title, assigned, submitted = null, updated = null, approved = null, accepts = {}, returns = {} }) => ({
        date_assigned: assigned,
        date_submitted: submitted,
        date_updated: updated,
        date_approved: approved,
        ic_date_accepted: accepts.ic || null,
        ld_date_accepted: accepts.ld || null,
        ph_date_accepted: accepts.ph || null,
        d_date_accepted: accepts.d || null,
        ic_date_returned: returns.ic || null,
        ld_date_returned: returns.ld || null,
        ph_date_returned: returns.ph || null,
        d_date_returned: returns.d || null,
        ProgramCourseOffering: { Course: { course_no: code, course_title: title } },
    });

    const mapStaticToRows = () => ([
        // DRAFT
        makeRow({ code: 'BIT313L', title: 'Human and Computer Interaction', assigned: '2026-07-13T15:40:45.000Z' }),
        makeRow({ code: 'BIT312L', title: 'Integrative Programming and Technologies', assigned: '2026-06-01T00:00:00.000Z' }),
        // PENDING (submitted, awaiting review)
        makeRow({ code: 'BIT321L', title: 'System Integration & Architecture', assigned: '2026-06-01T00:00:00.000Z', submitted: '2026-06-15T00:00:00.000Z' }),
        // RETURNED (industry consultant returned)
        makeRow({ code: 'BIT311L', title: 'Platform Technologies', assigned: '2026-06-01T00:00:00.000Z', submitted: '2026-06-10T00:00:00.000Z', returns: { ic: '2026-06-15T02:15:00.000Z' } }),
        makeRow({ code: 'MATH311L', title: 'Statistics', assigned: '2026-06-01T00:00:00.000Z', submitted: '2026-06-10T00:00:00.000Z', returns: { ic: '2026-06-15T02:15:00.000Z' } }),
        // APPROVED (all approvers accepted incl. Dean)
        makeRow({ code: 'BIT213L', title: 'Object-Oriented Programming', assigned: '2026-06-01T00:00:00.000Z', submitted: '2026-06-12T02:00:00.000Z', updated: '2026-06-22T01:00:00.000Z', approved: '2026-06-28T07:00:00.000Z', accepts: { ic: '2026-06-24T05:00:00.000Z', ld: '2026-06-23T02:00:00.000Z', ph: '2026-06-25T01:45:00.000Z', d: '2026-06-28T07:00:00.000Z' } }),
        makeRow({ code: 'BIT213L', title: 'Object-Oriented Programming', assigned: '2025-06-01T01:00:00.000Z', submitted: '2025-06-15T02:00:00.000Z', updated: '2025-06-25T01:00:00.000Z', approved: '2025-07-02T07:00:00.000Z', accepts: { ic: '2025-06-27T05:00:00.000Z', ld: '2025-06-26T02:00:00.000Z', ph: '2025-06-28T01:45:00.000Z', d: '2025-07-02T07:00:00.000Z' } }),
    ]);

    async function loadAssignments() {
        // Show static data immediately so the table is never stuck on "Loading…"
        setAssignments(mapStaticToRows());
        setLoading(true);
        try {
            const data = await fetchJson('/api/assignments', { timeout: 6000 });
            const rows = Array.isArray(data) ? data : (data.data || data.rows || []);
            if (Array.isArray(rows) && rows.length > 0) setAssignments(rows);
        } catch (err) {
            console.warn("API unavailable, using static syllabiData as fallback");
            // static rows already set above
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

    // RETAINED: PDF/HTML export of an approved learning plan (official UNC form)
    const handlePreview = (row) => {
        try {
            setExporting(true);
            const code = getCode(row);
            const syllabus = (getSyllabi() || []).find(s => s.code === code);
            if (!syllabus) { alert('Syllabus data not found for ' + code); setExporting(false); return; }
            const workflow = getWorkflow(code);
            const logoUrl = new URL(unclogo, window.location.origin).href;
            const html = buildSyllabusHtml(syllabus, code, workflow, logoUrl);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            setExportFile({
                file_url: url,
                file_name: `Syllabus_${code}.html`,
                instructor_name: row.instructor || '—',
                course_id: code,
                course_name: getName(row),
                submission_date: row.date_submitted || workflow?.submittedAt || '',
                period_label: row.period || '',
            });
        } catch (err) {
            console.warn('Preview generation failed:', err);
            alert('Failed to generate preview: ' + (err?.message || err));
        } finally {
            setExporting(false);
        }
    };

    const closeExportModal = () => {
        if (exportFile?.file_url?.startsWith('blob:')) URL.revokeObjectURL(exportFile.file_url);
        setExportFile(null);
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

    // Build the approver list for the details popup from the local workflow state
    const buildApproverStatuses = (code) => {
        const wf = getWorkflow(code || '');
        const mapNode = (node) => {
            const s = node?.status;
            if (s === 'done') return { status: 'Accepted', acceptedAt: node.completedAt };
            if (s === 'returned') return { status: 'Returned', returnedAt: node.completedAt };
            return { status: 'Pending' };
        };
        return [
            { title: 'Industry Consultant', ...mapNode(wf.parallelReview?.industry_consultant) },
            { title: 'Library Director', ...mapNode(wf.parallelReview?.library_director) },
            { title: 'Program Head', ...mapNode(wf.programHead) },
            { title: 'Dean', ...mapNode(wf.dean) },
        ];
    };

    const openPopup = (row) => {
        const code = getCode(row);
        const wf = getWorkflow(code || '');
        setPopup({
            open: true,
            data: {
                submittedAt: wf.submittedAt || row.date_submitted || null,
                approverStatuses: buildApproverStatuses(code),
            }
        });
    };

    const closePopup = () => setPopup({ open: false, data: null });

    // Approved date derived from the local workflow (Dean completion)
    const getApprovedDate = (row) => {
        return row.date_approved || getWorkflow(getCode(row) || '')?.dean?.completedAt || null;
    };

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
                <h2>ASSIGNED COURSES</h2>
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
                {loading && assignments.length === 0 && <div>Loading...</div>}

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
                                {selectedStatus === 'APPROVED' && <td width={200}>{formatDate(getApprovedDate(row))}</td>}
                                <td className={styles.fill}>
                                    {selectedStatus === 'APPROVED' ? (
                                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                                            <button
                                                onClick={() => setMenuOpenIndex(menuOpenIndex === index ? null : index)}
                                                className={styles.info}
                                                aria-label="Actions"
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569', display: 'inline-flex', alignItems: 'center', padding: 4 }}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            {menuOpenIndex === index && (
                                                <>
                                                    <div onClick={() => setMenuOpenIndex(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                                                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 41, minWidth: 150, overflow: 'hidden' }}>
                                                        <Link
                                                            to={`/courses/${getCode(row)}/${selectedStatus.toLowerCase()}`}
                                                            className={'actionLink'}
                                                            onClick={() => setMenuOpenIndex(null)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 14, color: '#334155' }}
                                                        >
                                                            <ChevronRight size={16} /> View
                                                        </Link>
                                                        <div style={{ height: 1, background: '#e2e8f0' }} />
                                                        <button
                                                            onClick={() => { setMenuOpenIndex(null); if (!exporting) handlePreview(row); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 14, width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: '#334155', textAlign: 'left' }}
                                                        >
                                                            <Download size={16} /> {exporting ? 'Exporting…' : 'Export'}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <Link
                                                className={'actionLink'}
                                                to={`/courses/${getCode(row)}/${selectedStatus.toLowerCase()}`}
                                            >
                                                Compose
                                                <ChevronRight size={18} />
                                            </Link>
                                        </div>
                                    )}
                                </td>
                                <td></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                }

                {/* PENDING and RETURNED TABLE */}
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
                                                      to={`/courses/${getCode(row)}/${selectedStatus.toLowerCase()}`}
                                                >
                                                    Update<Edit size={16} />
                                                </Link>
                                            ) : (
                                                <Link className={'actionLink'}
                                                      to={`/courses/${getCode(row)}/${selectedStatus.toLowerCase()}`}
                                                >
                                                    View <ChevronRight size={16} />
                                                </Link>
                                            )}
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

export default CoursesTable;
