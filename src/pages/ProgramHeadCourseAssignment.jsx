/**
 * Course Assignment — Program Head feature.
 *
 * The Course Assignment module has its own table (course_offering_assignments),
 * separate from Course Offerings. Each row pairs a course with an assigned
 * faculty member; its status MIRRORS that faculty's status in the Faculty list:
 *
 *   Active / On Leave / Emeritus / Inactive — the matched faculty's own status.
 *   Unassigned — course code or faculty name not matched (or no faculty yet);
 *                stays visible and is fixable via the Resolve flow.
 *   Archived   — removed from the main table via the Edit modal's "Remove".
 *
 * Inactive and Archived route the row to the global Archive (that faculty's
 * assignment is hidden). Emeritus stays VISIBLE in the main table, flagged, so
 * the course is available for reassignment to another faculty.
 * The table starts blank each term; Add/Edit use dropdowns bound to the
 * period's Course Offerings + Faculty. The page re-derives status on every load.
 */
import React from "react";
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import PeriodSelector from "../components/PeriodSelector.jsx";
import YearFilter from "../components/YearFilter.jsx";
import AddRecordModal from "../components/AddRecordModal.jsx";
import EditEntityModal from "../components/EditEntityModal.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import ViewArchivedButton from "../components/ViewArchivedButton.jsx";
import UndoUploadButton from "../components/UndoUploadButton.jsx";
import UploadPreviewFlow from "../components/UploadPreviewFlow.jsx";
import DialogShell from "../components/DialogShell.jsx";
import RowActionsMenu from "../components/RowActionsMenu.jsx";
import CoursePicker from "../components/CoursePicker.jsx";
import ContributorsPicker from "../components/ContributorsPicker.jsx";
import { DateCell } from "../components/RecordTimestamps.jsx";
import { Search, Upload, Plus, Clipboard, Edit3, ChevronDown, Check, AlertTriangle, RefreshCw } from "react-feather";
import styles from '../styles/CoursesTable.module.sass';
import syllabusStyles from '../styles/SyllabusSections.module.sass';
import { CourseOfferingAssignmentsAPI, CoursesAPI, FacultyAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import { useCurrentUser } from '../services/currentUser.jsx';
import { useHeadProgram } from '../services/useHeadProgram.js';
import { statusPillStyle, partitionByArchive } from '../services/statusPolicy.js';
import { sortRows, statusRank, nextSort } from '../services/tableSort.js';
import SortableTh from "../components/SortableTh.jsx";
import { courseMatchesPeriod } from '../services/courseTerm.js';

const ActionBtn = ({ onClick, icon, label, disabled, variant }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 18px', gap: 8, minWidth: 240, height: 40, background: variant === 'white' ? '#FFFFFF' : (disabled ? '#9CA3AF' : '#18191A'), borderRadius: 6, color: variant === 'white' ? '#374151' : '#fff', border: variant === 'white' ? '1px solid #D1D5DB' : 'none', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? (variant === 'white' ? 0.6 : 0.7) : 1 }}>
    <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    {label}
  </button>
);

// Normalize a year-level string ("SECOND YEAR", "2nd Year", "2") → 1-4 (null if
// unrecognised), so the year filter works regardless of the source wording.
const yearLevelNum = (yearLvl) => {
  const s = String(yearLvl || '').toLowerCase();
  if (s.includes('first')  || s.includes('1st') || s.trim() === '1') return 1;
  if (s.includes('second') || s.includes('2nd') || s.trim() === '2') return 2;
  if (s.includes('third')  || s.includes('3rd') || s.trim() === '3') return 3;
  if (s.includes('fourth') || s.includes('4th') || s.trim() === '4') return 4;
  return null;
};
// Ordinal words for the year-specific empty state.
const YEAR_ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

const ProgramHeadCourseAssignment = () => {
  const { currentPeriod, isCurrentTermActive } = usePeriod();
  const { name: currentUserName, role: currentUserRole } = useCurrentUser();
  const periodId = currentPeriod && currentPeriod.id;

  // Which program is this Program Head assigned to? (same resolution as the
  // Course Offerings page — via the Dean's assignment).
  const {
    currentProgram, programCode, programName,
    myPrograms, selectedProgramId, setSelectedProgramId,
    hasMultiplePrograms, noProgramAssigned,
  } = useHeadProgram(periodId);
  const [programMenuOpen, setProgramMenuOpen] = React.useState(false);

  const [assignments, setAssignments]         = React.useState([]);
  const [courses, setCourses]                 = React.useState([]);
  const [faculty, setFaculty]                 = React.useState([]);
  const [searchQuery, setSearchQuery]         = React.useState('');
  const [yearFilter, setYearFilter]           = React.useState('all'); // 'all' | 1 | 2 | 3 | 4
  const [showModal, setShowModal]             = React.useState(false);  // upload modal
  const [showAddModal, setShowAddModal]       = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState(null);
  const [confirmUpload, setConfirmUpload]     = React.useState(false);
  const [selectedFile, setSelectedFile]       = React.useState(null);
  // The file under review in the Preview & Confirm overlay. Nothing is written
  // while this is set — the commit only happens on "Confirm & Import".
  const [pendingFile, setPendingFile]         = React.useState(null);
  const [uploadReview, setUploadReview]       = React.useState(null);   // { inserted, warnings: [] }
  const [revalidating, setRevalidating]       = React.useState(false);
  const fileInputRef = React.useRef(null);

  // Bumped on every successful upload so the Undo button re-reads its batch.
  const [uploadCount, setUploadCount]         = React.useState(0);

  const refresh = React.useCallback(() => {
    if (!periodId) { setAssignments([]); setCourses([]); setFaculty([]); return; }
    CourseOfferingAssignmentsAPI.list(periodId).then((rows) => setAssignments(Array.isArray(rows) ? rows : [])).catch(() => setAssignments([]));
    // Courses come from the period-scoped curriculum catalog (the Courses
    // page), filtered to those that actually belong to THIS term's semester
    // (a 1st-Sem assignment must not offer a 2nd-Sem course), then normalised
    // to { code, title } so the dropdowns + matching here stay unchanged.
    CoursesAPI.list(periodId)
      .then((rows) => setCourses(Array.isArray(rows)
        ? rows.filter((c) => courseMatchesPeriod(c, currentPeriod)).map((c) => ({ code: c.course_no, title: c.course_title, year_level: c.year_lvl }))
        : []))
      .catch(() => setCourses([]));
    FacultyAPI.list(periodId).then((rows) => setFaculty(Array.isArray(rows) ? rows : [])).catch(() => setFaculty([]));
  }, [periodId, currentPeriod]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const showTable = assignments.length > 0;

  // Look up a course in the current period's catalog (used to pair the picked
  // code with its title before saving).
  const findCourse = (code) => {
    const cc = String(code || '').trim().toLowerCase();
    return cc ? (courses.find((c) => String(c.code).trim().toLowerCase() === cc) || null) : null;
  };

  // Drop whatever is in the picker, so re-opening it never shows a stale file
  // name from a run the user already abandoned.
  const clearPicker = React.useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Picking a file no longer uploads it — it hands it to the Preview & Confirm
  // overlay. The write happens there, on "Confirm & Import", and not before.
  const handleReviewFile = () => {
    if (!selectedFile)      { alert('Please choose a file first'); return; }
    if (!periodId)          { alert('Select an academic period first'); return; }
    // An assignment resolves against a (course × program) offering, so a preview
    // taken without a program would warn about problems the real import won't
    // have. selectedProgramId is populated asynchronously; don't race it.
    if (!selectedProgramId) { alert('Still loading your program — try again in a moment.'); return; }
    setShowModal(false);
    setPendingFile(selectedFile);
  };

  // "Confirm & Import" succeeded — everything the old handleConfirmUpload did
  // after a successful upload happens here instead.
  const onUploadCommitted = async (result) => {
    await refresh();
    setUploadCount((n) => n + 1);
    clearPicker();
    // The post-upload validation report still fires. It is now largely redundant
    // with the preview — which shows these same warnings BEFORE the write — but
    // it costs nothing and it is what this page has always done.
    if (result && Array.isArray(result.warnings) && result.warnings.length > 0) {
      setUploadReview({ inserted: result.inserted, warnings: result.warnings });
    }
  };

  // Undone — put the user back where they can pick the RIGHT file.
  const onUploadUndone = async () => {
    await refresh();
    setUploadCount((n) => n + 1);
    setUploadReview(null);
    setPendingFile(null);
    clearPicker();
    setShowModal(true);
  };

  // Add/Edit pick the course + faculty from dropdowns bound to this period's
  // lists, so the backend always resolves a concrete status (the faculty's own
  // status, or 'Unassigned' when no faculty is set). No pre-save gating needed.
  const onAddAssignment = async (rawRecord) => {
    // The combined picker stores only the code; pair it with the offering's
    // title so the saved row carries both course no. and course name.
    const course = findCourse(rawRecord.course_code);
    const record = { ...rawRecord, course_name: course ? course.title : (rawRecord.course_name || '') };
    await CourseOfferingAssignmentsAPI.create(record, periodId, selectedProgramId);
    await refresh();
    setUploadCount((n) => n + 1);   // a manual add is undoable too
  };

  const onSaveEdit = async (rawPatch) => {
    const patch = { ...rawPatch };
    // Keep course_name in lockstep with a changed course_code (combined picker).
    if (patch.course_code !== undefined) {
      const course = findCourse(patch.course_code);
      patch.course_name = course ? course.title : (patch.course_name || '');
    }
    await CourseOfferingAssignmentsAPI.update(editingAssignment.id, patch);
    await refresh();
  };

  // "Remove" in the Edit modal archives the row — it leaves the main
  // table and shows up in the global Floating Archive instead.
  const onArchiveAssignment = async () => {
    if (!editingAssignment) return;
    await CourseOfferingAssignmentsAPI.update(editingAssignment.id, { status: 'Archived' });
    await refresh();
    setEditingAssignment(null);
  };


  // Re-validate every assignment in this period against the CURRENT course
  // catalog + faculty list and persist the recomputed statuses. Useful when
  // the course/faculty source changed and some rows no longer resolve.
  const onRevalidate = async () => {
    if (!periodId || revalidating) return;
    setRevalidating(true);
    try {
      const r = await CourseOfferingAssignmentsAPI.revalidate(periodId);
      await refresh();
      const summary = (r && r.summary) || {};
      const breakdown = Object.keys(summary).length
        ? Object.entries(summary).map(([status, n]) => `${status}: ${n}`).join('\n')
        : 'No assignments to validate.';
      alert(
        `Re-validated ${r.total} assignment${r.total === 1 ? '' : 's'} — ${r.changed} status change${r.changed === 1 ? '' : 's'}.\n\n`
        + breakdown
      );
    } catch (err) {
      alert('Re-validate failed: ' + (err.message || 'unknown error'));
    } finally {
      setRevalidating(false);
    }
  };

  // Edit-status handler for the course-assignment archive (restore → Active).
  const onEditStatus = React.useCallback(async (row, newStatus) => {
    await CourseOfferingAssignmentsAPI.update(row.id, { status: newStatus });
    await refresh();
  }, [refresh]);

  const visibleAssignments = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = q
      ? assignments.filter((a) => [a.course_code, a.course_name, a.faculty_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      : assignments.slice();
    // Year-level filter (1st–4th); 'all' keeps everything.
    if (yearFilter !== 'all') {
      rows = rows.filter((a) => yearLevelNum(a.year_level) === yearFilter);
    }
    // Sorting is handled by the table's column headers; here we only filter
    // and drop archived assignments to the global Archive view.
    return partitionByArchive(rows, 'courseassign').main;
  }, [assignments, searchQuery, yearFilter]);

  // Per-year-level counts for the YearFilter segments, computed from the
  // currently-loaded (non-archived) assignments — independent of search/year so
  // the segment numbers stay stable. Uses the shared year-level normalization.
  const yearCounts = React.useMemo(() => {
    const main = partitionByArchive(assignments, 'courseassign').main;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    main.forEach((a) => { const n = yearLevelNum(a.year_level); if (n) counts[n] += 1; });
    return { counts, total: main.length };
  }, [assignments]);

  // Column-header sort for the assignments table (default: Course No. asc).
  const ASSIGN_COLUMNS = [
    { key: 'course_code',   label: 'COURSE NO.',       width: 160, type: 'text' },
    { key: 'course_name',   label: 'COURSE OFFERING',  width: 280, type: 'text', thStyle: { flex: '1 1 auto', minWidth: 240 } },
    { key: 'year_level',    label: 'YEAR LEVEL',       width: 150, type: 'number', sortValue: (r) => yearLevelNum(r.year_level) || 99 },
    { key: 'faculty_name',  label: 'LEAD FACULTY',     width: 170, type: 'text', thStyle: { flex: '1 1 auto', minWidth: 140 } },
    { key: 'contributors',  label: 'CONTRIBUTORS',     width: 150, type: 'text', sortable: false, thStyle: { flex: '1 1 auto', minWidth: 120 } },
    { key: 'date_assigned', label: 'DATE ASSIGNED',    width: 180, type: 'date' },
    { key: 'status',        label: 'STATUS',           width: 140, type: 'number', sortValue: (r) => statusRank('courseassign', r.status) },
  ];
  const [assignSort, setAssignSort] = React.useState({ sortKey: 'course_code', sortDir: 'asc' });
  const onAssignSort = (key) => setAssignSort((s) => nextSort(s, key));
  const sortedAssignments = sortRows(visibleAssignments, ASSIGN_COLUMNS, assignSort.sortKey, assignSort.sortDir);

  // Faculty options for the searchable Assigned-Faculty dropdown.
  // { value: name, label: name, sub: role } — the dropdown shows the role as
  // muted secondary text (same UI as the Industry Consultant Name field).
  // Mirror the Faculty list: archived faculty (Emeritus / Inactive) drop out of
  // the Faculty page's main table, so they must NOT be assignable here either —
  // only available faculty (Active / On Leave) can take a new course.
  const facultyOptions = partitionByArchive(faculty, 'faculty').main
    .map((f) => ({ value: f.name, label: f.name, sub: f.role || '' }));

  // Courses already on the table (non-archived) can't be assigned twice — the
  // combined picker hides them. (The row being edited keeps its own course
  // visible; CoursePicker excludes everything except the current value.)
  const assignedCodeSet = React.useMemo(() => {
    const main = partitionByArchive(assignments, 'courseassign').main;
    return new Set(main.map((a) => String(a.course_code || '').toLowerCase()).filter(Boolean));
  }, [assignments]);
  const assignedExcludeCodes = React.useMemo(() => Array.from(assignedCodeSet), [assignedCodeSet]);

  // Combined "Course Offering" field — one grouped, year-leveled picker (sourced
  // from Course Offerings) that carries the course no. + name together. Shared
  // by Add and Edit so both use the same dropdown layout.
  const courseOfferingField = {
    key: 'course_code', label: 'Course Offering', required: true,
    render: ({ value, onChange }) => (
      <CoursePicker
        value={value}
        onChange={(code) => onChange(code)}
        courses={courses}
        excludeCodes={assignedExcludeCodes}
      />
    ),
  };

  // Contributors (co-teachers) — a multi-select beside the single Lead Faculty.
  // `type: 'checkboxes'` only tells the modals to keep this value as an ARRAY
  // (init + dirty-diff); the custom render swaps in the chip picker, which reads
  // the live lead from `values` so the lead can't also be a contributor.
  // Value is an array of faculty NAMES; the backend resolves ids + dedupes.
  const contributorsField = {
    key: 'contributors', label: 'Contributors', type: 'checkboxes',
    render: ({ value, onChange, values }) => (
      <ContributorsPicker
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        options={facultyOptions}
        excludeValue={values && values.faculty_name}
      />
    ),
  };

  const addFields = [
    courseOfferingField,
    { key: 'faculty_name', label: 'Lead Faculty', type: 'searchable-select', options: facultyOptions, placeholder: 'Search faculty…' },
    contributorsField,
  ];

  // Program switcher — shown only when the user heads more than one program.
  const programSwitcher = (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setProgramMenuOpen((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <span>Program: <strong style={{ color: '#0F172A' }}>{currentProgram ? currentProgram.code : '—'}</strong></span>
        <ChevronDown size={15} color="#64748B" />
      </button>
      {programMenuOpen && (
        <>
          <div onClick={() => setProgramMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
          <div style={{ position: 'absolute', top: '110%', left: 0, background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 260, padding: 6, zIndex: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B', padding: '6px 10px 4px' }}>Your programs</div>
            {myPrograms.map((p) => {
              const active = p.id === selectedProgramId;
              return (
                <button key={p.id} onClick={() => { setSelectedProgramId(p.id); setProgramMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', textAlign: 'left', background: active ? '#F1F5F9' : 'transparent', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 6 }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{p.code}</span>
                    <span style={{ fontSize: 12, color: '#64748B', marginLeft: 8 }}>{p.name}</span>
                  </span>
                  {active && <Check size={15} color="#18191A" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // Shown when the signed-in user heads NO program this term.
  const blockedState = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 92, height: 92, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle size={40} color="#B45309" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#18191A' }}>No program assigned for this term</div>
      <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 440 }}>
        You're not set as a Program Head for any program in {currentPeriod ? currentPeriod.label : 'this term'}. Ask your Dean to assign you, or switch to a term where you're already assigned.
      </div>
    </div>
  );

  const content = (
    <div style={{ padding: 20, background: '#FFFFFF', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Program identity — LINE 1 "BSIT: Course Assignment", LINE 2 full name;
          action buttons on the right (Re-validate is icon-only). */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0, display: 'flex', gap: 12 }}>
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: '#18191A', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 24, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                {programCode
                  ? (<><span style={{ fontWeight: 800 }}>{programCode}</span><span style={{ fontWeight: 600 }}>: Course Assignment</span></>)
                  : (<span style={{ fontWeight: 700 }}>Course Assignment</span>)}
              </div>
              {programName && <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{programName}</div>}
            </div>
          </div>
          {hasMultiplePrograms && programSwitcher}
        </div>
        {!noProgramAssigned && (
          <div style={{ display: 'flex', gap: 10 }}>
            {showTable && (
              <button
                onClick={onRevalidate}
                disabled={revalidating}
                title={revalidating ? 'Validating…' : 'Re-validate — re-check every assignment against the current courses & faculty'}
                aria-label="Re-validate"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 6, color: '#374151', cursor: revalidating ? 'not-allowed' : 'pointer', opacity: revalidating ? 0.7 : 1 }}
              >
                <RefreshCw size={18} />
              </button>
            )}
            <UndoUploadButton entity="course_offering_assignments" periodId={periodId} disabled={!periodId || !isCurrentTermActive} refreshKey={uploadCount} onUndone={refresh} />
            <ActionBtn variant="white" onClick={() => { if (assignments.length > 0) { setConfirmUpload(true); } else { setShowModal(true); } }} disabled={!periodId || !isCurrentTermActive} icon={<Upload size={18} color="#374151" />} label="Upload Course Assignment" />
            {showTable && isCurrentTermActive && <ActionBtn onClick={() => setShowAddModal(true)} icon={<Plus size={18} color="#FFFFFF" />} label="Add Assignment" />}
          </div>
        )}
      </div>

      {/* Full-width hairline below the program identity. */}
      <div style={{ height: 1, background: '#E5E7EB', margin: '14px 0 18px' }} />

      {/* Top toolbar — the Current Term selector stays visible even when the
          user has no program this term, so they can always switch back to a
          term where they're assigned (View Archived hides while blocked). */}
      <div className={syllabusStyles.header} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PeriodSelector prominent />
        {!noProgramAssigned && <ViewArchivedButton moduleType="course_offering_assignments" onEditStatus={onEditStatus} />}
      </div>

      {noProgramAssigned ? blockedState : (<>

      {!isCurrentTermActive && currentPeriod && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, color: '#92400E', fontSize: 13, lineHeight: '1.4' }}>
          <strong>Read-only:</strong> {currentPeriod.label} is not the current term. Switch to the current term to make changes.
        </div>
      )}

      {/* Filter bar directly above the table — left-aligned: search beside the
          year-level filter. */}
      {showTable && (
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className={syllabusStyles['section-select']} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', height: 40, borderRadius: 9999, background: 'transparent', border: '1px solid #D1D5DB', flex: '0 1 360px', minWidth: 220, maxWidth: 420 }}>
            <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by course no., offering, or faculty" style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', fontSize: 14 }} />
          </div>
          <YearFilter value={yearFilter} onChange={setYearFilter} counts={yearCounts.counts} total={yearCounts.total} />
        </div>
      )}

      {showTable && (
        <div className={styles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'hidden' }}>
          {sortedAssignments.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clipboard size={30} color="#9CA3AF" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#18191A' }}>
                {yearFilter !== 'all' ? ('No ' + (YEAR_ORDINAL[yearFilter] || '') + '-year assignments yet') : 'No matching assignments'}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', maxWidth: 360 }}>
                {searchQuery.trim()
                  ? ('Nothing matches “' + searchQuery.trim() + '”.')
                  : (yearFilter !== 'all' ? 'Try a different year level, or upload assignments for this one.' : 'Adjust your filters to see assignments.')}
              </div>
            </div>
          ) : (
          <table className={styles.alignFixed} style={{ width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
              <tr>
                {ASSIGN_COLUMNS.map((col) => (
                  <SortableTh key={col.key} col={col} sortKey={assignSort.sortKey} sortDir={assignSort.sortDir} onSort={onAssignSort} />
                ))}
                <th className={styles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {sortedAssignments.map((row) => (
                <tr key={row.id}>
                  <td width={160}>{row.course_code}</td>
                  <td width={280} style={{ flex: '1 1 auto', minWidth: 240 }}>
                    <span title={row.course_name || ''} style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.course_name || ''}
                    </span>
                  </td>
                  <td width={150}>{(() => { const n = yearLevelNum(row.year_level); return n ? (YEAR_ORDINAL[n] + ' Year') : (row.year_level || <span style={{ color: '#9CA3AF' }}>—</span>); })()}</td>
                  <td width={170} style={{ flex: '1 1 auto', minWidth: 140 }}>
                    {row.faculty_name ? (
                      <span title={row.faculty_name} style={{ display: 'inline-flex', alignItems: 'center', maxWidth: '100%', padding: '2px 9px', borderRadius: 9999, fontSize: 12, color: '#0F172A', background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.faculty_name}</span>
                      </span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>— Unassigned —</span>
                    )}
                  </td>
                  <td width={150} style={{ flex: '1 1 auto', minWidth: 120 }}>
                    {(() => {
                      const list = Array.isArray(row.contributors) ? row.contributors : [];
                      if (list.length === 0) return <span style={{ color: '#9CA3AF' }}>—</span>;
                      const shown = list.slice(0, 2);
                      const extra = list.length - shown.length;
                      const chip = { display: 'inline-flex', alignItems: 'center', maxWidth: 130, padding: '2px 9px', borderRadius: 9999, fontSize: 12, color: '#0F172A', background: '#F1F5F9', border: '1px solid #E2E8F0' };
                      return (
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          {shown.map((c, i) => (
                            <span key={(c && c.faculty_id) || c.faculty_name || i} title={c.faculty_name} style={chip}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.faculty_name}</span>
                            </span>
                          ))}
                          {extra > 0 && (
                            <span title={list.slice(2).map((c) => c.faculty_name).join(', ')} style={{ ...chip, fontWeight: 600, color: '#475569' }}>+{extra}</span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td width={180} style={{ whiteSpace: 'nowrap' }}>
                    <DateCell value={row.date_assigned} />
                  </td>
                  <td width={140}>
                    <span style={{ ...statusPillStyle('courseassign', row.status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {row.status}
                    </span>
                  </td>
                  <td className={styles.fill} style={{ whiteSpace: 'nowrap' }}>
                    <RowActionsMenu
                      row={row}
                      inline={[
                        isCurrentTermActive && { key: 'edit', label: 'Edit', icon: <Edit3 size={16} />, onClick: (r) => setEditingAssignment(r) },
                      ].filter(Boolean)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      )}

      {!showTable && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: 92, height: 92, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clipboard size={40} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#18191A' }}>No course assignments yet</div>
          <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 480 }}>{periodId ? ('Upload a course assignment file for ' + (currentPeriod ? currentPeriod.label : 'this period') + ' to get started — each row is validated against Course Offerings and Faculty.') : 'Select an academic period to begin.'}</div>
        </div>
      )}

      </>)}

      {showAddModal && (
        <AddRecordModal
          title="Add Course Assignment"
          fields={addFields}
          onSubmit={onAddAssignment}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingAssignment && (
        <EditEntityModal
          key={'ca-edit-' + editingAssignment.id}
          title="Edit assignment"
          termLabel={currentPeriod ? currentPeriod.label : undefined}
          fields={[
            courseOfferingField,
            {
              key: 'faculty_name', label: 'Lead Faculty', type: 'searchable-select',
              options: facultyOptions, placeholder: 'Select faculty…', searchable: false,
              highlight: editingAssignment.status === 'Unassigned' && !editingAssignment.faculty_id,
            },
            contributorsField,
          ]}
          // The modal manages contributors as an array of NAMES; the stored
          // shape is { faculty_id, faculty_name }, so flatten to names here.
          record={{
            ...editingAssignment,
            contributors: Array.isArray(editingAssignment.contributors)
              ? editingAssignment.contributors.map((c) => c.faculty_name)
              : [],
          }}
          onSave={onSaveEdit}
          onClose={() => setEditingAssignment(null)}
          onRemove={onArchiveAssignment}
          removeLabel="Remove"
        />
      )}

      <ConfirmModal
        open={confirmUpload}
        title="Replace course assignment data?"
        message={'Uploading a file will replace existing course assignments for ' + (currentPeriod ? currentPeriod.label : 'this period') + '. You\'ll review the file before anything is saved. Proceed?'}
        confirmLabel="Continue to upload"
        onConfirm={() => { setConfirmUpload(false); setShowModal(true); }}
        onCancel={() => setConfirmUpload(false)}
      />

      {uploadReview && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60 }} onClick={() => setUploadReview(null)} />
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(640px, 92vw)', maxHeight: '80vh', background: '#FFFFFF', borderRadius: 12, zIndex: 61, display: 'flex', flexDirection: 'column', boxShadow: '0 18px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#18191A' }}>Upload validation</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                {uploadReview.inserted} assignment{uploadReview.inserted === 1 ? '' : 's'} imported. {uploadReview.warnings.length} need{uploadReview.warnings.length === 1 ? 's' : ''} attention:
              </div>
            </div>
            <div style={{ padding: '8px 24px', overflowY: 'auto' }}>
              {uploadReview.warnings.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ fontSize: 14, color: '#18191A' }}>
                    <strong>Row {w.row}</strong> — {w.course_code}{w.faculty_name ? ' / ' + w.faculty_name : ''}
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{w.message}</div>
                  </div>
                  <span style={{ ...statusPillStyle('courseassign', w.status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{w.status}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setUploadReview(null)} style={{ height: 40, padding: '0 20px', background: '#18191A', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>Got it</button>
            </div>
          </div>
        </>
      )}


      <DialogShell
        open={showModal}
        onBackdropClick={() => setShowModal(false)}
        ariaLabel="Upload Course Assignment"
        panelStyle={{ width: 600, maxWidth: '94vw', padding: 24, background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
      >
            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Course Assignment</div>
            <div onClick={() => fileInputRef.current && fileInputRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setSelectedFile(f); }} style={{ border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Upload size={36} color="#9CA3AF" />
              <div style={{ fontWeight: 600, color: '#18191A' }}>{selectedFile ? selectedFile.name : 'Drag & drop file here'}</div>
              <div style={{ color: '#6B7280', fontSize: 13 }}>Upload .xlsx, .xls or .csv</div>
              <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setSelectedFile(f); }} style={{ display: 'none' }} />
            </div>
            <div style={{ color: '#6B7280', fontSize: 13 }}>
              You'll see exactly what's in the file — and what would fail — before anything is saved.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { clearPicker(); setShowModal(false); }} style={{ flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #18191A', borderRadius: 8, color: '#18191A', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button disabled={!selectedFile} onClick={handleReviewFile} style={{ flex: 1, height: 40, background: '#18191A', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: selectedFile ? 'pointer' : 'not-allowed', fontWeight: 500, opacity: selectedFile ? 1 : 0.6 }}>Review file</button>
            </div>
      </DialogShell>

      {/* Preview & Confirm, then the 30-second undo toast.
          `key` on the program id is load-bearing: the overlay only re-runs its dry
          run when the FILE changes, but `commit` closes over the CURRENT
          selectedProgramId. Switch program mid-review and the commit would import
          against a program the preview never saw. Re-keying remounts the overlay
          and re-previews, so the two can never disagree. */}
      <UploadPreviewFlow
        key={'assign-preview-' + String(selectedProgramId)}
        file={pendingFile}
        entity="course_offering_assignments"
        periodId={periodId}
        title="Upload Course Assignment"
        preview={(f) => CourseOfferingAssignmentsAPI.uploadPreview(f, periodId, selectedProgramId)}
        commit={(f) => CourseOfferingAssignmentsAPI.upload(f, periodId, selectedProgramId)}
        onBack={() => { setPendingFile(null); setShowModal(true); }}
        onCancel={() => { setPendingFile(null); clearPicker(); }}
        onCommitted={onUploadCommitted}
        onUndone={onUploadUndone}
      />
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role={currentUserRole} name={currentUserName} />}
      nav={<SideNavigation mode="program-head" />}
      content={content}
    />
  );
};

export default ProgramHeadCourseAssignment;
