import Select from './Select.jsx'
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, XCircle, Download, Clock, RotateCcw, CheckCircle } from 'react-feather';
import SortableTh from './SortableTh.jsx';
import { sortRows, nextSort } from '../utils/tableSort.js';
import { fetchJson } from "../utils/api.js";
import { buildSyllabusExportFile } from "../utils/exportSyllabus.js";
import { revisionOf } from "../utils/offeringKey.js";
import PDFViewerModal from "./PDFViewerModal.jsx";
import EmptyState from "./EmptyState.jsx";
import Spinner from "./Spinner.jsx";
import { loadReviewAssignments } from '../utils/reviewAssignments.js';
import unclogo from '../assets/unclogo.png';
import TableScrollRegion from './TableScrollRegion.jsx';
import { usePageSearch, matchesSearch } from '../utils/pageSearch.js';
import PageSearch from './PageSearch.jsx';
import NotSubmittedPanel from './NotSubmittedPanel.jsx';
import { Loading, TableSkeleton } from './LoadingSkeleton.jsx';
import { buildApproverStatus, canExportRow, computeOverallStatus } from '../utils/assignmentStatus.js';
import { filterAssignmentsByCourse, readAssignedCourseFilters } from '../utils/referenceCourseNavigation.js';

const EXPORT_ROLES = ['dean', 'vpaa', 'instructor', 'program-head', 'director-of-libraries'];

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[0];
};

// Where a plan stands, in the row: a short line and one bar segment per approver in review order (Library
// Director, Program Head, Dean). Green = accepted, yellow = waiting on that person now, red = returned, grey =
// not their turn yet. Hovering a segment
// gives the name and the date, so the old details window is not needed.
const SEG_CLASS = { Accepted: 'segDone', Returned: 'segReturned', Pending: 'segPending', Waiting: 'segWaiting' };
const ApprovalProgress = ({ row }) => {
    // Under review: the Director and the Program Head work in parallel, then the Dean. Whoever is next is "waiting".
    const under = computeOverallStatus(row) === 'Pending';
    const base = buildApproverStatus(row);
    const firstTwoDone = base.slice(0, 2).every(step => step.status === 'Accepted');
    const steps = base.map((step, i) => (under && step.status === 'Pending' && (i < 2 || firstTwoDone) ? { ...step, status: 'Waiting' } : step));
    const done = steps.filter(step => step.status === 'Accepted').length;
    const returned = steps.find(step => step.status === 'Returned');
    const label = done === steps.length ? 'Approved' : returned ? `Returned by ${returned.title}` : `${done} of ${steps.length} approved`;
    const when = (step) => {
        const at = step.status === 'Accepted' ? step.acceptedAt : step.status === 'Returned' ? step.returnedAt : null;
        return at ? ` · ${new Date(at).toLocaleString()}` : '';
    };
    return (
        <div className={styles.progress}>
            <div className={styles.progressLabel}>{label}</div>
            <div className={styles.progressBar} role="img" aria-label={`${label}: ${steps.map(step => `${step.title} ${step.status.toLowerCase()}`).join(', ')}`}>
                {steps.map(step => (
                    <span key={step.title} className={`${styles.seg} ${styles[SEG_CLASS[step.status]]}`} title={`${step.title}: ${step.status}${when(step)}`} />
                ))}
            </div>
        </div>
    );
};

