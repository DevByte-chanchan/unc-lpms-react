import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, XCircle, Download, Clock, RotateCcw, CheckCircle, HelpCircle } from 'react-feather';
import SortableTh from './SortableTh.jsx';
import { sortRows, nextSort } from '../utils/tableSort.js';
import { fetchJson } from "../utils/api.js";
import { buildSyllabusExportFile } from "../utils/exportSyllabus.js";
import PDFViewerModal from "./PDFViewerModal.jsx";
import EmptyState from "./EmptyState.jsx";
import Spinner from "./Spinner.jsx";
import { loadReviewAssignments } from '../utils/reviewAssignments.js';
import unclogo from '../assets/unclogo.png';
import TableScrollRegion from './TableScrollRegion.jsx';
import { buildApproverStatus, canExportRow, computeOverallStatus, latestSubmissionAt } from '../utils/assignmentStatus.js';
import { filterAssignmentsByCourse, readAssignedCourseFilters } from '../utils/referenceCourseNavigation.js';

const EXPORT_ROLES = ['dean', 'vpaa', 'instructor', 'program-head', 'director-of-libraries'];

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[0];
};

const ApprovalCoursesTable = ({ role = 'approver', styleHooks = {} }) => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const [searchParams, setSearchParams] = useSearchParams();
    const linkedCourseFilters = readAssignedCourseFilters(searchParams, currentYear);
    const targetCourse = linkedCourseFilters.course;
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        const schoolYearLabel = `${i} - ${i + 1}`;
        yearOptions.push(
            <option key={i} value={i}>
                {schoolYearLabel}
            </option>
        );
    }

    const [selectedYear, setSelectedYear] = useState(linkedCourseFilters.year);
    const [selectedSem, setSelectedSem] = useState(linkedCourseFilters.semester);

    const statuses = role === 'vpaa' ? ["APPROVED"] : ["PENDING", "RETURNED", "APPROVED"];

    const defaultStatus = role === 'vpaa' ? 'APPROVED' : 'PENDING';
    const [selectedStatus, setSelectedStatus] = useState(() => {
        if (statuses.includes(linkedCourseFilters.status)) {
            return linkedCourseFilters.status;
        }
        return defaultStatus;
    });
    const updateStatus = (status) => {
        setSelectedStatus(status);
        setSearchParams({ status: status.toLowerCase() }, { replace: true });
    };
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    // Newest first is the useful default for an approver: the plan that just
    // arrived is the one they have not seen.
    const [sort, setSort] = useState({ sortKey: 'date_assigned', sortDir: 'desc' });
    const onSort = (key) => setSort(current => nextSort(current, key));
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

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const rows = await loadReviewAssignments(fetchJson, selectedYear, selectedSem);
            setAssignments(rows);
        } catch (err) {
            console.error("Error loading assignments:", err);
            setAssignments([]);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedSem]);

    // Fetch data whenever Year or Semester changes
    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

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

    const filteredRows = (() => {
        const rows = filterAssignmentsByCourse(assignments, targetCourse)
            .filter(row => computeOverallStatus(row).toUpperCase() === selectedStatus);
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

    // The columns, described once. `sortValue` exists because the code and the
    // name are not plain fields — they are dug out of a nested
    // ProgramCourseOffering, so sorting on `row.code` would compare undefined
    // to undefined and appear to do nothing.
    const COLUMNS = [
        { key: 'date_assigned', label: 'DATE ASSIGNED', width: 200, type: 'date' },
        { key: 'code', label: 'CODE', width: 150, type: 'text', sortValue: (r) => getCode(r) },
        { key: 'name', label: 'COURSE NAME', width: 350, type: 'text', sortValue: (r) => getName(r) },
        ...(selectedStatus === 'APPROVED'
            ? [{ key: 'date_approved', label: 'DATE APPROVED', width: 200, type: 'date' }]
            : []),
        { key: 'actions', label: 'ACTIONS', className: styles.fill, sortable: false }
    ];

    const sortedRows = sortRows(filteredRows, COLUMNS, sort.sortKey, sort.sortDir);

    // THE ROW'S ACTIONS, IN THE ROW.
    //
    // These used to be a kebab menu whose entire contents were one item,
    // "Approval details" — two clicks and a popup to reach one popup. The
    // instructor's table has always shown the same thing as a question mark
    // you click once, so this now matches it: View, Export where the role has
    // it, and the details behind the (?).
    //
    // View stays a real <Link>: an approver opening three plans in three tabs
    // is the normal way to use this screen, and a button that calls navigate()
    // cannot be middle-clicked or copied.
    const rowActions = (row) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className={'actionLink'} to={getCourseLink(row)}
                  style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                View <ChevronRight size={16} />
            </Link>

            {(selectedStatus === 'APPROVED' || canExportRow(row)) && EXPORT_ROLES.includes(role) &&
                <span className="actionLink"
                      style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: exporting ? 'wait' : 'pointer', color: '#6b7280' }}
                      onClick={() => !exporting && handleExport(row)}>
                    {exporting ? 'Exporting…' : 'Export'} <Download size={16} />
                </span>
            }

            {/* `title` and `aria-label` both: the icon alone says nothing to a
                screen reader, and nothing on hover either. */}
            <button type="button" className={styles.info} title="Approval details"
                    aria-label="Approval details"
                    onClick={(e) => openPopup(row, e)}>
                <HelpCircle opacity={.8} size={18} />
            </button>
        </div>
    );

    // What each tab says when it has no rows. A blank table cannot be told
    // apart from a broken one, so every tab states which list is empty and why
    // that is a normal thing to see.
    const EMPTY_BY_STATUS = {
        PENDING: {
            icon: <Clock size={22} strokeWidth={1.6} />,
            title: 'No learning plans waiting for you',
            hint: 'Plans appear here once an instructor submits them for review.\nNothing is pending for this term and semester.'
        },
        RETURNED: {
            icon: <RotateCcw size={22} strokeWidth={1.6} />,
            title: 'Nothing has been returned',
            hint: 'A plan lands here when a reviewer sends it back to the instructor with comments.'
        },
        APPROVED: {
            icon: <CheckCircle size={22} strokeWidth={1.6} />,
            title: 'No approved learning plans yet',
            hint: 'A plan shows here once the Dean has given the final approval.'
        }
    };

    const emptyRow = (colSpan) => {
        if (targetCourse) {
            return (
                <EmptyState
                    colSpan={colSpan}
                    icon={<Clock size={22} strokeWidth={1.6} />}
                    title={`${targetCourse} is not available in this view`}
                    hint="Its review status or academic term may have changed. Return to the Reference Library and open the course again."
                />
            );
        }
        const meta = EMPTY_BY_STATUS[selectedStatus] || EMPTY_BY_STATUS.PENDING;
        return <EmptyState colSpan={colSpan} icon={meta.icon} title={meta.title} hint={meta.hint} />;
    };

    // `anchor` is normally the click event on the (?) button; a bare DOMRect is
    // still accepted so a caller that has already dismissed its own UI (and so
    // has no event left to pass) can say where the popup should point.
    const openPopup = (row, anchor) => {
        const rect = typeof anchor?.currentTarget?.getBoundingClientRect === 'function'
            ? anchor.currentTarget.getBoundingClientRect()
            : (typeof anchor?.bottom === 'number' ? anchor : null);
        const submittedAt = latestSubmissionAt(row);
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
                <div className={styles.detailsPopup} style={{
                    '--details-popup-right': pos ? `${pos.right}px` : undefined,
                    '--details-popup-top': pos ? `${pos.top}px` : undefined,
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                    padding: 12
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <strong style={{ color: '#666' }}>View details</strong>
                        <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close details">
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

    return (
        <div className={`${styles['courses-table']} ${styleHooks.root || ''}`.trim()}>
            <div className={`${styles.header} ${styleHooks.header || ''}`.trim()}>
                <h2>ASSIGNED COURSE OFFERINGS</h2>

                <div className={`${styles.filterA} ${styleHooks.filters || ''}`.trim()}>
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
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    className={`${styles['control-item']} ${selectedStatus === status ? styles['active'] : ''}`}
                                    onClick={() => updateStatus(status)}
                                    aria-pressed={selectedStatus === status}
                                >
                                    {status.charAt(0) + status.slice(1).toLowerCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>
                )}
            </div>

            <TableScrollRegion
                label="Assigned course offerings"
                minWidth={900}
                className={styles['table-container']}
            >
                {/* While loading, show ONLY the spinner. Rendering it above the
                    table meant the empty state ("No learning plans waiting for
                    you") was on screen at the same time as "Loading…", which
                    tells the reader two contradictory things. */}
                {loading && <Spinner label="Loading course offerings…" />}

                {!loading && loadError && (
                    <EmptyState
                        icon={<XCircle size={22} strokeWidth={1.6} />}
                        title="Could not load assigned course offerings"
                        hint="The course list could not be loaded. Try again; no sample records have been substituted for your assignments."
                        action={<button type="button" className={styles.retryButton} onClick={loadAssignments}>Try again</button>}
                    />
                )}

                {!loading && !loadError && selectedStatus === 'APPROVED' &&
                    <table className={styles.truncate}>
                        <thead>
                        <tr>
                            {COLUMNS.map(col => (
                                <SortableTh key={col.key} col={col} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={onSort} />
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {sortedRows.map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{formatDate(row.date_assigned)}</td>
                                <td width={150} title={getCode(row)}><span>{getCode(row)}</span></td>
                                {/* The <span> is what makes the ellipsis appear
                                    (see .truncate), and `title` is not
                                    decoration: the cell clips now, so this is
                                    the only way to read a long name in full. */}
                                <td width={350} title={getName(row)}><span>{getName(row)}</span></td>
                                <td width={200}>{formatDate(row.date_approved)}</td>
                                <td className={styles.fill}>{rowActions(row)}</td>
                            </tr>
                        ))}
                        {!loading && sortedRows.length === 0 && emptyRow(5)}
                        </tbody>
                    </table>
                }

                {!loading && !loadError && (selectedStatus === 'PENDING' || selectedStatus === 'RETURNED') &&
                    <table className={styles.truncate}>
                        <thead>
                        <tr>
                            {COLUMNS.map(col => (
                                <SortableTh key={col.key} col={col} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={onSort} />
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {sortedRows.map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{formatDate(row.date_assigned)}</td>
                                <td width={150} title={getCode(row)}><span>{getCode(row)}</span></td>
                                <td width={350} title={getName(row)}><span>{getName(row)}</span></td>
                                <td className={styles.fill}>{rowActions(row)}</td>
                            </tr>
                        ))}
                        {!loading && sortedRows.length === 0 && emptyRow(4)}
                        </tbody>
                    </table>
                }
            </TableScrollRegion>

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
