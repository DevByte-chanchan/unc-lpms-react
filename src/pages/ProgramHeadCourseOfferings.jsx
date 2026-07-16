/**
 * Program Head — Curriculum (Courses).
 *
 * Master card grid of catalog courses (TOS card aesthetic, no logo).
 * Clicking a card opens a FULL-PAGE detail view (not a drawer) showing
 * the course meta, interactive prerequisite chips (click to navigate),
 * and the list of its Course Offerings (Program_Course_Offering rows,
 * each a curriculum revision + description).
 *
 * Powered by the global curriculum catalog: CoursesAPI (Course +
 * Prerequisite + Program_Course_Offering). Not period-scoped.
 */
import React from "react";
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import PeriodSelector from "../components/PeriodSelector.jsx";
import EditEntityModal from "../components/EditEntityModal.jsx";
import { Search, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Link2, Clipboard, Eye, Edit2, FileText, Upload, X, ChevronDown, Check, Layers, AlertTriangle, Archive, RotateCcw } from "react-feather";
import syllabusStyles from '../styles/SyllabusSections.module.sass';
import { CoursesAPI, ProgramsAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import { useCurrentUser } from '../services/currentUser.jsx';
import { courseSemesterOf, periodSemesterOf } from '../services/courseTerm.js';

const ACCENT = '#B91C1C';
const SLATE9 = '#0F172A';
const SLATE7 = '#334155';
const SLATE5 = '#64748B';
const SLATE3 = '#CBD5E1';
const SLATE2 = '#E2E8F0';
const SLATE1 = '#F1F5F9';
const SLATE05 = '#F8FAFC';

// Classification → a subtle colour chip. Matched case-insensitively; anything
// unrecognised falls back to neutral gray.
const classificationColor = (raw) => {
  const s = String(raw || '').toLowerCase().trim();
  if (s.includes('core'))                          return { bg: '#EFF6FF', text: '#1D4ED8' }; // blue
  if (s.includes('professional'))                  return { bg: '#EEF2FF', text: '#4338CA' }; // indigo
  if (s.includes('elective'))                      return { bg: '#FFFBEB', text: '#B45309' }; // amber
  if (s.startsWith('ge') || s.includes('general')) return { bg: '#F0FDFA', text: '#0F766E' }; // teal
  return { bg: '#F3F4F6', text: '#374151' };                                                  // gray
};

// Sort options for the year-detail card grid. `short` is what the Sort button
// surfaces ("Sort: Code ↑"); `get` pulls the comparable value off a course.
const SORT_FIELDS = [
  { key: 'code',           label: 'Course Code',    short: 'Code',  get: (c) => c.course_no },
  { key: 'title',          label: 'Title',          short: 'Title', get: (c) => c.course_title },
  { key: 'classification', label: 'Classification', short: 'Class', get: (c) => c.classification },
];

// The catalog stores year as a label string ("THIRD YEAR"); the two-level
// view derives a 1–4 number from it. Anything unrecognised buckets to 0
// ("Unassigned") so no course is ever hidden.
const YEAR_DEFS = [
  { n: 1, label: '1st Year', long: 'FIRST YEAR' },
  { n: 2, label: '2nd Year', long: 'SECOND YEAR' },
  { n: 3, label: '3rd Year', long: 'THIRD YEAR' },
  { n: 4, label: '4th Year', long: 'FOURTH YEAR' },
];
const yearLevelNum = (yearLvl) => {
  const s = String(yearLvl || '').toLowerCase();
  if (s.includes('first')  || s.includes('1st') || s.trim() === '1') return 1;
  if (s.includes('second') || s.includes('2nd') || s.trim() === '2') return 2;
  if (s.includes('third')  || s.includes('3rd') || s.trim() === '3') return 3;
  if (s.includes('fourth') || s.includes('4th') || s.trim() === '4') return 4;
  return null;
};
const yearLabelOf = (n) => (YEAR_DEFS.find((y) => y.n === n) || {}).label || 'Unassigned';

// Credit / contact-hour columns are stored as single strings
// ("2 LEC, 1 LAB" / "2 Hrs Lec, 3 Hrs Lab"). splitLecLab parses the numeric
// lecture/lab parts out — used by the YearCard LEC/LAB/Units totals.
const splitLecLab = (str) => {
  const s = String(str || '');
  const lec = s.match(/(\d+(?:\.\d+)?)\s*(?:hrs?\s*)?lec/i);
  const lab = s.match(/(\d+(?:\.\d+)?)\s*(?:hrs?\s*)?lab/i);
  return { lec: lec ? lec[1] : '', lab: lab ? lab[1] : '' };
};

// Recombine edited lecture/lab hour inputs back into the contact-hours string
// the column stores ("2 Hrs Lec, 3 Hrs Lab"); blank parts are dropped.
const joinHours = (lec, lab) => {
  const parts = [];
  if (String(lec ?? '').trim() !== '') parts.push(String(lec).trim() + ' Hrs Lec');
  if (String(lab ?? '').trim() !== '') parts.push(String(lab).trim() + ' Hrs Lab');
  return parts.join(', ');
};
// Recombine lecture/lab credit units into the credit string ("2 LEC, 1 LAB").
const joinCredit = (lec, lab) => {
  const parts = [];
  if (String(lec ?? '').trim() !== '') parts.push(String(lec).trim() + ' LEC');
  if (String(lab ?? '').trim() !== '') parts.push(String(lab).trim() + ' LAB');
  return parts.join(', ');
};
// Numeric total of a credit/hours lec+lab pair (blank → 0).
const sumLecLab = (parts) => (Number(parts.lec) || 0) + (Number(parts.lab) || 0);

// Credit / units metadata pill — deliberately quieter than the colour-coded
// classification tag (plain outline + a small units icon) so the two don't
// read as the same kind of thing.
const CreditPill = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: '#FFFFFF', border: '1px solid ' + SLATE3, color: SLATE7, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
    <Layers size={12} color={SLATE5} /> {children}
  </span>
);

const MetaLabel = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: SLATE5 }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 600, color: SLATE9 }}>{value === undefined || value === null || value === '' ? '—' : value}</span>
  </div>
);

const CourseCard = ({ course, onOpen }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(course.course_id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(course.course_id); } }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', cursor: 'pointer',
        background: '#FFFFFF',
        border: '1px solid ' + (hover ? ACCENT : SLATE2),
        borderRadius: 14, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        boxShadow: hover ? '0 8px 22px rgba(24,25,26,0.10), 0 2px 4px rgba(15,23,42,0.04)' : '0 1px 3px rgba(15,23,42,0.05)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
      }}
    >
      {course.classification && (() => {
        const cc = classificationColor(course.classification);
        return (
          <div style={{ position: 'absolute', top: 16, right: 16, background: cc.bg, color: cc.text, border: 'none', borderRadius: 9999, padding: '4px 11px', fontSize: 12, fontWeight: 600 }}>
            {course.classification}
          </div>
        );
      })()}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#374151', textTransform: 'uppercase', marginBottom: 16, paddingRight: 90 }}>
          {course.course_no}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: SLATE9, lineHeight: 1.35, letterSpacing: '-0.01em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '2.7em' }} title={course.course_title}>
          {course.course_title}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {course.credit && <CreditPill>{course.credit}</CreditPill>}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(course.course_id); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 8, border: '1px solid ' + (hover ? ACCENT : SLATE2), background: hover ? '#FEF2F2' : '#FFFFFF', color: hover ? ACCENT : SLATE7, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.15s ease, background 0.15s ease, color 0.15s ease' }}
        >
          <Eye size={15} /> View
        </button>
      </div>
    </div>
  );
};

