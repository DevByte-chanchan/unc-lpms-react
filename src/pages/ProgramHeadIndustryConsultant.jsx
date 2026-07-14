import React from "react";
import ReactDOM from "react-dom";
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { Search, ArrowUp, ArrowDown, Upload, Plus, Clipboard, UserPlus, X, Save, AlertTriangle, ChevronDown, Check } from "react-feather";
import ConsultantsTable from '../components/ConsultantsTable.jsx';
import PeriodSelector from "../components/PeriodSelector.jsx";
import AddRecordModal from "../components/AddRecordModal.jsx";
import EditEntityModal from "../components/EditEntityModal.jsx";
import ViewRecordModal from "../components/ViewRecordModal.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import ViewArchivedButton from "../components/ViewArchivedButton.jsx";
import UndoUploadButton from "../components/UndoUploadButton.jsx";
import UploadPreviewFlow from "../components/UploadPreviewFlow.jsx";
import DialogShell from "../components/DialogShell.jsx";
import { RecordMeta } from "../components/RecordTimestamps.jsx";
import styles from '../styles/CoursesTable.module.sass';
import syllabusStyles from '../styles/SyllabusSections.module.sass';
import dd from '../styles/DropdownMenu.module.sass';
import { ConsultantsAPI, CoursesAPI, FacultyAPI } from '../services/api.js';
import { courseMatchesPeriod } from '../services/courseTerm.js';
import { usePeriod } from '../services/period.jsx';
import { useCurrentUser } from '../services/currentUser.jsx';
import { useHeadProgram } from '../services/useHeadProgram.js';
import { STATUS_OPTIONS, partitionByArchive } from '../services/statusPolicy.js';

const ActionBtn = ({ onClick, icon, label, disabled, variant }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 18px', gap: 8, width: 240, height: 40, background: variant === 'white' ? '#FFFFFF' : (disabled ? '#9CA3AF' : '#18191A'), borderRadius: 6, color: variant === 'white' ? '#374151' : '#fff', border: variant === 'white' ? '1px solid #D1D5DB' : 'none', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? (variant === 'white' ? 0.6 : 0.7) : 1 }}>
    <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
    {label}
  </button>
);

// A consultant's assigned course codes: prefer the many-to-many join
// table, fall back to the legacy single assigned_course_code so older
// records (assigned before the multi-course change) still show up.
const consultantCourseCodes = (c) => {
  const fromJoin = Array.isArray(c && c.courses) ? c.courses.map((x) => x.code) : [];
  if (fromJoin.length > 0) return fromJoin;
  return c && c.assigned_course_code ? [c.assigned_course_code] : [];
};

// Assigned courses as { code, title } for the table (so it can show the course
// number AND name). The join carries the title; the legacy single-code path has
// no title, so it shows the code alone.
const consultantCourseList = (c) => {
  const fromJoin = Array.isArray(c && c.courses) ? c.courses.map((x) => ({ code: x.code, title: x.title || '' })) : [];
  if (fromJoin.length > 0) return fromJoin;
  return c && c.assigned_course_code ? [{ code: c.assigned_course_code, title: '' }] : [];
};

// Shallow equality for the mapped course list ({code,title,year_level}). Used
// so the picker's periodic refetch only updates state when the catalog actually
// changed — no needless re-render / flicker while the dropdown is open.
const sameCourseList = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
  a.every((x, i) => x.code === b[i].code && x.title === b[i].title && x.year_level === b[i].year_level);

/**
 * CourseTagPicker — tag-style multi-select.
 *
 * - Selected codes render as removable pills above the input.
 * - The input filters the dropdown; click an option to add a pill.
 * - Courses in `excludedByCode` are shown disabled with the holder's
 *   name (already assigned to another consultant in this period).
 */
// SCIS year-level helper — mirrors ProgramHeadCourses.jsx so the course
// picker can group / filter offerings by year. Matches "first/1st/1",
// "second/2nd/2", etc.; returns null when the level is unknown.
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