const ApprovalCoursesTable = ({ role = 'approver', styleHooks = {} }) => {
    // The school year starts in June, so from January to May the current one began last calendar year.
    const today = new Date();
    const currentYear = today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1;
    const startYear = currentYear - 8;
    const semOptions = ['1st Sem', '2nd Sem'];
    const [searchParams, setSearchParams] = useSearchParams();
    const linkedCourseFilters = readAssignedCourseFilters(searchParams, currentYear);
    const targetCourse = linkedCourseFilters.course;
    const yearOptions = [];
    // One school year ahead is listed too: a carried-over plan can already be in next year's list.
    for (let i = currentYear + 1; i >= startYear; i--) {
        const schoolYearLabel = `${i} - ${i + 1}`;
        yearOptions.push(
            <option key={i} value={i}>
                {schoolYearLabel}
            </option>
        );
    }

    const query = usePageSearch('Search course code or title');
    const [selectedYear, setSelectedYear] = useState(linkedCourseFilters.year);
    const [selectedSem, setSelectedSem] = useState(linkedCourseFilters.semester);

    // The Program Head's list also has the plans still waiting on their instructor, as its fourth tab.
    const statuses = role === 'vpaa' ? ["APPROVED"] : role === 'program-head' ? ["PENDING", "RETURNED", "APPROVED", "NOT_SUBMITTED"] : ["PENDING", "RETURNED", "APPROVED"];
    const STATUS_LABEL = { NOT_SUBMITTED: 'Not submitted' };
    const statusLabel = (status) => STATUS_LABEL[status] || status.charAt(0) + status.slice(1).toLowerCase();

    const defaultStatus = role === 'vpaa' ? 'APPROVED' : 'PENDING';
    const [selectedStatus, setSelectedStatus] = useState(() => {
        if (role === 'program-head' && searchParams.get('status') === 'not-submitted') return 'NOT_SUBMITTED';
        if (statuses.includes(linkedCourseFilters.status)) {
            return linkedCourseFilters.status;
        }
        return defaultStatus;
    });
    const updateStatus = (status) => {
        setSelectedStatus(status);
        setSearchParams({ status: status.toLowerCase().replace('_', '-') }, { replace: true });
    };
    const [notSubmittedCount, setNotSubmittedCount] = useState(null);
    const notSubmitted = selectedStatus === 'NOT_SUBMITTED';
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    // Newest first is the useful default for an approver: the plan that just
    // arrived is the one they have not seen.
    const [sort, setSort] = useState({ sortKey: 'date_assigned', sortDir: 'desc' });
    // A column that is not the sort yet starts ascending, unless the list is already in that order: then it starts
    // descending, so the first click always visibly moves something. The same column flips on every click after.
    const onSort = (key) => setSort(current => {
        if (current.sortKey === key) return nextSort(current, key);
        const ascending = sortRows(filteredRows, COLUMNS, key, 'asc');
        const sameAsNow = ascending.every((row, i) => row === sortedRows[i]);
        return { sortKey: key, sortDir: sameAsNow ? 'desc' : 'asc' };
    });
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

    const rowsFor = (status) => {
        const rows = filterAssignmentsByCourse(assignments, targetCourse)
            .filter(row => computeOverallStatus(row).toUpperCase() === status);
        if (status !== 'APPROVED') return rows;
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
    };

    // What the table shows: the chosen tab, narrowed by what was typed in the top bar's search.
    const filteredRows = rowsFor(selectedStatus)
        .filter(row => matchesSearch(query, [getCode(row), getName(row)]));


    // The columns, described once. `sortValue` exists because the code and the
    // name are not plain fields — they are dug out of a nested
    // ProgramCourseOffering, so sorting on `row.code` would compare undefined
    // to undefined and appear to do nothing.
    const COLUMNS = [
        { key: 'date_assigned', label: 'DATE ASSIGNED', width: 170, type: 'date' },
        { key: 'code', label: 'CODE', width: 150, type: 'text', sortValue: (r) => getCode(r) },
        { key: 'name', label: 'COURSE NAME', width: 200, className: styles.growCol, type: 'text', sortValue: (r) => getName(r) },
        ...(selectedStatus === 'APPROVED'
            ? [{ key: 'date_approved', label: 'DATE APPROVED', width: 170, type: 'date' }]
            : []),
        { key: 'approval', label: 'APPROVAL', width: 190, sortable: false },
        { key: 'actions', label: 'ACTIONS', className: styles.actionsCol, sortable: false }
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
            <Link className={`actionLink ${styles.rowAction}`} to={getCourseLink(row)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                View <ChevronRight size={16} />
            </Link>

            {(selectedStatus === 'APPROVED' || canExportRow(row)) && EXPORT_ROLES.includes(role) &&
                <span className={`actionLink ${styles.rowAction}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: exporting ? 'wait' : 'pointer', color: '#6b7280' }}
                      onClick={() => !exporting && handleExport(row)}>
                    {exporting ? 'Exporting…' : 'Export'} <Download size={16} />
                </span>
            }

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
        if (query.trim()) {
            return <EmptyState colSpan={colSpan} icon={<Clock size={22} strokeWidth={1.6} />} title="No course matches your search" hint="Change the search in the top bar, or clear it to see the whole list." />;
        }
        const meta = EMPTY_BY_STATUS[selectedStatus] || EMPTY_BY_STATUS.PENDING;
        return <EmptyState colSpan={colSpan} icon={meta.icon} title={meta.title} hint={meta.hint} />;
    };

    const getCourseLink = (row) => {
        const base = `/role/${role}/courses/${encodeURIComponent(getCode(row))}`;
        const offeringId = getOfferingID(row);
        // A working copy has no revision number yet, so it is addressed by its offering id alone.
        const revNum = revisionOf((row.ProgramCourseOffering || {}).revision_number);
        return `${base}?status=${computeOverallStatus(row).toLowerCase()}&fromStatus=${selectedStatus.toLowerCase()}&pcId=${offeringId}${revNum ? `&revNum=${revNum}` : ''}`;
    };


    return (
        <div className={`${styles['courses-table']} ${styleHooks.root || ''}`.trim()}>
            <div className={`${styles.header} ${styleHooks.header || ''}`.trim()}>
                <div className={styles.titleRow}>
                    <h2 className="app-page-title">{role === 'vpaa' ? 'Approved Learning Plans' : 'Assigned Course Offerings'}</h2>
                    {role !== 'vpaa' && (
                    <div className={styles['filter-container']}>
                        <div className={styles.pillTabs}>
                            {statuses.map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    className={`${styles.pillTab} ${selectedStatus === status ? styles.pillTabActive : ''}`}
                                    onClick={() => updateStatus(status)}
                                    aria-pressed={selectedStatus === status}
                                >
                                    {statusLabel(status)}
                                    {status === 'NOT_SUBMITTED'
                                        ? (notSubmittedCount !== null && <span className={styles.pillCount}>{notSubmittedCount}</span>)
                                        : (!loading && <span className={styles.pillCount}>{rowsFor(status).length}</span>)}
                                </button>
                            ))}
                        </div>
                    </div>
                    )}
                </div>

                <div className={`${styles.filterA} app-filter-bar ${styleHooks.filters || ''}`.trim()}>
                    <PageSearch />
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {yearOptions}
                    </Select>
                    <Select
                      value={selectedSem}
                      onChange={(e) => setSelectedSem(e.target.value)}
                    >
                        {semOptions.map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                        ))}
                    </Select>
                </div>

            </div>

            {!notSubmitted && <TableScrollRegion
                label="Assigned Course Offerings"
                minWidth={900}
                className={`${styles['table-container']}`}
            >
                {/* While loading, show ONLY the spinner. Rendering it above the
                    table meant the empty state ("No learning plans waiting for
                    you") was on screen at the same time as "Loading…", which
                    tells the reader two contradictory things. */}
                {loading && <Loading label="Loading course offerings…"><TableSkeleton rows={6} cols={[200, 150, '1fr', 190, 210]} /></Loading>}

                {!loading && loadError && (
                    <EmptyState
                        icon={<XCircle size={22} strokeWidth={1.6} />}
                        title="Could not load assigned course offerings"
                        hint="The course list could not be loaded. Try again; no sample records have been substituted for your assignments."
                        action={<button type="button" className="btn btn-secondary btn-sm" onClick={loadAssignments}>Try again</button>}
                    />
                )}

                {!loading && !loadError && selectedStatus === 'APPROVED' &&
                    <table className={styles.truncate}>
                        <thead>
                        <tr>
                            {COLUMNS.map(col => (
                                <SortableTh key={col.key} col={col} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={onSort} fill />
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {sortedRows.map((row, index) => (
                            <tr key={index}>
                                <td width={170}>{formatDate(row.date_assigned)}</td>
                                <td width={150} title={getCode(row)}><span>{getCode(row)}</span></td>
                                {/* The <span> is what makes the ellipsis appear
                                    (see .truncate), and `title` is not
                                    decoration: the cell clips now, so this is
                                    the only way to read a long name in full. */}
                                <td width={200} className={styles.growCol} title={getName(row)}><span>{getName(row)}</span></td>
                                <td width={170}>{formatDate(row.date_approved)}</td>
                                <td width={190}><ApprovalProgress row={row} /></td>
                                <td className={styles.actionsCol}>{rowActions(row)}</td>
                            </tr>
                        ))}
                        {!loading && sortedRows.length === 0 && emptyRow(6)}
                        </tbody>
                    </table>
                }

                {!loading && !loadError && (selectedStatus === 'PENDING' || selectedStatus === 'RETURNED') &&
                    <table className={styles.truncate}>
                        <thead>
                        <tr>
                            {COLUMNS.map(col => (
                                <SortableTh key={col.key} col={col} sortKey={sort.sortKey} sortDir={sort.sortDir} onSort={onSort} fill />
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {sortedRows.map((row, index) => (
                            <tr key={index}>
                                <td width={170}>{formatDate(row.date_assigned)}</td>
                                <td width={150} title={getCode(row)}><span>{getCode(row)}</span></td>
                                <td width={200} className={styles.growCol} title={getName(row)}><span>{getName(row)}</span></td>
                                <td width={190}><ApprovalProgress row={row} /></td>
                                <td className={styles.actionsCol}>{rowActions(row)}</td>
                            </tr>
                        ))}
                        {!loading && sortedRows.length === 0 && emptyRow(5)}
                        </tbody>
                    </table>
                }
            </TableScrollRegion>}

            {role === 'program-head' && (
                <NotSubmittedPanel
                    active={notSubmitted}
                    schoolYear={`${selectedYear}-${Number(selectedYear) + 1}`}
                    semester={String(selectedSem).startsWith('2') ? '2nd' : '1st'}
                    query={query}
                    onCount={setNotSubmittedCount}
                />
            )}


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