const SectionTitle = ({ children, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
    <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: SLATE5 }}>{children}</div>
    {right}
  </div>
);

// One labelled stat tile inside a YearCard (e.g. "1st Sem → 6").
const YearStat = ({ label, value }) => (
  <div style={{ background: SLATE05, border: '1px solid ' + SLATE2, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: SLATE5 }}>{label}</span>
    <span style={{ fontSize: 22, fontWeight: 600, color: SLATE9, lineHeight: 1 }}>{value}</span>
  </div>
);

// Level-1 year tile. Fixed identical layout/height for every year (so empty
// and full years line up): header (year) · a 2×2 labelled stat grid
// (Courses, Units, Lecture, Laboratory) · a clickable "View Curriculum"
// footer. Semester is NOT shown — the selected term already fixes it.
const YearCard = ({ label, count, summary, onOpen }) => {
  const [hover, setHover] = React.useState(false);
  const stats = [
    { label: 'Courses', value: count },
    { label: 'Units', value: summary.lec + summary.lab },
    { label: 'Lecture Units', value: summary.lec },
    { label: 'Lab Units', value: summary.lab },
  ];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer', height: 312,
        background: '#FFFFFF',
        border: '1px solid ' + (hover ? ACCENT : SLATE2),
        borderRadius: 14, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: hover ? '0 8px 22px rgba(24,25,26,0.10), 0 2px 4px rgba(15,23,42,0.04)' : '0 1px 3px rgba(15,23,42,0.05)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
      }}
    >
      {/* Body */}
      <div style={{ flex: '1 1 auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: SLATE9, letterSpacing: '-0.01em' }}>{label}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {stats.map((s) => <YearStat key={s.label} label={s.label} value={s.value} />)}
        </div>
      </div>

      {/* Footer call-to-action — whole card is clickable; this is the cue. */}
      <div
        style={{
          flexShrink: 0, borderTop: '1px solid ' + SLATE2,
          padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: hover ? '#FEF2F2' : SLATE05,
          color: hover ? ACCENT : SLATE7, fontWeight: 500, fontSize: 14,
          transition: 'background 0.15s ease, color 0.15s ease',
        }}
      >
        <span>View Curriculum</span>
        <ArrowRight size={16} style={{ transform: hover ? 'translateX(2px)' : 'translateX(0)', transition: 'transform 0.18s ease' }} />
      </div>
    </div>
  );
};