const CourseTagPicker = ({ courses, value, onChange, excludedByCode }) => {
  const [query, setQuery] = React.useState('');
  const [open, setOpen]   = React.useState(false);
  const [yearFilter, setYearFilter] = React.useState('all'); // 'all' | 1 | 2 | 3 | 4
  const [menuPos, setMenuPos] = React.useState(null);
  const wrapRef = React.useRef(null);
  const menuRef = React.useRef(null);

  // Anchor the fixed-position menu to the input's viewport rect (flipping up
  // when there isn't room below) so it escapes the modal's scroll clipping.
  const computePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const spaceBelow = vh - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const flipUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    setMenuPos({
      left: r.left, width: r.width,
      top: flipUp ? undefined : r.bottom + 4,
      bottom: flipUp ? (vh - r.top + 4) : undefined,
      maxHeight: Math.max(140, Math.min(260, flipUp ? spaceAbove : spaceBelow)),
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    computePos();
    const reflow = () => computePos();
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => { window.removeEventListener('scroll', reflow, true); window.removeEventListener('resize', reflow); };
  }, [open, computePos]);

  // Click outside (menu lives in a portal, so treat it as "inside" too).
  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const valueSet = React.useMemo(() => new Set(value), [value]);

  // Options: every course in the period, minus the ones already picked.
  // Disabled when the course is taken by another consultant.
  const options = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => !valueSet.has(c.code))
      .filter((c) => !q || c.code.toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q))
      .map((c) => ({
        code:  c.code,
        title: c.title,
        year_level: c.year_level,
        takenBy: excludedByCode && excludedByCode.get ? excludedByCode.get(c.code.toLowerCase()) : null,
      }));
  }, [courses, query, valueSet, excludedByCode]);

  // Group the (non-selected, search-filtered) options by SCIS year level:
  // buckets 1–4 plus a trailing "null" bucket for unknown/unassigned levels,
  // so no course is ever hidden.
  const byYear = React.useMemo(() => {
    const m = { 1: [], 2: [], 3: [], 4: [], null: [] };
    options.forEach((o) => { m[yearLevelNum(o.year_level) ?? 'null'].push(o); });
    return m;
  }, [options]);

  const addCode  = (code) => { onChange([...value, code]); setQuery(''); };
  const dropCode = (code) => onChange(value.filter((c) => c !== code));

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Year-level filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {[{ key: 'all', label: 'All' }].concat(YEAR_DEFS.map((y) => ({ key: y.n, label: y.label.replace(' Year', '') }))).map((chip) => {
          const active = yearFilter === chip.key;
          const count = chip.key === 'all' ? 0 : (byYear[chip.key] || []).length;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); setYearFilter(chip.key); setOpen(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 28, padding: '0 12px', borderRadius: 9999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: active ? '#18191A' : '#FFFFFF',
                color: active ? '#FFFFFF' : '#374151',
                border: '1px solid ' + (active ? '#18191A' : '#D1D5DB'),
              }}
            >
              {chip.label}
              {chip.key !== 'all' && count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#FFFFFF' : '#9CA3AF' }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div
        onClick={() => setOpen(true)}
        style={{
          minHeight: 44, border: '1px solid #D1D5DB', borderRadius: 6,
          padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 6,
          background: '#FFFFFF', cursor: 'text', alignItems: 'center',
        }}
      >
        {value.map((code) => (
          <span
            key={code}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', background: '#E5E7EB', color: '#18191A',
              borderRadius: 9999, fontSize: 13, fontWeight: 500,
            }}
          >
            {code}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); dropCode(code); }}
              aria-label={'Remove ' + code}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? 'Search course code or title…' : ''}
          style={{ flex: 1, minWidth: 120, border: 'none', outline: 'none', fontSize: 14, padding: '4px 2px' }}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-label="Show course list"
          style={{ marginLeft: 'auto', alignSelf: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
        >
          <ChevronDown size={16} color="#6B7280" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </button>
      </div>

      {open && menuPos && ReactDOM.createPortal(
        <div
          ref={menuRef}
          className={dd.menu}
          style={{
            position: 'fixed', left: menuPos.left, width: menuPos.width,
            top: menuPos.top, bottom: menuPos.bottom, maxHeight: menuPos.maxHeight, overflowY: 'auto',
            background: '#FFFFFF', zIndex: 1100,
          }}
        >
          {(() => {
            // Render buckets 1 → 2 → 3 → 4 → Unassigned; when a specific year
            // chip is active, only that year's bucket shows. Empty buckets are
            // skipped, so no course is ever stranded.
            const groups = [1, 2, 3, 4, null].filter((n) => {
              if (yearFilter !== 'all' && n !== yearFilter) return false;
              return (byYear[n] || []).length > 0;
            });
            if (groups.length === 0) {
              return (
                <div style={{ padding: '10px 12px', fontSize: 13, color: '#6B7280' }}>
                  No matching courses available.
                </div>
              );
            }
            return groups.map((n) => {
              const list = byYear[n] || [];
              const def = YEAR_DEFS.find((y) => y.n === n);
              return (
                <div key={String(n)}>
                  <div className={dd.group}>
                    {(def ? def.label : 'Unassigned')} · {list.length} course{list.length === 1 ? '' : 's'}
                  </div>
                  {list.map((o) => {
                    const disabled = !!o.takenBy;
                    return (
                      <button
                        type="button"
                        key={o.code}
                        disabled={disabled}
                        onClick={() => !disabled && addCode(o.code)}
                        title={disabled ? 'Already assigned to ' + o.takenBy : ''}
                        className={dd.item}
                        style={{ justifyContent: 'space-between' }}
                      >
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>{o.code}</strong> — {o.title}</span>
                        {disabled && (
                          <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', flexShrink: 0 }}>
                            Assigned · {o.takenBy}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>,
        document.body
      )}
    </div>
  );
};

const ProgramHeadIndustryConsultant = () => {
  const { currentPeriod, isCurrentTermActive } = usePeriod();
  const { name: currentUserName, role: currentUserRole } = useCurrentUser();
  const periodId = currentPeriod && currentPeriod.id;

  // Which program is this Program Head assigned to? (same resolution as the
  // Course Offerings / Course Assignment pages — via the Dean's assignment).
  const {
    currentProgram, programCode, programName,
    myPrograms, selectedProgramId, setSelectedProgramId,
    hasMultiplePrograms, noProgramAssigned,
  } = useHeadProgram(periodId);
  const [programMenuOpen, setProgramMenuOpen] = React.useState(false);

  const [showModal, setShowModal]       = React.useState(false);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingConsultant, setEditingConsultant]   = React.useState(null);
  const [editFromView, setEditFromView]             = React.useState(false); // edit opened from the View modal (shows Back)
  const [viewingConsultant, setViewingConsultant]   = React.useState(null);
  const [confirmUpload, setConfirmUpload]           = React.useState(false);
  const [assignOpen, setAssignOpen]     = React.useState(false);
  const [assignStatus, setAssignStatus] = React.useState('');
  const [selectedConsultant, setSelectedConsultant] = React.useState(null);
  const [pickedCourseCodes, setPickedCourseCodes]   = React.useState([]);
  const [selectedFile, setSelectedFile] = React.useState(null);
  // The file under review in the Preview & Confirm overlay. Nothing is written
  // while this is set — the commit only happens on "Confirm & Import".
  const [pendingFile, setPendingFile]   = React.useState(null);
  const [searchQuery, setSearchQuery]   = React.useState('');
  const [consultants, setConsultants]   = React.useState([]);
  const [courses, setCourses]           = React.useState([]);
  const [facultyOptions, setFacultyOptions] = React.useState([]); // Name dropdown: { value: name, label: name, sub: role }
  const fileInputRef = React.useRef(null);

  // The course picker sources STRAIGHT from the curriculum catalog (the Course
  // Offerings page's data, period- + semester-scoped) so the consultant's
  // options can never drift from it. We also touch the offerings endpoint so
  // its catalog-sync keeps the assignable rows in step (the server resolves
  // assigned codes → course_offering ids when a consultant is saved).
  const refetchCourses = React.useCallback(() => {
    if (!periodId) { setCourses([]); return; }
    CoursesAPI.list(periodId)
      .then((rows) => {
        const next = Array.isArray(rows)
          ? rows.filter((c) => courseMatchesPeriod(c, currentPeriod))
                 .map((c) => ({ code: c.course_no, title: c.course_title, year_level: c.year_lvl }))
          : [];
        // Only update when the catalog actually changed (archived courses are
        // already excluded server-side), so polling never causes flicker.
        setCourses((prev) => (sameCourseList(prev, next) ? prev : next));
      })
      .catch(() => setCourses([]));
  }, [periodId, currentPeriod]);

  // Bumped on every successful upload so the Undo button re-reads its batch.
  const [uploadCount, setUploadCount]         = React.useState(0);

  const refresh = React.useCallback(() => {
    if (!periodId) { setConsultants([]); setCourses([]); return; }
    ConsultantsAPI.list(periodId).then((rows) => setConsultants(Array.isArray(rows) ? rows : [])).catch(() => setConsultants([]));
    refetchCourses();
  }, [periodId, refetchCourses]);

  React.useEffect(() => { refresh(); }, [refresh]);

  // Faculty for the consultant Name dropdown — the same list the Dean manages
  // (period-scoped). Each option shows the faculty's role. Sorted, de-duplicated.
  // Mirror the Faculty list: archived faculty (Emeritus / Inactive) drop out of
  // the Faculty page's main table, so they must NOT be pickable here either.
  React.useEffect(() => {
    if (!periodId) { setFacultyOptions([]); return undefined; }
    let cancelled = false;
    FacultyAPI.list(periodId)
      .then((rows) => {
        if (cancelled) return;
        const available = partitionByArchive(Array.isArray(rows) ? rows : [], 'faculty').main;
        const seen = new Set();
        const opts = [];
        available.forEach((f) => {
          const name = f && f.name;
          if (!name) return;
          const key = String(name).toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          opts.push({ value: name, label: name, sub: (f && f.role) || '' });
        });
        opts.sort((a, b) => a.value.localeCompare(b.value));
        setFacultyOptions(opts);
      })
      .catch(() => { if (!cancelled) setFacultyOptions([]); });
    return () => { cancelled = true; };
  }, [periodId]);

  // Keep the course picker in lockstep with the Course Offerings page. While a
  // Manage/Add modal is open, refetch on open AND poll lightly so catalog edits
  // (add / archive / move year level) reflect constantly without reopening. The
  // refetch no-ops when nothing changed, so polling never flickers the dropdown.
  React.useEffect(() => {
    if (!(editingConsultant || showAddModal)) return undefined;
    refetchCourses();
    const id = setInterval(refetchCourses, 4000);
    return () => clearInterval(id);
  }, [editingConsultant, showAddModal, refetchCourses]);
  // Also re-sync whenever the window/tab regains focus (e.g. back from the
  // Course Offerings page in another tab).
  React.useEffect(() => {
    const onFocus = () => refetchCourses();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetchCourses]);

  const showTable = consultants.length > 0;

  // Drop whatever is in the picker, so re-opening it never shows a stale file
  // name from a run the user already abandoned.
  const clearPicker = React.useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Picking a file no longer uploads it — it hands it to the Preview & Confirm
  // overlay. The write happens there, on "Confirm & Import", and not before.
  const handleReviewFile = () => {
    if (!selectedFile) { alert('Please choose a file first'); return; }
    if (!periodId)     { alert('Select an academic period first'); return; }
    setShowModal(false);
    setPendingFile(selectedFile);
  };

  // "Confirm & Import" succeeded. This page has no post-upload reconciliation —
  // the preview's warnings (name not in the Faculty list, course not found) are
  // now the whole story, and they arrive before the write instead of after it.
  const onUploadCommitted = async () => {
    await refresh();
    setUploadCount((n) => n + 1);
    clearPicker();
  };

  // Undone — put the user back where they can pick the RIGHT file.
  const onUploadUndone = async () => {
    await refresh();
    setUploadCount((n) => n + 1);
    setPendingFile(null);
    clearPicker();
    setShowModal(true);
  };

  const onAddConsultant = async (record) => {
    // Status is auto-linked to the Faculty list by the server (the Name is
    // picked from that list, so a manual add resolves to a faculty member and
    // takes their Active/Unavailable state). No status is sent from here.
    await ConsultantsAPI.create(record, periodId);
    await refresh();
    setUploadCount((n) => n + 1);   // a manual add is undoable too
  };

  const onSaveEdit = async (patch) => {
    try {
      await ConsultantsAPI.update(editingConsultant.id, patch);
      await refresh();
    } catch (err) {
      await refresh();
      throw err;
    }
  };


  const openAssign = (consultant) => {
    setSelectedConsultant(consultant);
    setPickedCourseCodes(consultantCourseCodes(consultant));
    // Default to current status; "" means user hasn't chosen yet
    // (Save disabled until they do).
    setAssignStatus(consultant && (consultant.status === 'Active' || consultant.status === 'Unavailable')
      ? consultant.status
      : '');
    setAssignOpen(true);
  };

  const confirmAssign = async () => {
    if (!selectedConsultant) return;
    if (!assignStatus) { alert('Pick a status (Active or Unavailable) first.'); return; }
    try {
      await ConsultantsAPI.assign(selectedConsultant.id, {
        status: assignStatus,
        // Unavailable clears assignments anyway, but send [] explicitly
        // so the intent is unambiguous in server logs.
        assigned_course_codes: assignStatus === 'Unavailable' ? [] : pickedCourseCodes,
      });
      await refresh();
      setAssignOpen(false);
      setSelectedConsultant(null);
    } catch (err) {
      // 409: server rejected a race-condition double-assignment.
      const list = err.details && Array.isArray(err.details.conflicts)
        ? err.details.conflicts.map((c) => c.code + ' (→ ' + c.consultantName + ')').join(', ')
        : '';
      const msg = list ? (err.message + '\n\nConflicts: ' + list) : err.message;
      alert('Could not assign: ' + msg);
      await refresh();   // refresh so the picker reflects who actually holds the conflicting codes
    }
  };

  // Map<lowercase code, holder name> — courses already assigned to OTHER
  // consultants in this period. Driven off the consultants list the page
  // already loads, so no extra fetch is needed.
  const takenByOther = React.useMemo(() => {
    const m = new Map();
    const myId = editingConsultant && editingConsultant.id;
    consultants.forEach((c) => {
      if (c.id === myId) return;
      consultantCourseCodes(c).forEach((code) => {
        if (code) m.set(String(code).toLowerCase(), c.name);
      });
    });
    return m;
  }, [consultants, editingConsultant]);

  // Edit-status handler for the consultant archive (Active or Available).
  const onEditStatus = React.useCallback(async (row, newStatus) => {
    await ConsultantsAPI.update(row.id, { status: newStatus });
    await refresh();
  }, [refresh]);

  // "⋯" menu → pick the archive status to move the row to the Archive.
  const onArchiveRow = React.useCallback(
    (row, status) => onEditStatus(row, status),
    [onEditStatus],
  );

  const visibleConsultants = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = q ? consultants.filter((c) => (c.name || '').toLowerCase().includes(q)) : consultants.slice();
    // Sorting is handled by the table's column headers; here we only filter
    // and drop archived statuses (Unavailable / Offboarded) to the Archive.
    return partitionByArchive(rows, 'consultant').main;
  }, [consultants, searchQuery]);

  const renderedConsultants = visibleConsultants.map((c) => ({
    id: c.id, name: c.name, department: '',
    // { code, title } so the table lists the course number AND name.
    assignedCourse: consultantCourseList(c),
    // Pass status through as-is — blank/null until the user picks one
    // in the Assign popup. No default to 'Active'.
    status: c.status || '',
  }));

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
      {/* Program identity — LINE 1 "BSIT: Industry Consultants", LINE 2 full name. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0, display: 'flex', gap: 12 }}>
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: '#18191A', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 24, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                {programCode
                  ? (<><span style={{ fontWeight: 800 }}>{programCode}</span><span style={{ fontWeight: 600 }}>: Industry Consultants</span></>)
                  : (<span style={{ fontWeight: 700 }}>Industry Consultants</span>)}
              </div>
              {programName && <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{programName}</div>}
            </div>
          </div>
          {hasMultiplePrograms && programSwitcher}
        </div>
        {!noProgramAssigned && (
          <div style={{ display: 'flex', gap: 10 }}>
            <UndoUploadButton entity="industry_consultants" periodId={periodId} disabled={!periodId || !isCurrentTermActive} refreshKey={uploadCount} onUndone={refresh} />
            <ActionBtn variant="white" onClick={() => { if (consultants.length > 0) { setConfirmUpload(true); } else { setShowModal(true); } }} disabled={!periodId || !isCurrentTermActive} icon={<Upload size={18} color="#374151" />} label="Upload Consultant List" />
            {showTable && isCurrentTermActive && (
              <ActionBtn onClick={() => setShowAddModal(true)} icon={<Plus size={18} color="#FFFFFF" />} label="Add Consultant" />
            )}
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
        {!noProgramAssigned && <ViewArchivedButton moduleType="consultants" onEditStatus={onEditStatus} />}
      </div>

      {noProgramAssigned ? blockedState : (<>

      {!isCurrentTermActive && currentPeriod && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, color: '#92400E', fontSize: 13, lineHeight: '1.4' }}>
          <strong>Read-only:</strong> {currentPeriod.label} is not the current term. Switch to the current term to make changes.
        </div>
      )}

      {/* Filter bar — search, left-aligned above the table. */}
      {showTable && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className={syllabusStyles['section-select']} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', height: 40, borderRadius: 9999, background: 'transparent', border: '1px solid #D1D5DB', flex: '0 1 360px', minWidth: 220, maxWidth: 420 }}>
            <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by consultant name" style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', fontSize: 14 }} />
          </div>
        </div>
      )}

      {showTable && (
        <ConsultantsTable
          consultants={renderedConsultants}
          hideDepartment={true}
          onAssign={(row) => { const full = visibleConsultants.find((c) => c.id === row.id); if (full) { setEditFromView(false); setEditingConsultant(full); } }}
          onArchive={isCurrentTermActive ? onArchiveRow : undefined}
          readOnly={!isCurrentTermActive}
        />
      )}

      {!showTable && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: 92, height: 92, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clipboard size={40} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#18191A' }}>No consultants yet</div>
          <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>{periodId ? ('Upload a consultant list for ' + (currentPeriod ? currentPeriod.label : 'this period') + ' to get started.') : 'Select an academic period to begin.'}</div>
        </div>
      )}

      </>)}

      {showAddModal && (
        <AddRecordModal
          title="Add Industry Consultant"
          initial={{ assigned_course_codes: [] }}
          fields={[
            // Name is picked from the Dean's faculty list (period-scoped).
            { key: 'name', label: 'Name', required: true, type: 'searchable-select', options: facultyOptions, placeholder: 'Search faculty…' },
            { key: 'assigned_course_codes', label: 'Assigned Course Offering',
              // Same grouped / searchable / year-filtered picker as the Manage modal.
              render: ({ value, onChange }) => (
                courses.length === 0
                  ? <div style={{ fontSize: 13, color: '#6B7280', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6 }}>No courses in this period yet.</div>
                  : <CourseTagPicker courses={courses} value={Array.isArray(value) ? value : []} onChange={onChange} excludedByCode={takenByOther} />
              ) },
          ]}
          onSubmit={onAddConsultant}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {viewingConsultant && (
        <ViewRecordModal
          title="View"
          fields={[
            { key: 'name', label: 'Name' },
            { key: 'assigned_course_codes', label: 'Assigned Course Offering', type: 'checkboxes' },
            { key: 'status', label: 'Status' },
          ]}
          initial={{ ...viewingConsultant, assigned_course_codes: consultantCourseCodes(viewingConsultant) }}
          canEdit={isCurrentTermActive}
          onEdit={() => { setEditFromView(true); setEditingConsultant(viewingConsultant); setViewingConsultant(null); }}
          onClose={() => setViewingConsultant(null)}
        />
      )}

      {editingConsultant && (
        <EditEntityModal
          key={'consultant-edit-' + editingConsultant.id}
          title="Edit consultant"
          termLabel={currentPeriod ? currentPeriod.label : undefined}
          notice={editingConsultant.in_faculty_list === false
            ? 'This name is not in the Faculty list, so its status can’t be linked to a faculty member. Pick a status below to set it manually.'
            : undefined}
          fields={[
            // Name is picked from the Dean's faculty list (the current value is
            // kept selectable even if it isn't in the list).
            { key: 'name', label: 'Name', required: true, type: 'searchable-select', options: facultyOptions, placeholder: 'Search faculty…' },
            { key: 'assigned_course_codes', label: 'Assigned Course Offering', type: 'checkboxes',
              render: ({ value, onChange }) => (
                courses.length === 0
                  ? <div style={{ fontSize: 13, color: '#6B7280', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6 }}>No courses in this period yet.</div>
                  : <CourseTagPicker courses={courses} value={value} onChange={onChange} excludedByCode={takenByOther} />
              ) },
            { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS.consultant,
              helper: editingConsultant.in_faculty_list === false
                ? 'Not in the Faculty list — set the status manually.'
                : 'Linked to the Faculty list; editing here overrides the link.' },
          ]}
          record={{ ...editingConsultant, assigned_course_codes: consultantCourseCodes(editingConsultant) }}
          onSave={onSaveEdit}
          onBack={editFromView ? () => { setViewingConsultant(editingConsultant); setEditingConsultant(null); setEditFromView(false); } : undefined}
          onClose={() => { setEditingConsultant(null); setEditFromView(false); }}
        />
      )}

      <ConfirmModal
        open={confirmUpload}
        title="Replace consultant data?"
        message={'Uploading a file will replace existing consultants for ' + (currentPeriod ? currentPeriod.label : 'this period') + '. You\'ll review the file before anything is saved. Proceed?'}
        confirmLabel="Continue to upload"
        onConfirm={() => { setConfirmUpload(false); setShowModal(true); }}
        onCancel={() => setConfirmUpload(false)}
      />

      {assignOpen && selectedConsultant && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={() => setAssignOpen(false)} />
          <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(560px, 94vw)', background: '#FFFFFF', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, zIndex: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#18191A' }}>Manage Consultant</h2>
              <button onClick={() => setAssignOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, display: 'inline-flex', alignItems: 'center' }}><X size={22} /></button>
            </div>
            <RecordMeta record={selectedConsultant} style={{ marginTop: -8, marginBottom: 4 }} />
            <div style={{ fontSize: 14, color: '#374151' }}>Consultant: <strong>{selectedConsultant.name}</strong></div>

            {/* Status — segmented pill toggle. "Unavailable" is an archived
                status, so it warns the user and disables the course picker. */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Status
              </label>
              <div style={{ position: 'relative', display: 'flex', padding: 4, gap: 0, background: '#F3F4F6', border: 'none', borderRadius: 9999 }}>
                {/* Sliding thumb — glides between segments and crossfades
                    its colour. Hidden until a status is chosen. */}
                <div aria-hidden style={{
                  position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)',
                  borderRadius: 9999,
                  background: assignStatus === 'Unavailable' ? '#FDE68A' : '#BBF7D0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.14)',
                  transform: assignStatus === 'Unavailable' ? 'translateX(100%)' : 'translateX(0%)',
                  opacity: assignStatus ? 1 : 0,
                  willChange: 'transform',
                  transition: 'transform 0.34s cubic-bezier(0.34, 1.2, 0.64, 1), background-color 0.3s ease, opacity 0.2s ease',
                }} />
                {['Active', 'Unavailable'].map((opt) => {
                  const selected = assignStatus === opt;
                  const isUnav = opt === 'Unavailable';
                  const fg = selected ? (isUnav ? '#92400E' : '#065F46') : '#6B7280';
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAssignStatus(opt)}
                      style={{
                        position: 'relative', zIndex: 1,
                        flex: 1, height: 36, border: 'none', outline: 'none', borderRadius: 9999,
                        background: 'transparent', color: fg,
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                        transition: 'color 0.25s ease',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Archive warning — grid-rows 0fr→1fr reveal animates to the
                  content's real height, so the modal resizes without jank. */}
              <div style={{
                display: 'grid',
                gridTemplateRows: assignStatus === 'Unavailable' ? '1fr' : '0fr',
                opacity: assignStatus === 'Unavailable' ? 1 : 0,
                marginTop: assignStatus === 'Unavailable' ? 8 : 0,
                transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin-top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <div style={{ overflow: 'hidden', minHeight: 0, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <AlertTriangle size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>
                    Switching to <strong style={{ color: '#92400E' }}>Unavailable</strong> will automatically archive this consultant’s profile.
                  </span>
                </div>
              </div>
            </div>

            {/* Course picker — disabled when Unavailable */}
            <div style={{ opacity: assignStatus === 'Unavailable' ? 0.5 : 1, pointerEvents: assignStatus === 'Unavailable' ? 'none' : 'auto', transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Assign Course Offering/s
              </label>
              {assignStatus === 'Unavailable' && (
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                  Unavailable consultants cannot be assigned to courses.
                </div>
              )}
              {courses.length === 0 ? (
                <div style={{ fontSize: 13, color: '#6B7280', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6 }}>
                  No courses in this period yet.
                </div>
              ) : (
                <CourseTagPicker
                  courses={courses}
                  value={pickedCourseCodes}
                  onChange={setPickedCourseCodes}
                  excludedByCode={takenByOther}
                />
              )}
            </div>

            <div style={{ display: 'flex' }}>
              <button
                onClick={confirmAssign}
                disabled={!assignStatus}
                style={{
                  flex: 1, width: '100%', height: 40, padding: '0 20px',
                  background: !assignStatus ? '#9CA3AF' : '#18191A',
                  color: '#FFFFFF', borderRadius: 8, border: 'none',
                  cursor: !assignStatus ? 'not-allowed' : 'pointer',
                  gap: 8, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Save size={16} /><span>Save</span>
              </button>
            </div>
          </div>
        </>
      )}


      <DialogShell
        open={showModal}
        onBackdropClick={() => setShowModal(false)}
        ariaLabel="Upload Consultant List"
        panelStyle={{ width: 600, maxWidth: '94vw', padding: 24, background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
      >
            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Consultant List</div>
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

      {/* Preview & Confirm, then the 30-second undo toast. Mounted inside
          `content` — this page's return wraps everything in <SkeletonA>. */}
      <UploadPreviewFlow
        file={pendingFile}
        entity="industry_consultants"
        periodId={periodId}
        title="Upload Consultant List"
        preview={(f) => ConsultantsAPI.uploadPreview(f, periodId)}
        commit={(f) => ConsultantsAPI.upload(f, periodId)}
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

export default ProgramHeadIndustryConsultant;
