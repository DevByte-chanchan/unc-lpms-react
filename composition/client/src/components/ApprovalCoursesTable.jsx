import Select from './Select.jsx'
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, ChevronDown, ChevronUp, XCircle, HelpCircle, Download, Clock, RotateCcw, CheckCircle, Search, List, Grid } from 'react-feather';
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
import { usePageSearch, matchesSearch, setPageSearch } from '../utils/pageSearch.js';
import NotSubmittedPanel from './NotSubmittedPanel.jsx';
import ApprovalDetailsPopup from './ApprovalDetailsPopup.jsx';
import { Loading, TableSkeleton } from './LoadingSkeleton.jsx';
import { buildApproverStatus, canExportRow, computeOverallStatus, latestSubmissionAt } from '../utils/assignmentStatus.js';
import { filterAssignmentsByCourse, readAssignedCourseFilters } from '../utils/referenceCourseNavigation.js';

// Roles that read the whole plan. The Director of Libraries sees References only, so a syllabus export would
// come out empty apart from them (the plan page hides its Export button the same way).
const EXPORT_ROLES = ['dean', 'vpaa', 'instructor', 'program-head'];

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toISOString().split('T')[0];
};

const ApprovalCard = ({ code, date, title, link, exportButton }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className={styles.gridCard}>
            <div className={styles.cardMain}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardCode}>{code}</span>
                    <span className={styles.cardDate}>{date}</span>
                </div>
                <div className={styles.cardTitle} title={title}>{title}</div>
                <div className={styles.cardFooter}>
                    <div className={styles.cardActionsGroup}>
                        <Link className={styles.gridActionBtn} to={link.to}>View <ChevronRight size={16} /></Link>
                        {exportButton}
                    </div>
                    <button type="button" className={styles.toggleDetailsBtn} onClick={() => setExpanded(!expanded)}
                        title={expanded ? 'Hide details' : 'Show details'} aria-expanded={expanded}>
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className={styles.cardDetails}>
                    <div className={styles.detailsContent}>
                        <div className={styles.detailRow}>
                            <span style={{ fontWeight: 400 }}>Initial Submission</span>
                            <span>{formatDate(link.submittedAt)}</span>
                        </div>
                        {link.steps.map(step => (
                            <div key={step.title} className={styles.detailRowApprover}>
                                <div className={styles.approverTitle}>{step.title}</div>
                                <div className={styles.approverDates}>
                                    {step.status === 'Accepted' && <div>Approved: {formatDate(step.acceptedAt)}</div>}
                                    {step.status === 'Returned' && <div>Returned: {formatDate(step.returnedAt)}</div>}
                                    {step.status !== 'Accepted' && step.status !== 'Returned' && <div className={styles.pendingText}>Pending</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ApprovalCoursesTable = ({ role = 'approver', styleHooks = {} }) => {
    // The school year starts in June, so from January to May the current one began last calendar year.
    const today = new Date();
    const currentYear = today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1;
    const startYear = currentYear - 8;
    const semOptions = ['1st Sem', '2nd Sem', 'Summer'];
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

    // The VPAA and the Industry Consultant see Dean-approved plans only (the server lists nothing else for them).
    const approvedOnly = role === 'vpaa' || role === 'industry-consultant';
    // The Program Head's list also has the plans still waiting on their instructor, as its fourth tab.
    const statuses = approvedOnly ? ["APPROVED"] : ['program-head', 'dean'].includes(role) ? ["PENDING", "RETURNED", "APPROVED", "NOT_SUBMITTED"] : ["PENDING", "RETURNED", "APPROVED"];
    const STATUS_LABEL = { NOT_SUBMITTED: 'Not submitted' };
    const statusLabel = (status) => STATUS_LABEL[status] || status.charAt(0) + status.slice(1).toLowerCase();

    const defaultStatus = approvedOnly ? 'APPROVED' : 'PENDING';
    const [selectedStatus, setSelectedStatus] = useState(() => {
        if (['program-head', 'dean'].includes(role) && searchParams.get('status') === 'not-submitted') return 'NOT_SUBMITTED';
        if (statuses.includes(linkedCourseFilters.status)) {
            return linkedCourseFilters.status;
        }
        return defaultStatus;
    });
    // A link to this page with another ?status= (a notification, while the list is already open) switches the tab:
    // the state above is only read from the address once, when the page first loads.
    const urlStatus = searchParams.get('status');
    useEffect(() => {
        if (!urlStatus) return;
        const wanted = urlStatus === 'not-submitted' ? 'NOT_SUBMITTED' : urlStatus.toUpperCase();
        const allowed = approvedOnly ? ['APPROVED'] : ['program-head', 'dean'].includes(role) ? ['PENDING', 'RETURNED', 'APPROVED', 'NOT_SUBMITTED'] : ['PENDING', 'RETURNED', 'APPROVED'];
        if (allowed.includes(wanted)) setSelectedStatus(wanted);
    }, [urlStatus, role, approvedOnly]);
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
    // The ? of a row opens its approval details (components/ApprovalDetailsPopup.jsx), as in the instructor's list.
    const [details, setDetails] = useState(null);
    // Cards or rows, as on the instructor's Assigned Course Offerings.
    const [layoutMode, setLayoutMode] = useState('grid');

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

    // Every approved plan of the term in view as one ZIP: one PDF per plan (its program's front pages first), named
    // by course code. A plan that cannot be made is skipped and named at the end.
    // The server renders one page at a time (up to a minute each), so a long term takes a while: progress shows,
    // Stop ends it after the plan in hand and saves nothing.
    const [termProgress, setTermProgress] = useState(null);
    const stopTerm = useRef(false);
    const exportTerm = async () => {
      const rows = sortedRows;
      if (!rows.length) return;
      stopTerm.current = false;
      setTermProgress(`0 / ${rows.length}`);
      const [{ renderPdfOnServer }, { joinPdfs }, { makeZip, uniqueName }] = await Promise.all([
        import('../utils/serverPdf.js'), import('../utils/frontPages.js'), import('../utils/zip.js')]);
      const logoUrl = new URL(unclogo, window.location.origin).href;
      const failed = [];
      const files = [];
      const names = new Set();
      for (let i = 0; i < rows.length; i++) {
        if (stopTerm.current) { setTermProgress(null); return; }
        setTermProgress(`${i + 1} / ${rows.length}`);
        const row = rows[i];
        const code = getCode(row);
        try {
          const file = await buildSyllabusExportFile({ pcId: getOfferingID(row), revNum: (row.ProgramCourseOffering || {}).revision_number || 1, code, workflow: null, logoUrl });
          const html = await (await fetch(file.file_url)).text();
          URL.revokeObjectURL(file.file_url);
          const plan = await renderPdfOnServer(html);
          const pdf = file.front_pdf ? await joinPdfs(file.front_pdf, plan) : plan;
          files.push({ name: uniqueName(names, code, '.pdf'), bytes: new Uint8Array(pdf) });
        } catch (err) {
          console.warn(`Term export skipped ${code}:`, err?.message || err);
          failed.push(code);
        }
      }
      setTermProgress(null);
      if (stopTerm.current) return;
      if (files.length) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([makeZip(files)], { type: 'application/zip' }));
        link.download = `Approved learning plans ${selectedYear}-${Number(selectedYear) + 1} ${selectedSem}.zip`.replace(/\s+/g, ' ');
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);
      }
      if (failed.length) alert(`${failed.length} plan${failed.length === 1 ? ' was' : 's were'} left out (the server could not make the PDF): ${failed.join(', ')}. Try again, or export ${failed.length === 1 ? 'it' : 'them'} one by one.`);
    };

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
        { key: 'date_assigned', label: 'DATE ASSIGNED', width: 165, type: 'date' },
        { key: 'code', label: 'CODE', width: 130, type: 'text', sortValue: (r) => getCode(r) },
        { key: 'name', label: 'COURSE NAME', width: 200, className: styles.growCol, type: 'text', sortValue: (r) => getName(r) },
        ...(selectedStatus === 'APPROVED'
            ? [{ key: 'date_approved', label: 'DATE APPROVED', width: 165, type: 'date' }]
            : []),
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

            <button type="button" className={styles.info} aria-label="View approval details" title="View details"
                onClick={() => setDetails({ submittedAt: latestSubmissionAt(row), approverStatuses: buildApproverStatus(row) })}>
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
                    hint="Its status or term may have changed. Open it again from the Reference Library."
                />
            );
        }
        if (query.trim()) {
            return <EmptyState colSpan={colSpan} icon={<Clock size={22} strokeWidth={1.6} />} title="No course matches your search" hint="Change or clear the search." />;
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
                <h2>{approvedOnly ? 'APPROVED LEARNING PLANS' : 'ASSIGNED COURSE OFFERINGS'}</h2>
                <div className={`${styles.filterA} ${styleHooks.filters || ''}`.trim()}>
                    <Select variant="inline" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} aria-label="School year">
                        {yearOptions}
                    </Select>
                    <Select variant="inline" value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)} aria-label="Semester">
                        {semOptions.map(sem => <option key={sem} value={sem}>{sem}</option>)}
                    </Select>
                </div>

                <div className={styles.fill}></div>

                {!approvedOnly && (
                    <div className={styles['filter-container']}>
                        <div className={styles['segmented-control']}>
                            {statuses.map((status) => {
                                const count = status === 'NOT_SUBMITTED' ? notSubmittedCount : (loading ? null : rowsFor(status).length);
                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        className={`${styles['control-item']} ${selectedStatus === status ? styles['active'] : ''}`}
                                        onClick={() => updateStatus(status)}
                                        aria-pressed={selectedStatus === status}
                                    >
                                        {statusLabel(status)}
                                        {count !== null && <span className={styles.segCount}>{count}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.tableControlsOuter}>
                <div className={styles.searchContainer}>
                    <Search color="#A4A9AF" size={18} />
                    <input
                        type="text"
                        placeholder="Search course code or name..."
                        value={query}
                        onChange={(e) => setPageSearch(e.target.value)}
                        aria-label="Search course code or name"
                    />
                </div>
                {selectedStatus === 'APPROVED' && EXPORT_ROLES.includes(role) && role !== 'instructor' && sortedRows.length >= 2 && (
                    <button type="button" className={`btn btn-secondary btn-sm ${styles.termExport}`} onClick={exportTerm} disabled={termProgress !== null}
                        title="Every approved plan in this list as a ZIP: one PDF per plan, each with its program's front pages">
                        <Download size={14} /> {termProgress === 'stopping' ? 'Stopping after this plan…' : termProgress ? `Exporting ${termProgress}…` : `Export all (${sortedRows.length}) as ZIP`}
                    </button>
                )}
                {termProgress !== null && (
                    <button type="button" className={`btn btn-secondary btn-sm ${styles.termExport}`} onClick={() => { stopTerm.current = true; setTermProgress('stopping'); }}
                        disabled={termProgress === 'stopping'}>Stop</button>
                )}
                {!notSubmitted && (
                    <div className={styles.layoutToggles}>
                        <button type="button" className={`${styles.toggleBtn} ${layoutMode === 'list' ? styles.active : ''}`}
                            onClick={() => setLayoutMode('list')} title="List view" aria-pressed={layoutMode === 'list'}>
                            <List size={18} />
                        </button>
                        <button type="button" className={`${styles.toggleBtn} ${layoutMode === 'grid' ? styles.active : ''}`}
                            onClick={() => setLayoutMode('grid')} title="Grid view" aria-pressed={layoutMode === 'grid'}>
                            <Grid size={18} />
                        </button>
                    </div>
                )}
            </div>

            {!notSubmitted && layoutMode === 'grid' && (
                loading
                    ? <Loading label="Loading course offerings…"><TableSkeleton rows={3} cols={['1fr', '1fr', '1fr']} /></Loading>
                    : loadError
                        ? <table><tbody><EmptyState colSpan={1} icon={<XCircle size={22} strokeWidth={1.6} />} title="Could not load assigned course offerings"
                            hint="The course list could not be loaded. Try again."
                            action={<button type="button" className="btn btn-secondary btn-sm" onClick={loadAssignments}>Try again</button>} /></tbody></table>
                        : sortedRows.length === 0
                            ? <table><tbody>{emptyRow(1)}</tbody></table>
                            : (
                                <div className={styles.gridContainer}>
                                    {sortedRows.map((row) => (
                                        <ApprovalCard
                                            key={`${getOfferingID(row)}-${(row.ProgramCourseOffering || {}).revision_number || 0}`}
                                            code={getCode(row)}
                                            date={formatDate(selectedStatus === 'APPROVED' ? row.date_approved : row.date_assigned)}
                                            title={getName(row)}
                                            link={{ to: getCourseLink(row), submittedAt: latestSubmissionAt(row), steps: buildApproverStatus(row) }}
                                            exportButton={(selectedStatus === 'APPROVED' || canExportRow(row)) && EXPORT_ROLES.includes(role) && (
                                                <button type="button" className={styles.gridExportBtn} disabled={exporting}
                                                    onClick={() => !exporting && handleExport(row)}>
                                                    {exporting ? 'Exporting…' : 'Export'} <Download size={14} />
                                                </button>
                                            )}
                                        />
                                    ))}
                                </div>
                            )
            )}

            {!notSubmitted && layoutMode === 'list' && <TableScrollRegion
                label="Assigned Course Offerings"
                minWidth={760}
                className={`${styles['table-container']} ${styles.approvalRegion}`}
            >
                {/* While loading, show ONLY the spinner. Rendering it above the
                    table meant the empty state ("No learning plans waiting for
                    you") was on screen at the same time as "Loading…", which
                    tells the reader two contradictory things. */}
                {loading && <Loading label="Loading course offerings…"><TableSkeleton rows={6} cols={[165, 130, '1fr', 165, 230]} /></Loading>}

                {!loading && loadError && (
                    <EmptyState
                        icon={<XCircle size={22} strokeWidth={1.6} />}
                        title="Could not load assigned course offerings"
                        hint="The course list could not be loaded. Try again."
                        action={<button type="button" className="btn btn-secondary btn-sm" onClick={loadAssignments}>Try again</button>}
                    />
                )}

                {!loading && !loadError && selectedStatus === 'APPROVED' &&
                    <table className={`${styles.truncate} ${styles.approvalTable} ${styles.approvedTable}`}>
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
                                <td width={165}>{formatDate(row.date_assigned)}</td>
                                <td width={130} title={getCode(row)}><span>{getCode(row)}</span></td>
                                {/* The <span> is what makes the ellipsis appear
                                    (see .truncate), and `title` is not
                                    decoration: the cell clips now, so this is
                                    the only way to read a long name in full. */}
                                <td width={200} className={styles.growCol} title={getName(row)}><span>{getName(row)}</span></td>
                                <td width={165}>{formatDate(row.date_approved)}</td>
                                <td className={styles.actionsCol}>{rowActions(row)}</td>
                            </tr>
                        ))}
                        {!loading && sortedRows.length === 0 && emptyRow(5)}
                        </tbody>
                    </table>
                }

                {!loading && !loadError && (selectedStatus === 'PENDING' || selectedStatus === 'RETURNED') &&
                    <table className={`${styles.truncate} ${styles.approvalTable}`}>
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
                                <td width={165}>{formatDate(row.date_assigned)}</td>
                                <td width={130} title={getCode(row)}><span>{getCode(row)}</span></td>
                                <td width={200} className={styles.growCol} title={getName(row)}><span>{getName(row)}</span></td>
                                <td className={styles.actionsCol}>{rowActions(row)}</td>
                            </tr>
                        ))}
                        {!loading && sortedRows.length === 0 && emptyRow(4)}
                        </tbody>
                    </table>
                }
            </TableScrollRegion>}

            {['program-head', 'dean'].includes(role) && (
                <NotSubmittedPanel
                    readOnly={role !== 'program-head'}
                    active={notSubmitted}
                    schoolYear={`${selectedYear}-${Number(selectedYear) + 1}`}
                    semester={selectedSem === 'Summer' ? 'Summer' : String(selectedSem).startsWith('2') ? '2nd' : '1st'}
                    query={query}
                    onCount={setNotSubmittedCount}
                />
            )}


            {details && <ApprovalDetailsPopup data={details} onClose={() => setDetails(null)} />}

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