const ProgramHeadCourseOfferings = () => {
  const { currentPeriod, isCurrentTermActive } = usePeriod();
  const periodId = currentPeriod && currentPeriod.id;

  const [courses, setCourses]   = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState(null); // level-1 year (1–4, 0=unassigned) or null=overview
  const [selectedId, setSelectedId] = React.useState(null);   // full-page detail (course_id)
  const [detail, setDetail]     = React.useState(null);       // fetched course + prereqs + offerings
  const [sortOpen, setSortOpen]   = React.useState(false);
  const [sortField, setSortField] = React.useState('code'); // default: Code ↑
  const [sortDir, setSortDir]     = React.useState('asc');
  const [programMenuOpen, setProgramMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showUpload, setShowUpload]   = React.useState(false);
  const [pickedFile, setPickedFile]   = React.useState(null);
  const [uploading, setUploading]     = React.useState(false);
  const [uploadError, setUploadError] = React.useState(null);
  const [uploadResult, setUploadResult] = React.useState(null);
  const uploadInputRef = React.useRef(null);
  // "Set year levels" review step: the preview's unrecognized rows, plus the
  // per-course choice ('FIRST YEAR'.. | 'SKIP' | '' = undecided).
  const [resolveRows, setResolveRows] = React.useState(null);
  const [yearChoices, setYearChoices] = React.useState({});
  // Prerequisite options — LAST semester's courses (all programs). Used to
  // resolve a prereq code to its title for the read-only detail view's chips.
  const [prereqOptions, setPrereqOptions] = React.useState([]);
  // Archive: courses pulled from the program show in the "View Archived" panel
  // and can be restored. Archiving itself is done from the Edit modal.
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [archivedCourses, setArchivedCourses] = React.useState([]);
  const [archiveBusyId, setArchiveBusyId] = React.useState(null);
  const [editing, setEditing] = React.useState(null); // course being edited (hours/credit) — also hosts Archive

  // The signed-in Program Head (stubbed in CurrentUser until real auth).
  const { name: userName, role: userRole, facultyId, facultyLoaded } = useCurrentUser();

  const refresh = React.useCallback(() => {
    if (!periodId) { setCourses([]); setArchivedCourses([]); return; }
    CoursesAPI.list(periodId).then((rows) => setCourses(Array.isArray(rows) ? rows : [])).catch(() => setCourses([]));
    CoursesAPI.listArchived(periodId).then((rows) => setArchivedCourses(Array.isArray(rows) ? rows : [])).catch(() => setArchivedCourses([]));
  }, [periodId]);
  React.useEffect(() => { refresh(); }, [refresh]);

  // Prerequisite options come from LAST semester (the prior period with data),
  // across all programs — a prerequisite is a course taken in an earlier term.
  React.useEffect(() => {
    if (!periodId) { setPrereqOptions([]); return; }
    let cancelled = false;
    CoursesAPI.prereqOptions(periodId)
      .then((r) => { if (!cancelled) setPrereqOptions(Array.isArray(r && r.courses) ? r.courses : []); })
      .catch(() => { if (!cancelled) setPrereqOptions([]); });
    return () => { cancelled = true; };
  }, [periodId]);

  // "My program(s)" — the program(s) the signed-in user heads in the active
  // term, resolved by the Dean's assignment (program_head_id / head name). No
  // hardcoded program code: a Dean reassignment flows straight through.
  const [myPrograms, setMyPrograms] = React.useState([]);
  const [programsLoaded, setProgramsLoaded] = React.useState(false);
  const [selectedProgramId, setSelectedProgramId] = React.useState(null);
  React.useEffect(() => {
    // Wait for the per-period faculty resolution so head_id is available.
    if (!periodId || !facultyLoaded) { setMyPrograms([]); setProgramsLoaded(false); return undefined; }
    let cancelled = false;
    setProgramsLoaded(false);
    ProgramsAPI.listForHead(periodId, { headId: facultyId, headName: userName })
      .then((rows) => { if (!cancelled) { setMyPrograms(Array.isArray(rows) ? rows : []); setProgramsLoaded(true); } })
      .catch(() => { if (!cancelled) { setMyPrograms([]); setProgramsLoaded(true); } });
    return () => { cancelled = true; };
  }, [periodId, facultyLoaded, facultyId, userName]);

  // Keep a valid selection as the program set changes (default to the first).
  React.useEffect(() => {
    setSelectedProgramId((prev) => (prev && myPrograms.some((p) => p.id === prev) ? prev : (myPrograms[0] ? myPrograms[0].id : null)));
  }, [myPrograms]);

  const currentProgram = React.useMemo(
    () => myPrograms.find((p) => p.id === selectedProgramId) || null,
    [myPrograms, selectedProgramId],
  );
  const hasMultiplePrograms = myPrograms.length > 1;
  // Settled with zero assignments → the "not assigned" blocked state.
  const noProgramAssigned = !!periodId && facultyLoaded && programsLoaded && myPrograms.length === 0;

  // Page identity. The program code reads as the page's identity; null until a
  // program resolves (the plain "Course Offerings" title shows meanwhile).
  const programCode = currentProgram ? currentProgram.code : null;
  const programName = currentProgram ? currentProgram.name : null;
  const programLabel = currentProgram ? (currentProgram.code || 'your program') : 'your program';

  // Switching terms shows a different curriculum copy — return to the year
  // overview and drop any open detail so nothing from the previous term lingers.
  React.useEffect(() => { setSelectedId(null); setSelectedYear(null); }, [periodId]);

  React.useEffect(() => {
    if (selectedId == null) { setDetail(null); return undefined; }
    let cancelled = false;
    setDetail(null);
    CoursesAPI.get(selectedId)
      .then((row) => { if (!cancelled) setDetail(row); })
      .catch(() => { if (!cancelled) setDetail(null); });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Instant header from the list while the detail loads.
  const headerCourse = selectedId != null ? (courses.find((c) => c.course_id === selectedId) || detail) : null;

  // Save the only editable fields — Lecture/Lab Credit + Lecture/Lab Hours. The
  // lec/lab inputs recombine into the credit ("2 LEC, 1 LAB") and contact-hours
  // ("2 Hrs Lec, 3 Hrs Lab") strings. course_no/title/etc. stay read-only.
  const onSaveEdit = async (patch) => {
    if (!editing) return;
    const out = {};
    if ('lec_credit' in patch || 'lab_credit' in patch) {
      const init = splitLecLab(editing.credit);
      out.credit = joinCredit(
        'lec_credit' in patch ? patch.lec_credit : init.lec,
        'lab_credit' in patch ? patch.lab_credit : init.lab,
      );
    }
    if ('lec_hours' in patch || 'lab_hours' in patch) {
      const init = splitLecLab(editing.contact_hrs);
      out.contact_hrs = joinHours(
        'lec_hours' in patch ? patch.lec_hours : init.lec,
        'lab_hours' in patch ? patch.lab_hours : init.lab,
      );
    }
    await CoursesAPI.update(editing.course_id, out);
    refresh();
    if (selectedId === editing.course_id) {
      const fresh = await CoursesAPI.get(editing.course_id).catch(() => null);
      if (fresh) setDetail(fresh);
    }
  };

  // Archive a course that's no longer offered by the program — it leaves the
  // catalog grid (and every page that reads it) but stays restorable from
  // "View Archived". Invoked from the Edit modal's "Archive course" action.
  const onArchiveCourse = async () => {
    if (!editing) return;
    await CoursesAPI.update(editing.course_id, { archived: true });
    if (selectedId === editing.course_id) { setSelectedId(null); setDetail(null); }
    setEditing(null);
    refresh();
  };
  const onRestoreCourse = async (course) => {
    if (!course || archiveBusyId) return;
    setArchiveBusyId(course.course_id);
    try {
      await CoursesAPI.update(course.course_id, { archived: false });
      refresh();
    } finally {
      setArchiveBusyId(null);
    }
  };

  // Finish an upload by committing it (optionally with the popup's resolutions),
  // then refresh + show the summary and clear the picked file.
  const commitUpload = async (resolutions) => {
    // Default rows without a Program column to the program being viewed.
    const r = await CoursesAPI.uploadCommit(pickedFile, periodId, { ...(resolutions || {}), programId: selectedProgramId });
    refresh();
    setUploadResult(r);
    setResolveRows(null);
    setYearChoices({});
    setPickedFile(null);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  // Step 1 — PREVIEW first (saves nothing). If every year level was recognized,
  // commit straight away; otherwise open the "Set year levels" review modal so
  // the user resolves each unrecognized course before anything is imported.
  const onUploadCourses = async () => {
    if (!pickedFile || uploading) return;
    setUploading(true); setUploadError(null); setUploadResult(null);
    try {
      const preview = await CoursesAPI.uploadPreview(pickedFile, periodId, selectedProgramId);
      const unresolved = Array.isArray(preview.unassigned) ? preview.unassigned : [];
      if (unresolved.length === 0) {
        await commitUpload();
      } else {
        setResolveRows(unresolved);
        const init = {};
        unresolved.forEach((u) => { init[u.course_no] = ''; }); // start undecided
        setYearChoices(init);
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Step 2 — commit with the chosen resolutions (year overrides + "don't import").
  const onConfirmResolve = async () => {
    if (!pickedFile || uploading || !resolveRows) return;
    const yearLevelOverrides = {};
    const skipCodes = [];
    resolveRows.forEach((u) => {
      const c = yearChoices[u.course_no];
      if (c === 'SKIP') skipCodes.push(u.course_no);
      else if (c) yearLevelOverrides[u.course_no] = c;
    });
    setUploading(true); setUploadError(null);
    try {
      await commitUpload({ yearLevelOverrides, skipCodes });
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Bulk helper: assign a choice to every row that's still undecided.
  const setAllRemaining = (choice) => {
    setYearChoices((prev) => {
      const next = { ...prev };
      (resolveRows || []).forEach((u) => { if (!next[u.course_no]) next[u.course_no] = choice; });
      return next;
    });
  };

  const unresolvedCount = (resolveRows || []).filter((u) => !yearChoices[u.course_no]).length;

  const closeUpload = () => {
    if (uploading) return;
    setShowUpload(false); setPickedFile(null); setUploadError(null); setUploadResult(null);
    setResolveRows(null); setYearChoices({});
  };

  // Only courses that actually belong to this academic term are shown: a
  // course's Term ("1st/2nd Semester …") must match the selected period's
  // semester. This drops rows that an earlier carry-forward/adoption swept
  // into a term they don't belong to (e.g. a 2nd-Sem course in a 1st-Sem term).
  const termSem = periodSemesterOf(currentPeriod);
  const termCourses = React.useMemo(
    () => courses.filter((c) => courseSemesterOf(c) === termSem),
    [courses, termSem],
  );
  // Archived courses for THIS term's semester — matches what the grid scopes to.
  const archivedInTerm = React.useMemo(
    () => archivedCourses.filter((c) => courseSemesterOf(c) === termSem),
    [archivedCourses, termSem],
  );

  // Bucket courses by derived year level (0 = Unassigned) for the overview,
  // plus a small per-year summary (LEC/LAB totals).
  const byYear = React.useMemo(() => {
    const m = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    termCourses.forEach((c) => { const y = yearLevelNum(c.year_lvl) ?? 0; m[y].push(c); });
    return m;
  }, [termCourses]);
  const summarizeYear = (list) => {
    let lec = 0, lab = 0;
    list.forEach((c) => {
      const parts = splitLecLab(c.credit);
      lec += Number(parts.lec) || 0;
      lab += Number(parts.lab) || 0;
    });
    return { lec, lab };
  };

  // Year-detail list: courses in the selected year, narrowed by search,
  // then ordered by the Sort control. (Semester is fixed by the term, so
  // there is no per-course semester filter.)
  const visibleCourses = React.useMemo(() => {
    let rows = termCourses.filter((c) => (yearLevelNum(c.year_lvl) ?? 0) === selectedYear);
    const q = searchQuery.trim().toLowerCase();
    if (q) rows = rows.filter((c) => [c.course_no, c.course_title, c.classification].filter((v) => v != null).some((v) => String(v).toLowerCase().includes(q)));
    const field = SORT_FIELDS.find((f) => f.key === sortField) || SORT_FIELDS[0];
    rows = rows.slice().sort((a, b) => {
      const cmp = String(field.get(a) || '').localeCompare(String(field.get(b) || ''), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return rows;
  }, [termCourses, selectedYear, searchQuery, sortField, sortDir]);

  // Prerequisites to show: prefer the free-text column (it preserves codes that
  // aren't in the catalog), splitting it into chips. A code that DOES resolve to
  // a catalog course keeps its title + click-to-navigate; others show plain.
  // Fall back to the join array for courses that only have linked prerequisites.
  const prerequisites = React.useMemo(() => {
    const join = (detail && Array.isArray(detail.prerequisites)) ? detail.prerequisites : [];
    const text = detail && detail.prerequisites_text ? String(detail.prerequisites_text).trim() : '';
    if (!text) return join;
    // Title lookup for last-semester (cross-period) prereqs that don't resolve
    // to a current-term course but DO appear in the prerequisite options.
    const optByCode = new Map(prereqOptions.map((o) => [String(o.course_no).trim().toLowerCase(), o]));
    return text.split(/[,;|/\n]+/).map((s) => s.trim()).filter(Boolean).map((code) => {
      const lc = code.toLowerCase();
      const m = join.find((p) => p.course_no && p.course_no.toLowerCase() === lc);
      if (m) return { course_id: m.course_id, course_no: m.course_no, course_title: m.course_title };
      const o = optByCode.get(lc);
      return { course_id: null, course_no: code, course_title: o ? o.course_title : null };
    });
  }, [detail, prereqOptions]);
  const offerings = (detail && Array.isArray(detail.revisions))
    ? detail.revisions.slice().sort((a, b) => a.revision_number - b.revision_number)
    : [];

  /* ----------------------------- Page header --------------------------- */
  // Shared across both levels so PeriodSelector + Add/Upload stay reachable.
  const yearCount = byYear[selectedYear] ? byYear[selectedYear].length : 0;

  // Program switcher — shown only when the user heads more than one program.
  // Switching re-scopes the page (returns to the year overview).
  const programSwitcher = (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setProgramMenuOpen((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, color: SLATE7, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <span>Program: <strong style={{ color: SLATE9 }}>{currentProgram ? currentProgram.code : '—'}</strong></span>
        <ChevronDown size={15} color={SLATE5} />
      </button>
      {programMenuOpen && (
        <>
          <div onClick={() => setProgramMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
          <div style={{ position: 'absolute', top: '110%', right: 0, background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 260, padding: 6, zIndex: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: SLATE5, padding: '6px 10px 4px' }}>Your programs</div>
            {myPrograms.map((p) => {
              const active = p.id === selectedProgramId;
              return (
                <button key={p.id} onClick={() => { setSelectedProgramId(p.id); setProgramMenuOpen(false); setSelectedYear(null); setSelectedId(null); setSearchQuery(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', textAlign: 'left', background: active ? SLATE1 : 'transparent', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 6 }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: SLATE9 }}>{p.code}</span>
                    <span style={{ fontSize: 12, color: SLATE5, marginLeft: 8 }}>{p.name}</span>
                  </span>
                  {active && <Check size={15} color={ACCENT} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const pageHeader = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        {/* Program identity — LINE 1 "BSIT: Course Offerings", LINE 2 full name. */}
        <div style={{ minWidth: 0, display: 'flex', gap: 12 }}>
          <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: '#EA1212', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 24, color: SLATE9, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
              {programCode
                ? (<><span style={{ fontWeight: 800 }}>{programCode}</span><span style={{ fontWeight: 600 }}>: Course Offerings</span></>)
                : (<span style={{ fontWeight: 700 }}>Course Offerings</span>)}
            </div>
            {programName && (
              <div style={{ fontSize: 13, color: SLATE5, marginTop: 4 }}>{programName}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
          {/* Program switcher sits top-right on the year overview. */}
          {hasMultiplePrograms && selectedYear == null && programSwitcher}
          {/* Upload is available at BOTH the program overview (one file can
              populate all four year levels at once) and inside a year drilldown.
              It's the only way courses enter the catalog — the list is owned by
              the school's system, so the Program Head doesn't add/edit here. */}
          {isCurrentTermActive && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowUpload(true)}
                disabled={!periodId}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 18px', height: 40, background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 6, color: '#374151', cursor: periodId ? 'pointer' : 'not-allowed', fontWeight: 600, whiteSpace: 'nowrap', opacity: periodId ? 1 : 0.6 }}
              >
                <Upload size={18} /> Upload Course Offerings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full-width hairline below the program identity. */}
      <div style={{ height: 1, background: '#E5E7EB', margin: '14px 0' }} />

      {/* Drilled-in only: "← Back to Year Levels  |  <Year> (n courses)". */}
      {selectedYear != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            onClick={() => { setSelectedYear(null); setSearchQuery(''); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: SLATE7, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={18} /> Back to Year Levels
          </button>
          <span style={{ color: '#D1D5DB' }}>|</span>
          <span style={{ fontSize: 15 }}>
            <span style={{ fontWeight: 700, color: SLATE9 }}>{yearLabelOf(selectedYear)}</span>
            <span style={{ fontWeight: 500, color: SLATE5 }}> ({yearCount} {yearCount === 1 ? 'course' : 'courses'})</span>
          </span>
        </div>
      )}

      {/* Current-term selector row — term on the left, "View Archived" on the
          right (shown only when this term has archived courses). */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <PeriodSelector prominent />
        {periodId && archivedInTerm.length > 0 && (
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, padding: '0 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 9999, color: SLATE7, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Archive size={16} color={SLATE7} /> View Archived ({archivedInTerm.length})
          </button>
        )}
      </div>

      {!isCurrentTermActive && currentPeriod && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, color: '#92400E', fontSize: 13, lineHeight: '1.4' }}>
          <strong>Read-only:</strong> {currentPeriod.label} is closed. Switch to an Active term to make changes.
        </div>
      )}
    </>
  );

  // Shared empty / no-term placeholder (year overview only).
  const emptyState = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 92, height: 92, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Clipboard size={40} color="#9CA3AF" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#18191A' }}>{periodId ? ('No courses for ' + programLabel + ' yet') : 'No academic term selected'}</div>
      <div style={{ color: SLATE5, textAlign: 'center', maxWidth: 420 }}>{periodId ? 'Use Upload Course Offerings to import this term’s curriculum from the school’s system. Each term keeps its own courses — a new sem/term starts empty.' : 'Select an academic term to view its curriculum.'}</div>
    </div>
  );

  // Shown when the signed-in user heads NO program in this term — a friendly
  // blocked state instead of wrong/empty curriculum data.
  const blockedState = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 92, height: 92, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle size={40} color="#B45309" />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#18191A' }}>No program assigned for this term</div>
      <div style={{ color: SLATE5, textAlign: 'center', maxWidth: 440 }}>
        You're not set as a Program Head for any program in {currentPeriod ? currentPeriod.label : 'this term'}. Ask your Dean to assign you, or switch to a term where you're already assigned.
      </div>
    </div>
  );

  // Sort + Search controls for the year-detail level. The Sort button shows
  // the active field + direction (e.g. "Sort: Code ↑"); the menu lets you pick
  // the field and toggle ascending/descending.
  const sortFieldDef = SORT_FIELDS.find((f) => f.key === sortField) || SORT_FIELDS[0];
  const controlsBar = (
    <div className={syllabusStyles.header} style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div className={syllabusStyles['section-select']} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', height: 40, borderRadius: 9999, background: 'transparent', border: '1px solid #D1D5DB', flex: '0 1 360px', minWidth: 220, maxWidth: 420 }}>
        <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search courses" style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', fontSize: 14 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setSortOpen((v) => !v)} style={{ height: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: '1px solid #D1D5DB', borderRadius: 9999, color: SLATE7, cursor: 'pointer', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <span>Sort: {sortFieldDef.short}</span>
            {sortDir === 'asc' ? <ArrowUp size={16} color={SLATE7} strokeWidth={3} /> : <ArrowDown size={16} color={SLATE7} strokeWidth={3} />}
          </button>
          {sortOpen && (
            <>
              {/* click-away backdrop */}
              <div onClick={() => setSortOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 4 }} />
              <div style={{ position: 'absolute', top: '110%', left: 0, background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 210, padding: 6, zIndex: 5 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: SLATE5, padding: '6px 10px 4px' }}>Sort by</div>
                {SORT_FIELDS.map((f) => {
                  const active = sortField === f.key;
                  return (
                    <button key={f.key} onClick={() => setSortField(f.key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: active ? SLATE1 : 'transparent', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 6, color: '#18191A', fontSize: 14, fontWeight: active ? 600 : 500 }}>
                      <span>{f.label}</span>
                      {active && <Check size={15} color={ACCENT} />}
                    </button>
                  );
                })}
                <div style={{ height: 1, background: SLATE2, margin: '6px 4px' }} />
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: SLATE5, padding: '2px 10px 4px' }}>Order</div>
                <button onClick={() => setSortDir('asc')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: sortDir === 'asc' ? SLATE1 : 'transparent', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 6, color: '#18191A', fontSize: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ArrowUp size={15} color="#374151" /> Ascending</span>
                  {sortDir === 'asc' && <Check size={15} color={ACCENT} />}
                </button>
                <button onClick={() => setSortDir('desc')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: sortDir === 'desc' ? SLATE1 : 'transparent', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 6, color: '#18191A', fontSize: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ArrowDown size={15} color="#374151" /> Descending</span>
                  {sortDir === 'desc' && <Check size={15} color={ACCENT} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /* --------------------- Level 1: year overview ------------------------ */
  const yearTiles = [
    ...YEAR_DEFS.map((y) => ({ n: y.n, label: y.label })),
    ...(byYear[0].length > 0 ? [{ n: 0, label: 'Unassigned' }] : []),
  ];
  const openYear = (n) => { setSearchQuery(''); setSelectedYear(n); };
  const yearOverview = (
    <>
      {pageHeader}
      {!periodId ? emptyState
        : noProgramAssigned ? blockedState
        : termCourses.length === 0 ? emptyState : (
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(max(200px, (100% - 48px) / 4), 1fr))', gap: 16 }}>
            {yearTiles.map((y) => (
              <YearCard key={y.n} label={y.label} count={byYear[y.n].length} summary={summarizeYear(byYear[y.n])} onOpen={() => openYear(y.n)} />
            ))}
          </div>
        </div>
      )}
    </>
  );

  /* ---------------------- Level 2: year detail ------------------------- */
  // (yearCount + the program › year breadcrumb live in pageHeader above.)
  const yearDetail = (
    <>
      {pageHeader}
      {controlsBar}

      {visibleCourses.length > 0 ? (
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(max(230px, (100% - 48px) / 4), 1fr))', gap: 16, alignItems: 'start' }}>
            {visibleCourses.map((c) => <CourseCard key={c.course_id} course={c} onOpen={setSelectedId} />)}
          </div>
        </div>
      ) : (
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {yearCount === 0 ? <Clipboard size={36} color="#9CA3AF" /> : <Search size={34} color="#9CA3AF" />}
          </div>
          {yearCount === 0 ? (
            <>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#18191A' }}>No courses in {yearLabelOf(selectedYear)} yet</div>
              <div style={{ color: SLATE5, maxWidth: 420 }}>
                {isCurrentTermActive
                  ? 'Use Upload Course Offerings to import this year level’s curriculum from the school’s system.'
                  : 'This term is closed, so its curriculum can’t be edited.'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#18191A' }}>No matching courses</div>
              <div style={{ color: SLATE5, maxWidth: 420 }}>Nothing matches “{searchQuery}”. Try a different search.</div>
            </>
          )}
        </div>
      )}
    </>
  );

  /* --------------------------- Detail view -----------------------------
     Full-page, read-only. Header card + Prerequisites are always shown; the
     Course Offerings (revisions) sit behind a reveal button so the page stays
     focused on the course info until the user asks for the revision history. */
  const detailView = headerCourse && (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', paddingBottom: 8 }}>
      {/* Back */}
      <button
        onClick={() => setSelectedId(null)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: SLATE7, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '4px 0', marginBottom: 14 }}
      >
        <ArrowLeft size={18} /> Back to Courses
      </button>

      {/* Header card — read-only. Course details are owned by the school's
          system and imported via Upload, so there's no edit affordance — only
          Archive, for a course that's no longer offered by the program. */}
      <div style={{ border: '1px solid ' + SLATE2, borderRadius: 14, padding: 22, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#18191A', background: SLATE1, border: '1px solid ' + SLATE2, padding: '3px 10px', borderRadius: 9999, marginBottom: 10 }}>
              {headerCourse.course_no}
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: SLATE9, letterSpacing: '-0.01em' }}>{headerCourse.course_title}</h2>
          </div>
          {isCurrentTermActive && (
            <button
              type="button"
              onClick={() => setEditing(headerCourse)}
              title="Edit credit / contact hours, or archive this course"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 18px', flexShrink: 0, background: '#18191A', border: 'none', borderRadius: 8, color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              <Edit2 size={15} /> Edit
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 18, marginTop: 20 }}>
          <MetaLabel label="Credit" value={headerCourse.credit} />
          <MetaLabel label="Contact Hrs" value={headerCourse.contact_hrs} />
          <MetaLabel label="Classification" value={headerCourse.classification} />
          <MetaLabel label="CMO" value={headerCourse.cmo} />
          <MetaLabel label="Year Level" value={headerCourse.year_lvl} />
          <MetaLabel label="Term" value={headerCourse.term} />
        </div>
      </div>

      {/* Prerequisites */}
      <div style={{ marginTop: 24 }}>
        <SectionTitle>Prerequisites</SectionTitle>
        {prerequisites.length === 0 ? (
          <div style={{ fontSize: 14, color: SLATE5, fontStyle: 'italic' }}>No prerequisites required.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {prerequisites.map((p) => {
              // Clickable only when the code resolves to a catalog course.
              const clickable = p.course_id != null;
              return (
                <button
                  key={p.course_id ?? p.course_no}
                  onClick={clickable ? () => setSelectedId(p.course_id) : undefined}
                  title={clickable ? ('View ' + p.course_title) : (p.course_no + ' — not in this term’s catalog')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9999, background: SLATE1, border: '1px solid ' + SLATE2, color: SLATE9, fontSize: 13, fontWeight: 600, cursor: clickable ? 'pointer' : 'default', transition: 'border-color 0.15s ease, background 0.15s ease' }}
                  onMouseEnter={clickable ? (e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.background = '#FFFFFF'; } : undefined}
                  onMouseLeave={clickable ? (e) => { e.currentTarget.style.borderColor = SLATE2; e.currentTarget.style.background = SLATE1; } : undefined}
                >
                  <Link2 size={14} color={SLATE5} />
                  <span style={{ color: SLATE5, fontWeight: 600 }}>{p.course_no}</span>
                  {p.course_title && <><span style={{ color: SLATE3 }}>·</span>{p.course_title}</>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Course Offerings (Program_Course_Offering rows) — always listed. */}
      <div style={{ marginTop: 28 }}>
        <SectionTitle>Course Offerings</SectionTitle>
        {offerings.length === 0 ? (
          <div style={{ fontSize: 14, color: SLATE5, fontStyle: 'italic' }}>No course offerings yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {offerings.map((o) => (
              <div key={o.pc_offering_id} style={{ border: '1px solid ' + SLATE2, borderRadius: 12, padding: 16, background: '#FFFFFF', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: SLATE05, border: '1px solid ' + SLATE2, color: '#18191A', fontSize: 12, fontWeight: 600 }}>
                  <FileText size={13} color={SLATE5} /> Revision {o.revision_number}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: SLATE7, minWidth: 0 }}>
                  {o.course_description || <span style={{ color: SLATE5, fontStyle: 'italic' }}>No description.</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const content = (
    <div style={{ padding: 20, background: '#FFFFFF', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Full-width body so the card grids use all available horizontal space
          (the search input is independently capped, so it won't stretch). */}
      <div style={{ width: '100%', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {selectedId != null ? detailView : (selectedYear == null ? yearOverview : yearDetail)}
      </div>

      {showUpload && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={closeUpload} />
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(560px, 94vw)', maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#18191A' }}>Upload Course Offerings</div>
              <button onClick={closeUpload} disabled={uploading} style={{ background: 'transparent', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', padding: 0, lineHeight: 0, display: 'inline-flex', alignItems: 'center' }}><X size={22} color="#18191A" /></button>
            </div>

            {!uploadResult ? (
              <>
                <div
                  onClick={() => uploadInputRef.current && uploadInputRef.current.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setPickedFile(f); }}
                  style={{ border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                >
                  <Upload size={36} color="#9CA3AF" />
                  <div style={{ fontWeight: 600, color: '#18191A' }}>{pickedFile ? pickedFile.name : 'Drag & drop file here'}</div>
                  <div style={{ color: SLATE5, fontSize: 13 }}>Upload .xlsx, .xls or .csv</div>
                  <input type="file" ref={uploadInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setPickedFile(f); }} style={{ display: 'none' }} />
                </div>
                <div style={{ fontSize: 12, color: SLATE5, lineHeight: 1.5, background: SLATE05, border: '1px solid ' + SLATE2, borderRadius: 8, padding: '10px 12px' }}>
                  Columns are detected automatically — just include a <strong>Course No.</strong> column (e.g. “Course No.”, “Code”, “Subject Code”) and a <strong>Course Title</strong> column (e.g. “Course Title”, “Description”). Optional: Credit/Units, Contact Hours, Classification, CMO, <strong>Year Level</strong>, Term, and <strong>Prerequisites</strong> (other course codes, comma-separated). <strong>Year Level</strong> values are matched automatically — “1”, “Year 3”, “IV”, “senior”, etc. all route to the right year; anything we can’t recognise, you’ll be prompted to set (or skip) before importing — nothing lands as “Unassigned” silently. One file can populate all four year levels at once. The semester is taken from the selected academic term. A row whose Course No. already exists is updated.
                </div>
                {uploadError && <div style={{ color: '#B91C1C', fontSize: 13 }}>{uploadError}</div>}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button disabled={uploading} onClick={closeUpload} style={{ flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #18191A', borderRadius: 8, color: '#18191A', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 500 }}>Cancel</button>
                  <button disabled={uploading || !pickedFile} onClick={onUploadCourses} style={{ flex: 1, height: 40, background: '#18191A', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: (uploading || !pickedFile) ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: (uploading || !pickedFile) ? 0.7 : 1 }}>{uploading ? 'Uploading…' : 'Upload'}</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, color: SLATE7, lineHeight: 1.6 }}>
                  <div><strong style={{ color: '#047857' }}>{uploadResult.inserted}</strong> added · <strong style={{ color: '#1D4ED8' }}>{uploadResult.updated}</strong> updated · <strong style={{ color: '#92400E' }}>{uploadResult.skipped}</strong> skipped</div>

                  {/* Resolutions chosen in the "Set year levels" review step. */}
                  {(uploadResult.assignedViaPopup > 0 || uploadResult.notImported > 0) && (
                    <div style={{ marginTop: 4 }}>
                      {uploadResult.assignedViaPopup > 0 && (
                        <><strong style={{ color: '#7C3AED' }}>{uploadResult.assignedViaPopup}</strong> year level{uploadResult.assignedViaPopup === 1 ? '' : 's'} set via review</>
                      )}
                      {uploadResult.assignedViaPopup > 0 && uploadResult.notImported > 0 && ' · '}
                      {uploadResult.notImported > 0 && (
                        <><strong style={{ color: '#92400E' }}>{uploadResult.notImported}</strong> not imported</>
                      )}
                    </div>
                  )}

                  {/* Per-year distribution — shows how the uploaded courses routed
                      across the four year levels, plus any that couldn't be
                      matched (Unassigned), so the user can spot rows to fix. */}
                  {uploadResult.yearBreakdown && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + SLATE2 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: SLATE7, marginBottom: 6 }}>Distribution by year level</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {YEAR_DEFS.map((y) => (
                          <span key={y.n} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: SLATE05, border: '1px solid ' + SLATE2, fontSize: 12.5, color: SLATE7 }}>
                            {y.label} <strong style={{ color: SLATE9 }}>{uploadResult.yearBreakdown[y.long] || 0}</strong>
                          </span>
                        ))}
                        {/* With the review step, Unassigned is normally 0 — show
                            the chip only if any slipped through (e.g. an API
                            import that bypassed the popup). */}
                        {(uploadResult.yearBreakdown.unassigned || 0) > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: '#FEF3C7', border: '1px solid #FCD34D', fontSize: 12.5, color: '#92400E' }}>
                            Unassigned <strong style={{ color: '#92400E' }}>{uploadResult.yearBreakdown.unassigned}</strong>
                          </span>
                        )}
                      </div>
                      {uploadResult.yearBreakdown.unassigned > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: SLATE5 }}>
                          Re-upload with a recognizable year level to place these courses.
                        </div>
                      )}
                      {uploadResult.inferredYearCount > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: SLATE5 }}>
                          {uploadResult.inferredYearCount} year level{uploadResult.inferredYearCount === 1 ? '' : 's'} inferred from the course code.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Per-program distribution — shows which program each course
                      was tied to (from a Program column, or the program you're
                      viewing). */}
                  {uploadResult.programBreakdown && Object.keys(uploadResult.programBreakdown).length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + SLATE2 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: SLATE7, marginBottom: 6 }}>Distribution by program</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(uploadResult.programBreakdown).map(([code, n]) => {
                          const isUn = code === 'Unassigned';
                          return (
                            <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: isUn ? '#FEF3C7' : SLATE05, border: '1px solid ' + (isUn ? '#FCD34D' : SLATE2), fontSize: 12.5, color: isUn ? '#92400E' : SLATE7 }}>
                              {code} <strong style={{ color: isUn ? '#92400E' : SLATE9 }}>{n}</strong>
                            </span>
                          );
                        })}
                      </div>
                      {Array.isArray(uploadResult.unresolvedPrograms) && uploadResult.unresolvedPrograms.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: '#92400E' }}>
                          Program{uploadResult.unresolvedPrograms.length === 1 ? '' : 's'} not found in this term (left Unassigned): {uploadResult.unresolvedPrograms.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {uploadResult.prerequisitesLinked > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <strong style={{ color: '#7C3AED' }}>{uploadResult.prerequisitesLinked}</strong> prerequisite link{uploadResult.prerequisitesLinked === 1 ? '' : 's'} created
                    </div>
                  )}
                  {Array.isArray(uploadResult.unresolvedPrereqs) && uploadResult.unresolvedPrereqs.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 13, color: '#92400E' }}>
                      Unmatched prerequisite codes (skipped): {uploadResult.unresolvedPrereqs.join(', ')}
                    </div>
                  )}
                  {Array.isArray(uploadResult.errors) && uploadResult.errors.length > 0 && (
                    <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: SLATE5, fontSize: 13 }}>
                      {uploadResult.errors.slice(0, 8).map((e, i) => (<li key={i}>Row {e.row}: {e.message}</li>))}
                      {uploadResult.errors.length > 8 && <li>…and {uploadResult.errors.length - 8} more</li>}
                    </ul>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={closeUpload} style={{ height: 40, padding: '0 20px', background: '#18191A', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: 'pointer', fontWeight: 500 }}>Done</button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* "Set year levels" review step — layered ABOVE the upload modal. Opens
          only when the preview found courses whose year level we couldn't
          recognize. Confirm stays disabled until every row has a year or is
          marked "Don't import" (so nothing is silently imported as Unassigned). */}
      {resolveRows && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 6 }} onClick={() => { if (!uploading) closeUpload(); }} />
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(720px, 96vw)', maxHeight: '90vh', background: '#FFFFFF', borderRadius: 12, zIndex: 7, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 48px rgba(0,0,0,0.22)' }}>
            {/* Header + bulk helper */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid ' + SLATE2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: '#B91C1C' }}>
                    <AlertTriangle size={18} /> Missing year level
                  </div>
                  <div style={{ fontSize: 13, color: SLATE5, marginTop: 4, lineHeight: 1.5 }}>
                    {resolveRows.length} course{resolveRows.length === 1 ? '' : 's'} {resolveRows.length === 1 ? 'has' : 'have'} no year level, and it couldn’t be inferred from the code. Year level is <strong>required</strong> — choose a year for each, or mark it <strong>Don’t import</strong>. Nothing is saved until you confirm.
                  </div>
                </div>
                <button onClick={() => { if (!uploading) closeUpload(); }} disabled={uploading} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', padding: 4, lineHeight: 0, color: SLATE5, flexShrink: 0 }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: SLATE7 }}>Set all remaining to:</span>
                {YEAR_DEFS.map((y) => (
                  <button key={y.n} type="button" onClick={() => setAllRemaining(y.long)} style={{ height: 28, padding: '0 10px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + SLATE3, background: '#FFFFFF', color: SLATE7 }}>{y.label.replace(' Year', ' Yr')}</button>
                ))}
                <button type="button" onClick={() => setAllRemaining('SKIP')} style={{ height: 28, padding: '0 10px', borderRadius: 9999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + SLATE3, background: '#FFFFFF', color: SLATE5 }}>Don’t import</button>
              </div>
            </div>

            {/* Per-course rows */}
            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '4px 20px' }}>
              {resolveRows.map((u) => {
                const choice = yearChoices[u.course_no] || '';
                return (
                  <div key={u.course_no} style={{ padding: '12px 0', borderBottom: '1px solid ' + SLATE2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 700, color: SLATE9 }}>{u.course_no}</span>
                        <span style={{ color: SLATE7 }}> — {u.course_title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: SLATE5, whiteSpace: 'nowrap' }}>
                        Found: <span style={{ fontStyle: 'italic' }}>{u.raw_year_level ? '“' + u.raw_year_level + '”' : '(blank)'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {YEAR_DEFS.map((y) => {
                        const sel = choice === y.long;
                        return (
                          <button key={y.n} type="button" onClick={() => setYearChoices((p) => ({ ...p, [u.course_no]: y.long }))}
                            style={{ height: 32, padding: '0 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (sel ? ACCENT : SLATE3), background: sel ? ACCENT : '#FFFFFF', color: sel ? '#FFFFFF' : SLATE7 }}>
                            {y.label.replace(' Year', ' Yr')}
                          </button>
                        );
                      })}
                      <button type="button" onClick={() => setYearChoices((p) => ({ ...p, [u.course_no]: 'SKIP' }))}
                        style={{ height: 32, padding: '0 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (choice === 'SKIP' ? SLATE7 : SLATE3), background: choice === 'SKIP' ? SLATE7 : '#FFFFFF', color: choice === 'SKIP' ? '#FFFFFF' : SLATE5 }}>
                        Don’t import
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: '1px solid ' + SLATE2 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: unresolvedCount > 0 ? '#B91C1C' : '#047857' }}>
                {unresolvedCount > 0 && <AlertTriangle size={15} />}
                {unresolvedCount > 0
                  ? ('Error: ' + unresolvedCount + ' course' + (unresolvedCount === 1 ? '' : 's') + ' ' + (unresolvedCount === 1 ? 'has' : 'have') + ' no year level — set one for each before importing')
                  : 'All set'}
              </div>
              {uploadError && <div style={{ color: '#B91C1C', fontSize: 13, flex: '1 1 auto', textAlign: 'center', minWidth: 0 }}>{uploadError}</div>}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => { if (!uploading) closeUpload(); }} disabled={uploading} style={{ height: 40, padding: '0 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, background: '#FFFFFF', color: SLATE7, border: '1px solid ' + SLATE3, cursor: uploading ? 'not-allowed' : 'pointer' }}>Cancel</button>
                <button onClick={onConfirmResolve} disabled={uploading || unresolvedCount > 0}
                  style={{ height: 40, padding: '0 18px', borderRadius: 6, fontSize: 14, fontWeight: 600, border: 'none', background: (uploading || unresolvedCount > 0) ? '#E5E7EB' : ACCENT, color: (uploading || unresolvedCount > 0) ? '#9CA3AF' : '#FFFFFF', cursor: (uploading || unresolvedCount > 0) ? 'not-allowed' : 'pointer' }}>
                  {uploading ? 'Importing…' : 'Confirm & Import'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit modal — only Credit + Lecture/Lab Hours are editable; the course
          number, title, etc. are owned by the school's system. The "Archive
          course" action lives here too (course no longer offered → restorable
          from "View Archived"). */}
      {editing && (() => {
        const cr  = splitLecLab(editing.credit);
        const hrs = splitLecLab(editing.contact_hrs);
        // The course's total credit units (from its current credit) is the cap:
        // Lecture + Lab credit must sum to it. Unknown (no credit on record) →
        // rule disabled so the field isn't permanently blocked.
        const totalUnits = sumLecLab(cr);
        const hasTotal = !!(cr.lec || cr.lab);
        return (
          <EditEntityModal
            key={'course-edit-' + editing.course_id}
            title={'Edit ' + (editing.course_no || 'course')}
            termLabel={currentPeriod ? currentPeriod.label : undefined}
            columns={2}
            width="min(520px, 94vw)"
            fields={[
              { key: 'total_units', label: 'Total Units', locked: true, colSpan: 2,
                lockedHelper: hasTotal ? ('Lecture + Lab credit must total ' + totalUnits + ' unit' + (totalUnits === 1 ? '' : 's') + '.') : 'No credit on record — Lecture/Lab are unconstrained.' },
              { key: 'lec_credit', label: 'Lecture Credit', type: 'number', placeholder: 'e.g. 2', colSpan: 1 },
              { key: 'lab_credit', label: 'Lab Credit', type: 'number', placeholder: 'e.g. 1', colSpan: 1 },
              { key: 'lec_hours', label: 'Lecture Hours', type: 'number', placeholder: 'e.g. 2', colSpan: 1 },
              { key: 'lab_hours', label: 'Lab Hours', type: 'number', placeholder: 'e.g. 3', colSpan: 1 },
            ]}
            record={{ total_units: hasTotal ? String(totalUnits) : '—', lec_credit: cr.lec, lab_credit: cr.lab, lec_hours: hrs.lec, lab_hours: hrs.lab }}
            validate={hasTotal ? (v) => {
              const sum = (Number(v.lec_credit) || 0) + (Number(v.lab_credit) || 0);
              if (sum === totalUnits) return null;
              const diff = Math.abs(sum - totalUnits);
              return 'Lecture (' + (Number(v.lec_credit) || 0) + ') + Lab (' + (Number(v.lab_credit) || 0) + ') = ' + sum
                + ' unit' + (sum === 1 ? '' : 's') + ', but this course is ' + totalUnits + '. '
                + (sum < totalUnits ? (diff + ' unit' + (diff === 1 ? '' : 's') + ' short.') : ('Exceeds by ' + diff + ' unit' + (diff === 1 ? '' : 's') + '.'));
            } : undefined}
            onSave={onSaveEdit}
            onRemove={onArchiveCourse}
            removeLabel="Archive course"
            onClose={() => setEditing(null)}
          />
        );
      })()}

      {/* Archived courses panel — restore brings a course back into the catalog
          (and, in turn, the Industry Consultant picker + Course Assignment). */}
      {archiveOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 6 }} onClick={() => setArchiveOpen(false)} />
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(640px, 96vw)', maxHeight: '90vh', background: '#FFFFFF', borderRadius: 12, zIndex: 7, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid ' + SLATE2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: SLATE9 }}>
                    <Archive size={18} color={SLATE7} /> Archived courses
                  </div>
                  <div style={{ fontSize: 13, color: SLATE5, marginTop: 4, lineHeight: 1.5 }}>
                    No longer offered by the program — hidden from the catalog, the Industry Consultant picker &amp; Course Assignment. Restore one to bring it back{currentPeriod ? ' for ' + currentPeriod.label : ''}.
                  </div>
                </div>
                <button onClick={() => setArchiveOpen(false)} aria-label="Close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0, color: SLATE5, flexShrink: 0 }}><X size={20} /></button>
              </div>
            </div>

            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '6px 20px 12px' }}>
              {archivedInTerm.length === 0 ? (
                <div style={{ padding: '28px 0', textAlign: 'center', color: SLATE5, fontSize: 14 }}>No archived courses for this term.</div>
              ) : (
                archivedInTerm.map((c) => {
                  const yl = yearLabelOf(yearLevelNum(c.year_lvl) ?? 0);
                  const busy = archiveBusyId === c.course_id;
                  return (
                    <div key={c.course_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid ' + SLATE2 }}>
                      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 700, color: SLATE9 }}>{c.course_no}</span>
                          <span style={{ color: SLATE7 }}> — {c.course_title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          <span style={{ fontSize: 11.5, color: SLATE5, background: SLATE05, border: '1px solid ' + SLATE2, borderRadius: 9999, padding: '2px 8px' }}>{yl}</span>
                          {c.classification && <span style={{ fontSize: 11.5, color: SLATE5, background: SLATE05, border: '1px solid ' + SLATE2, borderRadius: 9999, padding: '2px 8px' }}>{c.classification}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestoreCourse(c)}
                        disabled={!isCurrentTermActive || busy}
                        title={!isCurrentTermActive ? 'This term is closed — switch to an Active term to restore.' : undefined}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, flexShrink: 0, border: '1px solid ' + ((!isCurrentTermActive || busy) ? SLATE2 : SLATE3), background: '#FFFFFF', color: (!isCurrentTermActive || busy) ? '#9CA3AF' : SLATE7, cursor: (!isCurrentTermActive || busy) ? 'not-allowed' : 'pointer' }}
                      >
                        <RotateCcw size={14} /> {busy ? 'Restoring…' : 'Restore'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid ' + SLATE2 }}>
              <button onClick={() => setArchiveOpen(false)} style={{ height: 40, padding: '0 20px', background: '#18191A', border: 'none', borderRadius: 8, color: '#FFFFFF', cursor: 'pointer', fontWeight: 500 }}>Done</button>
            </div>
          </div>
        </>
      )}

    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role={userRole} name={userName} />}
      nav={<SideNavigation mode="program-head" />}
      content={content}
    />
  );
};

export default ProgramHeadCourseOfferings;
