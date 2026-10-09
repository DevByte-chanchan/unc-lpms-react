import React, { useCallback, useEffect, useState } from 'react';
import { offeringPath } from '../utils/offeringKey.js'
import Spinner from './Spinner.jsx';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Edit, XCircle, HelpCircle, Download, FileText, Clock, RotateCcw, CheckCircle } from 'react-feather';
import EmptyState from './EmptyState.jsx';
import { fetchJson, apiErrorMessage } from "../utils/api.js";
import { revisionLabel } from '../utils/offeringLabels.js';
import { buildSyllabusExportFile } from "../utils/exportSyllabus.js";
import PDFViewerModal from "./PDFViewerModal.jsx";
import unclogo from '../assets/unclogo.png';
import TableScrollRegion from './TableScrollRegion.jsx';
import SortableTh from './SortableTh.jsx';
import { instructorCourseColumns, nextSort, sortRows } from '../utils/tableSort.js';
import { buildApproverStatus, canExportRow, computeOverallStatus, latestSubmissionAt } from '../utils/assignmentStatus.js';

const SEM_OPTIONS = ['1st Sem', '2nd Sem'];
const STATUS_OPTIONS = ["DRAFT", "PENDING", "RETURNED", "APPROVED"];

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
    const [searchParams, setSearchParams] = useSearchParams();
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
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
    const [selectedSem, setSelectedSem] = useState(SEM_OPTIONS[0]);

    const [statuses, setStatuses] = useState(STATUS_OPTIONS);
    const urlStatus = searchParams.get('status');
    const [selectedStatus, setSelectedStatus] = useState(() => {
        if (urlStatus) {
            const found = STATUS_OPTIONS.find(s => s.toLowerCase() === urlStatus.toLowerCase());
            if (found) return found;
        }
        return 'DRAFT';
    });

    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ open: false, data: null });
    const [sort, setSort] = useState({ sortKey: 'date_assigned', sortDir: 'desc' });

    // Handle Status Constraints based on Year Selection
    useEffect(() => {
        if (String(selectedYear) !== String(currentYear)) {
            setStatuses(["APPROVED"]);
            setSelectedStatus("APPROVED");
        } else {
            setStatuses(STATUS_OPTIONS);
            if (!urlStatus) setSelectedStatus("DRAFT");
        }
    }, [selectedYear, currentYear, urlStatus]);

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        try {
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
    }, [selectedYear, selectedSem]);

    // Fetch data whenever Year or Semester changes
    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    const handleStatusChange = (e) => {
        const val = e.target.value;
        setSelectedStatus(val);
        setSearchParams({ status: val.toLowerCase() }, { replace: true });
    };

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

    // ── Row Export (same output as the Export inside the Learning Plan page) ──
    const [exportFile, setExportFile] = useState(null);
    const [exporting, setExporting] = useState(false);
    const closeExportModal = () => {
        if (exportFile) URL.revokeObjectURL(exportFile.file_url);
        setExportFile(null);
    };
    // The lead instructor starts a revision from an approved (or carried-over) syllabus: a working copy
    // with no revision number yet. The server enforces one working copy at a time and one new approved
    // revision per term, and says so if either rule stops it.
    const navigate = useNavigate();
    const [startingId, setStartingId] = useState(null);
    const startRevision = async (row) => {
        setStartingId(getOfferingID(row));
        try {
            const result = await fetchJson(`/api/offerings/${getOfferingID(row)}/start-revision`, { method: 'POST' });
            navigate(offeringPath(result.offeringId, null, 'draft'));
        } catch (error) {
            alert(apiErrorMessage(error, 'Could not start a revision.'));
        } finally {
            setStartingId(null);
        }
    };

    const handleExport = async (row) => {
        try {
            setExporting(true);
            const logoUrl = new URL(unclogo, window.location.origin).href;
            const file = await buildSyllabusExportFile({
                pcId: getOfferingID(row),
                revNum: getRevNum(row),
                code: getCode(row),
                workflow: null,
                logoUrl,
            });
            setExportFile({
                ...file,
                course_name: file.course_name || getName(row),
                submission_date: file.submission_date || row.date_submitted || null,
            });
        } catch (err) {
            console.warn('Export failed:', err);
            alert('Export error: ' + (err?.message || err || 'unknown'));
        } finally {
            setExporting(false);
        }
    };

    const openPopup = (row) => {
        const submittedAt = latestSubmissionAt(row);
        const approverStatuses = buildApproverStatus(row);

        setPopup({ open: true, data: { submittedAt, approverStatuses } });
    };

    const closePopup = () => setPopup({ open: false, data: null });

    const filteredRows = assignments.filter(row => {
        const overall = computeOverallStatus(row);
        return overall.toUpperCase() === selectedStatus;
    });
    const columns = instructorCourseColumns({
        approved: selectedStatus === 'APPROVED',
        getCode,
        getName
    }).map(column => column.key === 'actions'
        ? { ...column, className: styles.fill }
        : column);
    const sortedRows = sortRows(filteredRows, columns, sort.sortKey, sort.sortDir);
    const handleSort = (key) => setSort(current => nextSort(current, key));

    // The instructor's own table was the one screen still showing a bare
    // column header with nothing under it when a tab was empty — the approver's
    // table has said which list is empty and why since the empty-state pass,
    // and an instructor looking at four blank tabs cannot tell "nothing
    // assigned" from "the backend is down".
    const EMPTY_BY_STATUS = {
        DRAFT: {
            icon: <FileText size={22} strokeWidth={1.6} />,
            title: 'No drafts to work on',
            hint: 'A learning plan appears here as soon as your Program Head assigns you a course offering for this term and semester.'
        },
        PENDING: {
            icon: <Clock size={22} strokeWidth={1.6} />,
            title: 'Nothing waiting for approval',
            hint: 'Plans you have submitted sit here until the Program Head, Library Director and Dean have reviewed them.'
        },
        RETURNED: {
            icon: <RotateCcw size={22} strokeWidth={1.6} />,
            title: 'Nothing has been returned to you',
            hint: 'If a reviewer sends a plan back with comments, it lands here so you can update and resubmit it.'
        },
        APPROVED: {
            icon: <CheckCircle size={22} strokeWidth={1.6} />,
            title: 'No approved learning plans yet',
            hint: 'A plan moves here once the Dean has given the final approval.'
        }
    };

    const emptyRow = (colSpan) => {
        const meta = EMPTY_BY_STATUS[selectedStatus] || EMPTY_BY_STATUS.DRAFT;
        return <EmptyState colSpan={colSpan} icon={meta.icon} title={meta.title} hint={meta.hint} />;
    };

    const DetailsPopup = ({ data, onClose }) => {
        if (!data) return null;
        const { submittedAt, approverStatuses } = data;
        return (
            <div className={styles.detailsPopup} style={{
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 6,
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                padding: 12
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>View details</strong>
                    <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close details">
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
                        {SEM_OPTIONS.map(sem => (
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

            <TableScrollRegion
                label="Assigned course offerings"
                minWidth={900}
                className={styles['table-container']}
            >
                {loading && <Spinner label="Loading course offerings…" />}

                {/* DRAFT and APPROVED TABLE.
                    `!loading` matters: without it the spinner and an empty
                    table are on screen together, which says two different
                    things at once. */}
                {!loading && (selectedStatus === 'DRAFT' || selectedStatus === 'APPROVED') &&
                    <table>
                        <thead>
                        <tr>
                            {columns.map(column => (
                                <SortableTh
                                    key={column.key}
                                    col={column}
                                    sortKey={sort.sortKey}
                                    sortDir={sort.sortDir}
                                    onSort={handleSort}
                                />
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {sortedRows.map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{formatDate(row.date_assigned)}</td>
                                <td width={150}>{getCode(row)}</td>
                                <td width={350}>{getName(row)}</td>
                                {selectedStatus === 'APPROVED' && <td width={200}>{formatDate(row.date_approved)}</td>}
                                <td className={styles.fill}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Link
                                            className={'actionLink'}
                                            to={offeringPath(getOfferingID(row), getRevNum(row), selectedStatus.toLowerCase())}
                                            state={{ fromStatus: selectedStatus.toLowerCase() }}
                                        >
                                            {selectedStatus === 'DRAFT' ? 'Compose' : 'View'}
                                            <ChevronRight size={18} />
                                        </Link>

                                        {(selectedStatus === 'APPROVED' || canExportRow(row)) &&
                                            <span
                                                className="actionLink"
                                                style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: exporting ? 'wait' : 'pointer', color: '#6b7280' }}
                                                onClick={() => !exporting && handleExport(row)}
                                            >
                                                {exporting ? '...' : 'Export'} <Download size={16} />
                                            </span>
                                        }

                                        {selectedStatus === 'APPROVED' &&
                                            <span style={{ fontSize: 12, color: '#374151' }}>{revisionLabel(row.ProgramCourseOffering)}</span>
                                        }

                                        {selectedStatus === 'APPROVED' &&
                                            <span
                                                className="actionLink"
                                                style={{ minWidth: 110, display: 'inline-flex', alignItems: 'center', cursor: startingId ? 'wait' : 'pointer' }}
                                                onClick={() => !startingId && startRevision(row)}
                                            >
                                                {startingId === getOfferingID(row) ? '...' : 'Start revision'}
                                            </span>
                                        }

                                        {selectedStatus === 'APPROVED' &&
                                            <button onClick={() => openPopup(row)} className={styles.info}>
                                                <HelpCircle size={18} />
                                            </button>
                                        }
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedRows.length === 0 && emptyRow(selectedStatus === 'APPROVED' ? 5 : 4)}
                        </tbody>
                    </table>
                }

                {/* PENDING and RETURNED TABLE (Status column completely removed) */}
                {!loading && (selectedStatus === 'PENDING' || selectedStatus === 'RETURNED') &&
                    <table>
                        <thead>
                        <tr>
                            {columns.map(column => (
                                <SortableTh
                                    key={column.key}
                                    col={column}
                                    sortKey={sort.sortKey}
                                    sortDir={sort.sortDir}
                                    onSort={handleSort}
                                />
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {sortedRows.map((row, index) => {
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
                                                      to={offeringPath(getOfferingID(row), getRevNum(row), selectedStatus.toLowerCase())}
                                                      state={{ fromStatus: selectedStatus.toLowerCase() }}
                                                >
                                                    Update<Edit size={16} />
                                                </Link>
                                            ) : (
                                                <Link className={'actionLink'}
                                                      to={offeringPath(getOfferingID(row), getRevNum(row), selectedStatus.toLowerCase())}
                                                      state={{ fromStatus: selectedStatus.toLowerCase() }}
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
                        {sortedRows.length === 0 && emptyRow(4)}
                        </tbody>
                    </table>
                }
            </TableScrollRegion>

            {popup.open && <DetailsPopup data={popup.data} onClose={closePopup} />}

            {exportFile && (
                <PDFViewerModal
                    file={exportFile}
                    kind="Syllabus Export"
                    onClose={closeExportModal}
                    onExport={(f) => {
                        if (f.file_url) {
                            const a = document.createElement('a');
                            a.href = f.file_url;
                            a.download = f.file_name || 'syllabus.html';
                            a.click();
                        }
                    }}
                />
            )}
        </div>
    );
};

export default CoursesTable;
