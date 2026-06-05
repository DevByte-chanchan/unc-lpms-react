/**
 * Course Assignment — Program Head feature.
 *
 * The Course Assignment module has its own table (course_assignments),
 * separate from Course Offerings. Each row pairs a course with an
 * assigned faculty member and carries a validation status:
 *
 *   Verified      — course + faculty matched against this period's
 *                   master lists, and both are Active.
 *   Pending Match — the course code or faculty name was not found
 *                   (only reachable via upload — Add/Edit use dropdowns).
 *   Flagged       — matched, but the course or faculty is not Active.
 *   Archived      — removed from the main table via the Edit modal's
 *                   "Remove" action; shown in the global Archive.
 *
 * The table starts blank each term. Add/Edit use dropdowns bound to the
 * period's Course Offerings + Faculty, so manual entry resolves straight
 * to Verified / Flagged. Uploading a file validates every row and
 * surfaces non-Verified rows in a review modal.
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
import RowActionsMenu from "../components/RowActionsMenu.jsx";
import { DateCell } from "../components/RecordTimestamps.jsx";
import { Search, ArrowUp, ArrowDown, Upload, Plus, Clipboard, RefreshCw, Edit3, Archive, ChevronDown, Check, AlertTriangle, Tool, X, ArrowRight, UserPlus } from "react-feather";
import styles from '../styles/CoursesTable.module.sass';
import syllabusStyles from '../styles/SyllabusSections.module.sass';
import { CourseAssignmentsAPI, CoursesAPI, FacultyAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import { useCurrentUser } from '../services/currentUser.jsx';
import { useHeadProgram } from '../services/useHeadProgram.js';
import { statusPillStyle, partitionByArchive, archiveStatusList } from '../services/statusPolicy.js';
import { sortRows, statusRank, nextSort } from '../services/tableSort.js';
import SortableTh from "../components/SortableTh.jsx";
import { courseMatchesPeriod } from '../services/courseTerm.js';

const ActionBtn = ({ onClick, icon, label, disabled, variant }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 18px', gap: 8, minWidth: 240, height: 40, background: variant === 'white' ? '#FFFFFF' : (disabled ? '#9CA3AF' : '#EA1212'), borderRadius: 6, color: variant === 'white' ? '#374151' : '#fff', border: variant === 'white' ? '1px solid #D1D5DB' : 'none', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? (variant === 'white' ? 0.6 : 0.7) : 1 }}>
    <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    {label}
  </button>
);

// Drop common honorifics so "Dr. Maria Santos" still matches a Faculty
// row stored as "Maria Santos". Mirrors normalizeName in the controller.
const normalizeName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/\b(dr|prof|professor|engr|engineer|atty|mr|mrs|ms|sir|maam|ma'?am)\.?\s+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Roles offered when creating a missing Faculty profile from the
// "Confirm & Add" popup (createFaculty requires name + role).
const FACULTY_ROLES = ['Instructor', 'Assistant Professor', 'Associate Professor', 'Professor', 'Program Head', 'Dean'];

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

// Add-a-missing-course form (mirrors the Course Offerings "Add Course" form)
// used by the Resolve flow when a course truly needs creating.
const CLASSIFICATION_OPTIONS = ['Professional Courses', 'Core Courses', 'Elective', 'GE Courses', 'Cognate'];
const COURSE_YEAR_OPTIONS = ['FIRST YEAR', 'SECOND YEAR', 'THIRD YEAR', 'FOURTH YEAR'];
const NEW_COURSE_FIELDS = [
  { key: 'course_no', label: 'Course No.', required: true, placeholder: 'e.g. BIT201', colSpan: 1 },
  { key: 'credit', label: 'Credit (Lec/Lab)', placeholder: 'e.g. 2 LEC, 1 LAB', colSpan: 1 },
  { key: 'course_title', label: 'Course Title', required: true, placeholder: 'e.g. Database Systems', colSpan: 2 },
  { key: 'classification', label: 'Classification', type: 'select', options: CLASSIFICATION_OPTIONS, colSpan: 1 },
  { key: 'contact_hrs', label: 'Contact Hours', placeholder: 'e.g. 2 Hrs Lec, 3 Hrs Lab', colSpan: 1 },
  { key: 'year_lvl', label: 'Year Level', type: 'select', options: COURSE_YEAR_OPTIONS, colSpan: 1 },
  { key: 'cmo', label: 'CMO', placeholder: 'e.g. CMO No. 25 S. 2015', colSpan: 2 },
  // Term omitted — fixed by the current academic period (backend derives it).
];
const FACULTY_ADD_FIELDS = [
  { key: 'name', label: 'Faculty Name', required: true, placeholder: 'e.g. Maria Santos', colSpan: 2 },
  { key: 'role', label: 'Role', type: 'select', options: FACULTY_ROLES, colSpan: 2 },
];

// Any year-level wording → the catalog's "SECOND YEAR" option for prefill.
const yearToCatalogOption = (yl) => { const n = yearLevelNum(yl); return n ? COURSE_YEAR_OPTIONS[n - 1] : ''; };

// Fuzzy similarity — Dice coefficient over bigrams of normalized strings — so
// the Resolve modal can SUGGEST existing matches before creating duplicates.
const fuzzNorm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const fuzzBigrams = (s) => { const r = []; for (let i = 0; i < s.length - 1; i += 1) r.push(s.slice(i, i + 2)); return r; };
const fuzzScore = (a, b) => {
  const na = fuzzNorm(a), nb = fuzzNorm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const A = fuzzBigrams(na), B = fuzzBigrams(nb);
  if (!A.length || !B.length) return 0;
  const bag = new Map(); B.forEach((g) => bag.set(g, (bag.get(g) || 0) + 1));
  let inter = 0; A.forEach((g) => { const c = bag.get(g) || 0; if (c > 0) { inter += 1; bag.set(g, c - 1); } });
  return (2 * inter) / (A.length + B.length);
};

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
  const [uploading, setUploading]             = React.useState(false);
  const [uploadError, setUploadError]         = React.useState(null);
  const [uploadReview, setUploadReview]       = React.useState(null);   // { inserted, warnings: [] }
  const [pendingConfirm, setPendingConfirm]   = React.useState(null);   // { mode, id?, payload, status }
  const [revalidating, setRevalidating]       = React.useState(false);
  const [resolving, setResolving]             = React.useState(null);  // Pending row being resolved
  const [resolveBusy, setResolveBusy]         = React.useState(false);
  const [addingCourse, setAddingCourse]       = React.useState(null);  // prefill for the Add-Course form
  const [addingFacultyFor, setAddingFacultyFor] = React.useState(null); // row needing a new faculty
  const fileInputRef = React.useRef(null);

  const refresh = React.useCallback(() => {
    if (!periodId) { setAssignments([]); setCourses([]); setFaculty([]); return; }
    CourseAssignmentsAPI.list(periodId).then((rows) => setAssignments(Array.isArray(rows) ? rows : [])).catch(() => setAssignments([]));
    // Courses come from the period-scoped curriculum catalog (the Courses
    // page), filtered to those that actually belong to THIS term's semester
    // (a 1st-Sem assignment must not offer a 2nd-Sem course), then normalised
    // to { code, title } so the dropdowns + matching here stay unchanged.
    CoursesAPI.list(periodId)
      .then((rows) => setCourses(Array.isArray(rows)
        ? rows.filter((c) => courseMatchesPeriod(c, currentPeriod)).map((c) => ({ code: c.course_no, title: c.course_title }))
        : []))
      .catch(() => setCourses([]));
    FacultyAPI.list(periodId).then((rows) => setFaculty(Array.isArray(rows) ? rows : [])).catch(() => setFaculty([]));
  }, [periodId, currentPeriod]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const showTable = assignments.length > 0;

  // Look up a course / faculty in the current period's master lists.
  // Faculty matching is exact first, then honorific-stripped.
  const findCourse = (code) => {
    const cc = String(code || '').trim().toLowerCase();
    return cc ? (courses.find((c) => String(c.code).trim().toLowerCase() === cc) || null) : null;
  };
  const findFaculty = (name) => {
    if (!name) return null;
    const fn = String(name).trim().toLowerCase();
    const norm = normalizeName(name);
    return faculty.find((f) => String(f.name).trim().toLowerCase() === fn)
        || faculty.find((f) => normalizeName(f.name) === norm)
        || null;
  };

  // Mirrors the backend resolveAssignment rule so Add/Edit can warn
  // before saving: Verified needs the course AND faculty both found and
  // both 'Active'; anything matched-but-not-Active is Flagged.
  const resolveStatus = (courseCode, facultyName) => {
    const course = findCourse(courseCode);
    const fac = findFaculty(facultyName);
    if (!course || !fac) return 'Pending Match';
    // Catalog courses have no status — only faculty availability can flag.
    if (fac.status !== 'Active') return 'Flagged';
    return 'Verified';
  };

  // Build the pending-confirm state, flagging which entities are missing
  // so the "Confirm & Add" popup can offer to create them.
  const buildPendingConfirm = ({ mode, id, payload, status, courseCode, facultyName }) => ({
    mode, id, payload, status, courseCode, facultyName,
    courseMissing:  !!courseCode  && !findCourse(courseCode),
    facultyMissing: !!facultyName && !findFaculty(facultyName),
    courseTitle: '',
    facultyRole: FACULTY_ROLES[0],
  });

  const statusReason = (status) =>
    status === 'Pending Match'
      ? "the course was not found in the curriculum catalog, or the faculty was not found in this period's Faculty list"
      : 'the matched faculty is not Active (Inactive / On Leave / Emeritus, etc.)';

  const handleConfirmUpload = async () => {
    if (!selectedFile) { alert('Please choose a file first'); return; }
    if (!periodId)     { alert('Select an academic period first'); return; }
    setUploading(true); setUploadError(null);
    try {
      const result = await CourseAssignmentsAPI.upload(selectedFile, periodId);
      await refresh();
      setShowModal(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (result && Array.isArray(result.warnings) && result.warnings.length > 0) {
        setUploadReview({ inserted: result.inserted, warnings: result.warnings });
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onAddAssignment = async (record) => {
    const status = resolveStatus(record.course_code, record.faculty_name);
    if (status !== 'Verified') {
      // Add modal closes; the confirm / Confirm & Add popup gates the save.
      setPendingConfirm(buildPendingConfirm({ mode: 'add', payload: record, status, courseCode: record.course_code, facultyName: record.faculty_name }));
      return;
    }
    await CourseAssignmentsAPI.create(record, periodId);
    await refresh();
  };

  const onSaveEdit = async (patch) => {
    const merged = { ...editingAssignment, ...patch };
    const status = resolveStatus(merged.course_code, merged.faculty_name);
    if (status !== 'Verified') {
      setPendingConfirm(buildPendingConfirm({ mode: 'edit', id: editingAssignment.id, payload: patch, status, courseCode: merged.course_code, facultyName: merged.faculty_name }));
      return;
    }
    await CourseAssignmentsAPI.update(editingAssignment.id, patch);
    await refresh();
  };

  // Save the assignment as-is (status stays Pending Match / Flagged).
  const commitPendingConfirm = async () => {
    if (!pendingConfirm) return;
    try {
      if (pendingConfirm.mode === 'add') {
        await CourseAssignmentsAPI.create(pendingConfirm.payload, periodId);
      } else {
        await CourseAssignmentsAPI.update(pendingConfirm.id, pendingConfirm.payload);
      }
      await refresh();
    } catch (err) {
      alert('Could not save: ' + err.message);
    } finally {
      setPendingConfirm(null);
    }
  };

  // Create the missing curriculum Course / Faculty, then save the
  // assignment — the backend re-resolves against the now up-to-date
  // catalog + faculty list, so the row lands as Verified.
  const createMissingAndSave = async () => {
    if (!pendingConfirm) return;
    try {
      if (pendingConfirm.courseMissing) {
        await CoursesAPI.create({
          course_no: pendingConfirm.courseCode,
          course_title: pendingConfirm.courseTitle || pendingConfirm.courseCode,
        }, periodId);
      }
      if (pendingConfirm.facultyMissing) {
        await FacultyAPI.create({
          name: pendingConfirm.facultyName,
          role: pendingConfirm.facultyRole || FACULTY_ROLES[0],
          status: 'Active',
        }, periodId);
      }
      if (pendingConfirm.mode === 'add') {
        await CourseAssignmentsAPI.create(pendingConfirm.payload, periodId);
      } else {
        await CourseAssignmentsAPI.update(pendingConfirm.id, pendingConfirm.payload);
      }
      await refresh();
    } catch (err) {
      alert('Could not create & save: ' + err.message);
    } finally {
      setPendingConfirm(null);
    }
  };

  // "Remove" in the Edit modal archives the row — it leaves the main
  // table and shows up in the global Floating Archive instead.
  const onArchiveAssignment = async () => {
    if (!editingAssignment) return;
    await CourseAssignmentsAPI.update(editingAssignment.id, { status: 'Archived' });
    await refresh();
    setEditingAssignment(null);
  };

  // Re-validate every assignment in this period against the CURRENT course
  // catalog + faculty list and persist the recomputed statuses. Useful when
  // the course source changed and some rows no longer verify.
  const onRevalidate = async () => {
    if (!periodId || revalidating) return;
    setRevalidating(true);
    try {
      const r = await CourseAssignmentsAPI.revalidate(periodId);
      await refresh();
      const s = (r && r.summary) || {};
      alert(
        `Re-validated ${r.total} assignment${r.total === 1 ? '' : 's'} — ${r.changed} status change${r.changed === 1 ? '' : 's'}.\n\n`
        + `Verified: ${s.Verified || 0}\nPending Match: ${s['Pending Match'] || 0}\nFlagged: ${s.Flagged || 0}`
      );
    } catch (err) {
      alert('Re-validate failed: ' + (err.message || 'unknown error'));
    } finally {
      setRevalidating(false);
    }
  };

  // Edit-status handler for the course-assignment archive
  // (Verified / Pending Match / Flagged).
  const onEditStatus = React.useCallback(async (row, newStatus) => {
    await CourseAssignmentsAPI.update(row.id, { status: newStatus });
    await refresh();
  }, [refresh]);

  // "⋯" menu → pick the archive status to move the row to the Archive.
  const onArchiveRow = React.useCallback(
    (row, status) => onEditStatus(row, status),
    [onEditStatus],
  );

  // --- Resolve flow for Pending Match rows ------------------------------
  // Why a row is pending, read straight off the row.
  const resolveReason = (row) => ({
    courseUnmatched: !!row && row.course_offering_id == null,
    facultyUnmatched: !!(row && row.faculty_name && row.faculty_id == null),
  });

  // Top fuzzy matches from the loaded catalog / faculty — suggest before create.
  const courseSuggestionsFor = (row) => {
    if (!row) return [];
    return courses
      .map((c) => ({ c, s: Math.max(fuzzScore(row.course_code, c.code), fuzzScore(row.course_name, c.title)) }))
      .filter((x) => x.s > 0.15)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((x) => x.c);
  };
  const facultySuggestionsFor = (row) => {
    if (!row || !row.faculty_name) return [];
    return faculty
      .map((f) => ({ f, s: fuzzScore(row.faculty_name, f.name) }))
      .filter((x) => x.s > 0.15)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((x) => x.f);
  };

  // Re-fetch and re-point `resolving` at the fresh row (or close it if no longer
  // Pending). The list endpoint re-resolves server-side → this is auto-revalidate.
  const afterResolveAction = async (rowId) => {
    const [a, c, f] = await Promise.all([
      CourseAssignmentsAPI.list(periodId).then((r) => (Array.isArray(r) ? r : [])).catch(() => []),
      CoursesAPI.list(periodId).then((r) => (Array.isArray(r) ? r : [])).catch(() => []),
      FacultyAPI.list(periodId).then((r) => (Array.isArray(r) ? r : [])).catch(() => []),
    ]);
    setAssignments(a);
    setCourses(c.filter((x) => courseMatchesPeriod(x, currentPeriod)).map((x) => ({ code: x.course_no, title: x.course_title })));
    setFaculty(f);
    // Keep the Resolve modal up: stay on the row if it's still pending (e.g.
    // course fixed but faculty still pending), else advance to the next pending
    // course row — so the modal "shows again" after saving an Add Course.
    const updated = a.find((x) => x.id === rowId);
    if (updated && updated.status === 'Pending Match') {
      setResolving(updated);
    } else {
      const nextPending = partitionByArchive(a, 'courseassign').main
        .find((x) => x.id !== rowId && x.status === 'Pending Match' && x.course_offering_id == null);
      setResolving(nextPending || null);
    }
  };

  const applyExistingCourse = async (row, course) => {
    if (resolveBusy) return;
    setResolveBusy(true);
    try {
      await CourseAssignmentsAPI.update(row.id, { course_code: course.code, course_name: course.title });
      await afterResolveAction(row.id);
    } catch (err) { alert('Could not apply course: ' + (err.message || 'error')); }
    finally { setResolveBusy(false); }
  };
  const applyExistingFaculty = async (row, fac) => {
    if (resolveBusy) return;
    setResolveBusy(true);
    try {
      await CourseAssignmentsAPI.update(row.id, { faculty_name: fac.name });
      await afterResolveAction(row.id);
    } catch (err) { alert('Could not apply faculty: ' + (err.message || 'error')); }
    finally { setResolveBusy(false); }
  };

  // Prefilled "Add Course": code + title from the row, year level normalized,
  // term defaulted to the current period so the new course buckets into this
  // semester (and not "Unassigned").
  const openAddCourseFor = (row) => setAddingCourse({
    course_no: row.course_code || '',
    course_title: row.course_name || '',
    year_lvl: yearToCatalogOption(row.year_level),
    // Term is no longer collected — the backend fixes it to the current period.
  });
  const saveNewCourse = async (record) => {
    await CoursesAPI.create(record, periodId);
    setAddingCourse(null);
    await afterResolveAction(resolving ? resolving.id : null);
  };

  const openAddFacultyFor = (row) => setAddingFacultyFor(row);
  const saveNewFaculty = async (record) => {
    await FacultyAPI.create({ name: record.name, role: record.role || FACULTY_ROLES[0], status: 'Active' }, periodId);
    const rowId = addingFacultyFor ? addingFacultyFor.id : (resolving ? resolving.id : null);
    setAddingFacultyFor(null);
    await afterResolveAction(rowId);
  };

  // Batch: course-unmatched Pending rows (non-archived) for the banner.
  const pendingCourseRows = React.useMemo(
    () => partitionByArchive(assignments, 'courseassign').main
      .filter((a) => a.status === 'Pending Match' && a.course_offering_id == null),
    [assignments],
  );
  const nextPendingCourseRow = (excludeId) => pendingCourseRows.find((a) => a.id !== excludeId) || null;

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
    { key: 'course_code',   label: 'COURSE NO.',       width: 150, type: 'text' },
    { key: 'course_name',   label: 'COURSE OFFERING',  width: 300, type: 'text' },
    { key: 'year_level',    label: 'YEAR LEVEL',       width: 140, type: 'number', sortValue: (r) => yearLevelNum(r.year_level) || 99 },
    { key: 'faculty_name',  label: 'ASSIGNED FACULTY', width: 200, type: 'text' },
    { key: 'date_assigned', label: 'DATE ASSIGNED',    width: 170, type: 'date' },
    { key: 'status',        label: 'STATUS',           width: 130, type: 'number', sortValue: (r) => statusRank('courseassign', r.status) },
  ];
  const [assignSort, setAssignSort] = React.useState({ sortKey: 'course_code', sortDir: 'asc' });
  const onAssignSort = (key) => setAssignSort((s) => nextSort(s, key));
  const sortedAssignments = sortRows(visibleAssignments, ASSIGN_COLUMNS, assignSort.sortKey, assignSort.sortDir);

  // Dropdown options bound to this period's master lists. Picking a
  // Course ID syncs the Course Name and vice-versa, so the two never
  // disagree; the Faculty list drives the Assigned Faculty dropdown.
  const courseCodeOptions = courses.map((c) => ({ value: c.code, label: c.code }));
  const courseNameOptions = courses.map((c) => ({ value: c.title, label: c.title }));
  // { value: name, label: name, sub: role } — the searchable dropdown shows the
  // role as muted secondary text (same UI as the Industry Consultant Name field).
  const facultyOptions = faculty.map((f) => ({ value: f.name, label: f.name, sub: f.role || '' }));

  const onPickCourseCode = (code) => {
    const c = courses.find((x) => x.code === code);
    return { course_name: c ? c.title : '' };
  };
  const onPickCourseName = (title) => {
    const c = courses.find((x) => x.title === title);
    return c ? { course_code: c.code } : {};
  };

  const addFields = [
    { key: 'course_code', label: 'Course No.', required: true, type: 'select', options: courseCodeOptions, onSelect: onPickCourseCode },
    { key: 'course_name', label: 'Course Name', type: 'select', options: courseNameOptions, onSelect: onPickCourseName },
    { key: 'faculty_name', label: 'Assigned Faculty', type: 'searchable-select', options: facultyOptions, placeholder: 'Search faculty…' },
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
                  {active && <Check size={15} color="#EA1212" />}
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
      <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No program assigned for this term</div>
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
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: '#EA1212', flexShrink: 0 }} />
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
            <ActionBtn variant="white" onClick={() => { if (assignments.length > 0) { setConfirmUpload(true); } else { setShowModal(true); } }} disabled={!periodId || !isCurrentTermActive} icon={<Upload size={18} color="#374151" />} label="Upload Course Assignment" />
            {showTable && isCurrentTermActive && <ActionBtn onClick={() => setShowAddModal(true)} icon={<Plus size={18} color="#FFFFFF" />} label="Add Assignment" />}
          </div>
        )}
      </div>

      {/* Full-width hairline below the program identity. */}
      <div style={{ height: 1, background: '#E5E7EB', margin: '14px 0 18px' }} />

      {noProgramAssigned ? blockedState : (<>

      {!isCurrentTermActive && currentPeriod && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, color: '#92400E', fontSize: 13, lineHeight: '1.4' }}>
          <strong>Read-only:</strong> {currentPeriod.label} is closed. Switch to an Active term to make changes.
        </div>
      )}

      {/* Top toolbar — scope + view mode: Current Term (left), View Archived (far right). */}
      <div className={syllabusStyles.header} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PeriodSelector prominent />
        <ViewArchivedButton moduleType="course_assignments" onEditStatus={onEditStatus} />
      </div>

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

      {/* Batch: multiple course-unmatched Pending rows — review/resolve each
          (no silent bulk add), or bulk-upload the curriculum instead. */}
      {showTable && isCurrentTermActive && pendingCourseRows.length >= 2 && (
        <div style={{ marginBottom: 12, padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <AlertTriangle size={18} color="#B45309" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: '#92400E', fontWeight: 700 }}>{pendingCourseRows.length} courses aren&apos;t in your curriculum yet.</span>
          <span style={{ fontSize: 13, color: '#92400E' }}>Review &amp; add/correct each, or bulk-upload your curriculum on the Course Offerings page.</span>
          <button onClick={() => setResolving(pendingCourseRows[0])} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', background: '#B45309', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Tool size={15} /> Resolve all
          </button>
        </div>
      )}

      {showTable && (
        <div className={styles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'hidden' }}>
          {sortedAssignments.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clipboard size={30} color="#9CA3AF" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
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
                <th className={styles.fill} style={{ minWidth: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedAssignments.map((row) => (
                <tr key={row.id}>
                  <td width={150}>{row.course_code}</td>
                  <td width={300} style={{ whiteSpace: 'normal' }}>{row.course_name || ''}</td>
                  <td width={140}>{(() => { const n = yearLevelNum(row.year_level); return n ? (YEAR_ORDINAL[n] + ' Year') : (row.year_level || <span style={{ color: '#9CA3AF' }}>—</span>); })()}</td>
                  <td width={200}>{row.faculty_name || <span style={{ color: '#9CA3AF' }}>— Unassigned —</span>}</td>
                  <td width={170} style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                    <DateCell value={row.date_assigned} />
                  </td>
                  <td width={130}>
                    <span style={{ ...statusPillStyle('courseassign', row.status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                      {row.status}
                    </span>
                  </td>
                  <td className={styles.fill} style={{ minWidth: 90, paddingRight: 12, whiteSpace: 'nowrap' }}>
                    <RowActionsMenu
                      row={row}
                      inline={[
                        isCurrentTermActive && row.status === 'Pending Match' && { key: 'resolve', label: 'Resolve', icon: <Tool size={16} />, onClick: (r) => setResolving(r) },
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
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No course assignments yet</div>
          <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 480 }}>{periodId ? ('Upload a course assignment file for ' + (currentPeriod ? currentPeriod.label : 'this period') + ' to get started — each row is validated against Course Offerings and Faculty.') : 'Select an academic period to begin.'}</div>
        </div>
      )}

      </>)}

      {/* ───── Resolve modal (Pending Match rows) ─────
          Hidden while the Add-Course / Add-Faculty form is open (so that form
          sits on top); it re-appears once the form closes/saves. */}
      {resolving && !addingCourse && !addingFacultyFor && (() => {
        const reason = resolveReason(resolving);
        const courseSugs = reason.courseUnmatched ? courseSuggestionsFor(resolving) : [];
        const facSugs = reason.facultyUnmatched ? facultySuggestionsFor(resolving) : [];
        const nextRow = nextPendingCourseRow(resolving.id);
        return (
          <>
            <div onClick={() => !resolveBusy && setResolving(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200 }} />
            <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(560px, 94vw)', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 12, zIndex: 201, boxShadow: '0 20px 48px rgba(0,0,0,0.22)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Resolve assignment</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                    <strong style={{ color: '#374151' }}>{resolving.course_code || '—'}</strong>{resolving.course_name ? ' — ' + resolving.course_name : ''}
                  </div>
                </div>
                <button onClick={() => setResolving(null)} disabled={resolveBusy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}><X size={20} color="#111827" /></button>
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#92400E' }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Why it&apos;s pending:</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {reason.courseUnmatched && <li>The course <strong>{resolving.course_code || '(no code)'}</strong> isn&apos;t in this term&apos;s curriculum.</li>}
                    {reason.facultyUnmatched && <li>The faculty <strong>{resolving.faculty_name}</strong> isn&apos;t in this term&apos;s faculty list.</li>}
                  </ul>
                </div>

                {reason.courseUnmatched && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Fix the course</div>
                    {courseSugs.length > 0 ? (
                      <>
                        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Did you mean one of these existing courses?</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {courseSugs.map((c) => (
                            <button key={c.code} disabled={resolveBusy} onClick={() => applyExistingCourse(resolving, c)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#FFFFFF', cursor: resolveBusy ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                              <span style={{ minWidth: 0 }}><strong style={{ color: '#111827' }}>{c.code}</strong> <span style={{ color: '#6B7280' }}>— {c.title}</span></span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1D4ED8', fontWeight: 600, flexShrink: 0 }}>Use <ArrowRight size={14} /></span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: '#6B7280' }}>No similar course found in this term&apos;s curriculum.</div>
                    )}
                    <button disabled={resolveBusy} onClick={() => openAddCourseFor(resolving)} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', background: '#1F2937', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: resolveBusy ? 'not-allowed' : 'pointer' }}>
                      <Plus size={16} /> Add &quot;{resolving.course_code}&quot; as a new course
                    </button>
                  </div>
                )}

                {reason.facultyUnmatched && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Fix the faculty</div>
                    {facSugs.length > 0 ? (
                      <>
                        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Did you mean one of these faculty?</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {facSugs.map((f) => (
                            <button key={f.id} disabled={resolveBusy} onClick={() => applyExistingFaculty(resolving, f)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 8, background: '#FFFFFF', cursor: resolveBusy ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                              <span style={{ minWidth: 0 }}><strong style={{ color: '#111827' }}>{f.name}</strong>{f.role ? <span style={{ color: '#6B7280' }}> ({f.role})</span> : null}{f.status && f.status !== 'Active' ? <span style={{ color: '#B45309' }}> · {f.status}</span> : null}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1D4ED8', fontWeight: 600, flexShrink: 0 }}>Use <ArrowRight size={14} /></span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: '#6B7280' }}>No similar faculty found in this term&apos;s list.</div>
                    )}
                    <button disabled={resolveBusy} onClick={() => openAddFacultyFor(resolving)} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', background: '#1F2937', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: resolveBusy ? 'not-allowed' : 'pointer' }}>
                      <UserPlus size={16} /> Add &quot;{resolving.faculty_name}&quot; as new faculty
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid #E5E7EB' }}>
                <button onClick={() => setResolving(null)} disabled={resolveBusy} style={{ height: 38, padding: '0 16px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
                {nextRow && (
                  <button onClick={() => setResolving(nextRow)} disabled={resolveBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Next pending <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* Prefilled Add-Course form (Resolve → add new course). */}
      {addingCourse && (
        <AddRecordModal
          title="Add Course"
          fields={NEW_COURSE_FIELDS}
          initial={addingCourse}
          onSubmit={saveNewCourse}
          onClose={() => setAddingCourse(null)}
        />
      )}

      {/* Prefilled Add-Faculty form (Resolve → add new faculty). */}
      {addingFacultyFor && (
        <AddRecordModal
          title="Add Faculty"
          fields={FACULTY_ADD_FIELDS}
          initial={{ name: addingFacultyFor.faculty_name || '', role: FACULTY_ROLES[0] }}
          onSubmit={saveNewFaculty}
          onClose={() => setAddingFacultyFor(null)}
        />
      )}

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
            {
              key: 'course_code', label: 'Course No.', required: true, type: 'select',
              options: courseCodeOptions, onSelect: onPickCourseCode,
              highlight: editingAssignment.status === 'Pending Match' && !editingAssignment.course_offering_id,
            },
            { key: 'course_name', label: 'Course Offering', type: 'select', options: courseNameOptions, onSelect: onPickCourseName },
            {
              key: 'faculty_name', label: 'Assigned Faculty', type: 'searchable-select',
              options: facultyOptions, placeholder: 'Search faculty…',
              highlight: editingAssignment.status === 'Pending Match' && !editingAssignment.faculty_id,
            },
          ]}
          record={editingAssignment}
          onSave={onSaveEdit}
          onClose={() => setEditingAssignment(null)}
          onRemove={onArchiveAssignment}
          removeLabel="Remove"
        />
      )}

      <ConfirmModal
        open={confirmUpload}
        title="Replace course assignment data?"
        message={'Uploading this file will replace existing course assignments for ' + (currentPeriod ? currentPeriod.label : 'this period') + '. Proceed?'}
        confirmLabel="Continue to upload"
        onConfirm={() => { setConfirmUpload(false); setShowModal(true); }}
        onCancel={() => setConfirmUpload(false)}
      />

      {/* Flagged → simple override confirm. Pending Match → Confirm & Add (below). */}
      <ConfirmModal
        open={!!pendingConfirm && pendingConfirm.status === 'Flagged'}
        title={pendingConfirm ? ('Save as ' + pendingConfirm.status + '?') : ''}
        message={pendingConfirm ? ('This course assignment will be saved as "' + pendingConfirm.status + '" because ' + statusReason(pendingConfirm.status) + '. Save it anyway?') : ''}
        confirmLabel="Save anyway"
        onConfirm={commitPendingConfirm}
        onCancel={() => setPendingConfirm(null)}
      />

      {pendingConfirm && pendingConfirm.status === 'Pending Match' && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60 }} onClick={() => setPendingConfirm(null)} />
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(520px, 92vw)', maxHeight: '85vh', background: '#FFFFFF', borderRadius: 12, zIndex: 61, display: 'flex', flexDirection: 'column', boxShadow: '0 18px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>Confirm &amp; Add</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                {(pendingConfirm.courseMissing || pendingConfirm.facultyMissing)
                  ? "The highlighted records aren't in this period's master lists yet. Create them now to verify the assignment, or save it as Pending Match for later."
                  : 'This assignment has no matching faculty yet. Save it as Pending Match, or cancel and pick a faculty.'}
              </div>
            </div>
            <div style={{ padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {pendingConfirm.courseMissing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>New Course</div>
                  <label style={{ fontSize: 12, color: '#6B7280' }}>Course No.</label>
                  <input value={pendingConfirm.courseCode || ''} disabled style={{ height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#F9FAFB', fontSize: 14 }} />
                  <label style={{ fontSize: 12, color: '#6B7280' }}>Course Title</label>
                  <input
                    value={pendingConfirm.courseTitle}
                    onChange={(e) => setPendingConfirm((p) => ({ ...p, courseTitle: e.target.value }))}
                    placeholder="e.g. Introduction to Computing"
                    style={{ height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 14 }}
                  />
                </div>
              )}
              {pendingConfirm.facultyMissing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>New Faculty Profile</div>
                  <label style={{ fontSize: 12, color: '#6B7280' }}>Name</label>
                  <input value={pendingConfirm.facultyName || ''} disabled style={{ height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#F9FAFB', fontSize: 14 }} />
                  <label style={{ fontSize: 12, color: '#6B7280' }}>Role</label>
                  <select
                    value={pendingConfirm.facultyRole}
                    onChange={(e) => setPendingConfirm((p) => ({ ...p, facultyRole: e.target.value }))}
                    style={{ height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 14, background: '#FFFFFF' }}
                  >
                    {FACULTY_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setPendingConfirm(null)} style={{ height: 40, padding: '0 16px', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={commitPendingConfirm} style={{ height: 40, padding: '0 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>Save as Pending Match</button>
              {(pendingConfirm.courseMissing || pendingConfirm.facultyMissing) && (
                <button onClick={createMissingAndSave} style={{ height: 40, padding: '0 16px', background: '#1F2937', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: 'pointer', fontWeight: 500 }}>Create &amp; Save</button>
              )}
            </div>
          </div>
        </>
      )}

      {uploadReview && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60 }} onClick={() => setUploadReview(null)} />
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(640px, 92vw)', maxHeight: '80vh', background: '#FFFFFF', borderRadius: 12, zIndex: 61, display: 'flex', flexDirection: 'column', boxShadow: '0 18px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>Upload validation</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                {uploadReview.inserted} assignment{uploadReview.inserted === 1 ? '' : 's'} imported. {uploadReview.warnings.length} need{uploadReview.warnings.length === 1 ? 's' : ''} attention:
              </div>
            </div>
            <div style={{ padding: '8px 24px', overflowY: 'auto' }}>
              {uploadReview.warnings.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ fontSize: 14, color: '#111827' }}>
                    <strong>Row {w.row}</strong> — {w.course_code}{w.faculty_name ? ' / ' + w.faculty_name : ''}
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{w.message}</div>
                  </div>
                  <span style={{ ...statusPillStyle('courseassign', w.status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{w.status}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setUploadReview(null)} style={{ height: 40, padding: '0 20px', background: '#1F2937', color: '#FFFFFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>Got it</button>
            </div>
          </div>
        </>
      )}


      {showModal && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={() => !uploading && setShowModal(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, padding: 24, background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Course Assignment</div>
            <div onClick={() => fileInputRef.current && fileInputRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setSelectedFile(f); }} style={{ border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Upload size={36} color="#9CA3AF" />
              <div style={{ fontWeight: 600, color: '#111827' }}>{selectedFile ? selectedFile.name : 'Drag & drop file here'}</div>
              <div style={{ color: '#6B7280', fontSize: 13 }}>Upload .xlsx, .xls or .csv</div>
              <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setSelectedFile(f); }} style={{ display: 'none' }} />
            </div>
            {uploadError && <div style={{ color: '#B91C1C', fontSize: 13 }}>{uploadError}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={uploading} onClick={() => { setSelectedFile(null); setShowModal(false); }} style={{ flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 500 }}>Cancel</button>
              <button disabled={uploading} onClick={handleConfirmUpload} style={{ flex: 1, height: 40, background: '#1F2937', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: uploading ? 0.7 : 1 }}>{uploading ? 'Uploading…' : 'Upload'}</button>
            </div>
          </div>
        </>
      )}
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
