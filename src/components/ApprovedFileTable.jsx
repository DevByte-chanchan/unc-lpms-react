/**
 * ApprovedFileTable — drill-down list shown after an OVPAA user clicks
 * a department card.
 *
 * Behaviours:
 *   - Free-text search across instructor, course.
 *   - Program dropdown above the table — picks one program of the
 *     current department to filter on. "All programs" shows everything.
 *   - Click any column header to toggle asc / desc / unsorted.
 *   - Row actions: View (in-app modal viewer) and Export (download
 *     just this row's file). Exports are per-row only — there is no
 *     bulk export by design (OVPAA spec).
 *
 * Layout: CSS Grid — every header cell and every row cell uses the
 * same `GRID_TEMPLATE`, so columns are guaranteed to line up. No more
 * fragile `<table tableLayout: fixed>` + `<colgroup>` juggling.
 */
import React from 'react';
import { Search, ArrowUp, ArrowDown, Eye, Download, FileText, Layers, ChevronDown, Check } from 'react-feather';

const ACCENT     = '#B91C1C';
const SLATE_900  = '#0F172A';
const SLATE_700  = '#334155';
const SLATE_600  = '#475569';
const SLATE_500  = '#64748B';
const SLATE_400  = '#94A3B8';
const SLATE_300  = '#CBD5E1';
const SLATE_200  = '#E2E8F0';
const SLATE_100  = '#F1F5F9';
const SLATE_50   = '#F8FAFC';

const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(s);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
};

// ─────────────────────────────── columns ───────────────────────────────
const GRID_TEMPLATE =
  'minmax(180px, 2fr) minmax(220px, 2.6fr) minmax(130px, 1.3fr) minmax(130px, 1.3fr) minmax(200px, 1.6fr)';

const COLS = [
  { key: 'instructor_name', label: 'Faculty / Instructor',  align: 'left' },
  { key: 'course',          label: 'Course ID & Name',      align: 'left',   sortBy: (r) => (r.course_id + ' ' + r.course_name).toLowerCase() },
  { key: 'submission_date', label: 'Submission Date',       align: 'left' },
  { key: 'approved_date',   label: 'Approved Date',         align: 'left' },
  { key: '__actions',       label: '',                      align: 'center', sortable: false },
];

const justifyFor = (align) =>
  align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

// ─────────────────────────────── header ────────────────────────────────
const HeaderRow = ({ sort, onSort }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: GRID_TEMPLATE,
    background: SLATE_50, borderBottom: '1px solid ' + SLATE_200,
    position: 'sticky', top: 0, zIndex: 1,
  }}>
    {COLS.map((col) => {
      const active = sort && sort.key === col.key;
      const sortable = col.sortable !== false;
      return (
        <div
          key={col.key}
          onClick={() => sortable && onSort(col.key)}
          style={{
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: justifyFor(col.align), gap: 6,
            color: SLATE_600, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
            cursor: sortable ? 'pointer' : 'default', userSelect: 'none',
            minWidth: 0,
          }}
        >
          <span>{col.label}</span>
          {sortable && (
            <span style={{ display: 'inline-flex', alignItems: 'center', opacity: active ? 1 : 0.35 }}>
              {active && sort.dir === 'desc'
                ? <ArrowDown size={11} />
                : <ArrowUp size={11} />}
            </span>
          )}
        </div>
      );
    })}
  </div>
);

// ────────────────────────────── row buttons ────────────────────────────
const RowActionButton = ({ onClick, icon, label, variant = 'outline' }) => {
  const [hover, setHover] = React.useState(false);
  const styles = variant === 'solid'
    ? {
        background: hover ? '#991B1B' : ACCENT,
        color: '#FFFFFF', border: '1px solid ' + (hover ? '#991B1B' : ACCENT),
      }
    : {
        background: hover ? SLATE_50 : '#FFFFFF',
        color: SLATE_700, border: '1px solid ' + SLATE_200,
      };
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles,
        height: 30, padding: '0 10px', borderRadius: 7,
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        whiteSpace: 'nowrap',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      {icon}
      {label}
    </button>
  );
};

// ─────────────────────────────── data row ──────────────────────────────
const DataRow = ({ row, onView, onExport }) => {
  const [hover, setHover] = React.useState(false);

  const cell = (extra = {}) => ({
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    ...extra,
  });

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid', gridTemplateColumns: GRID_TEMPLATE,
        background: hover ? SLATE_50 : '#FFFFFF',
        borderBottom: '1px solid ' + SLATE_100,
        transition: 'background 0.12s ease',
      }}
    >
      {/* Faculty */}
      <div style={cell({ justifyContent: 'flex-start' })} title={row.instructor_name}>
        <span style={{ fontSize: 13, color: SLATE_900, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.instructor_name}
        </span>
      </div>

      {/* Course (ID stacked over Name, both bounded by the column) */}
      <div style={cell({ justifyContent: 'flex-start' })}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div title={row.course_id} style={{
            fontSize: 13, color: SLATE_900, fontWeight: 500, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{row.course_id}</div>
          <div title={row.course_name} style={{
            fontSize: 12, color: SLATE_500, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{row.course_name}</div>
        </div>
      </div>

      {/* Submission Date */}
      <div style={cell({ justifyContent: 'flex-start' })}>
        <span style={{ fontSize: 13, color: SLATE_700, whiteSpace: 'nowrap' }}>
          {fmtDate(row.submission_date)}
        </span>
      </div>

      {/* Approved Date */}
      <div style={cell({ justifyContent: 'flex-start' })}>
        <span style={{ fontSize: 13, color: SLATE_700, whiteSpace: 'nowrap' }}>
          {fmtDate(row.approved_date)}
        </span>
      </div>

      {/* Actions — centered under the centered header */}
      <div style={cell({ justifyContent: 'center', gap: 6 })}>
        <RowActionButton onClick={() => onView(row)}   icon={<Eye size={12} />}      label="View" />
        <RowActionButton onClick={() => onExport(row)} icon={<Download size={12} />} label="Export" variant="solid" />
      </div>
    </div>
  );
};

// ─────────────────────────── program dropdown ──────────────────────────
const ProgramDropdown = ({ programs, value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const buttonLabel = value || 'All programs';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 40, padding: '0 14px', borderRadius: 9999,
          background: '#FFFFFF', border: '1px solid ' + (value ? ACCENT : SLATE_200),
          color: SLATE_900, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          transition: 'border-color 0.15s ease',
        }}
      >
        <Layers size={14} color={value ? ACCENT : SLATE_500} />
        <span style={{ color: SLATE_500 }}>Program:</span>
        <span style={{ fontWeight: 500 }}>{buttonLabel}</span>
        <ChevronDown size={14} color={SLATE_500} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: 240, maxWidth: 320, maxHeight: 280, overflowY: 'auto',
          background: '#FFFFFF', border: '1px solid ' + SLATE_200, borderRadius: 10,
          boxShadow: '0 12px 32px rgba(15,23,42,0.12)', padding: 4, zIndex: 10,
        }}>
          <DropdownItem
            label="All programs"
            selected={!value}
            onClick={() => { onChange(null); setOpen(false); }}
          />
          {programs.length > 0 && <div style={{ height: 1, background: SLATE_100, margin: '4px 0' }} />}
          {programs.map((p) => (
            <DropdownItem
              key={p}
              label={p}
              selected={value === p}
              onClick={() => { onChange(p); setOpen(false); }}
            />
          ))}
          {programs.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12, color: SLATE_500 }}>
              No programs in this department yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({ label, selected, onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '8px 10px', borderRadius: 6,
        background: selected ? '#FEF2F2' : (hover ? SLATE_50 : 'transparent'),
        border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 500, color: selected ? ACCENT : SLATE_900,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {selected && <Check size={14} />}
    </button>
  );
};

// ──────────────────────────────── main ─────────────────────────────────
const ApprovedFileTable = ({ rows, programs, onView, onExport }) => {
  const [query, setQuery]                     = React.useState('');
  const [sort, setSort]                       = React.useState({ key: 'approved_date', dir: 'desc' });
  const [selectedProgram, setSelectedProgram] = React.useState(null);

  // Programs offered to the dropdown: the union of whatever the parent
  // passed as the department's master list and whatever programs are
  // actually present in the rows. This way the picker stays meaningful
  // even if a row carries a program the master list doesn't know about.
  const programOptions = React.useMemo(() => {
    const set = new Set();
    (programs || []).forEach((p) => p && set.add(p));
    rows.forEach((r) => r.program && set.add(r.program));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [programs, rows]);

  const onSort = (key) => {
    setSort((cur) => {
      if (cur.key !== key) return { key, dir: 'asc' };
      if (cur.dir === 'asc')  return { key, dir: 'desc' };
      return { key: null, dir: null };
    });
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.slice();

    if (selectedProgram) {
      out = out.filter((r) => r.program === selectedProgram);
    }
    if (q) {
      out = out.filter((r) =>
        [r.instructor_name, r.course_id, r.course_name, r.file_name, r.program]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    if (sort.key) {
      const col = COLS.find((c) => c.key === sort.key);
      const getKey = col && col.sortBy ? col.sortBy : (r) => String(r[sort.key] || '').toLowerCase();
      out.sort((a, b) => {
        const av = getKey(a), bv = getKey(b);
        if (av < bv) return sort.dir === 'asc' ? -1 : 1;
        if (av > bv) return sort.dir === 'asc' ?  1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, query, sort, selectedProgram]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, flex: 1 }}>
      {/* Search + Program filter + result count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', padding: '8px 14px', height: 40,
            borderRadius: 9999, background: '#FFFFFF', border: '1px solid ' + SLATE_200,
            width: 320, maxWidth: '100%',
          }}>
            <Search size={14} color={SLATE_500} style={{ marginRight: 8 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search faculty or course…"
              style={{
                border: 0, outline: 'none', background: 'transparent',
                fontSize: 13, color: SLATE_900, flex: 1,
              }}
            />
          </div>

          <ProgramDropdown
            programs={programOptions}
            value={selectedProgram}
            onChange={setSelectedProgram}
          />
        </div>

        <div style={{ fontSize: 12, color: SLATE_500, fontWeight: 500 }}>
          Showing <strong style={{ color: SLATE_900, fontWeight: 600 }}>{filtered.length}</strong>
          {filtered.length !== rows.length ? ' of ' + rows.length : ''} approved file{rows.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Grid "table" */}
      <div style={{
        flex: 1, minHeight: 0,
        background: '#FFFFFF', borderRadius: 12, border: '1px solid ' + SLATE_200,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <div style={{ minWidth: 900 /* sum of column minmax minimums + small scrollbar buffer */ }}>
            <HeaderRow sort={sort} onSort={onSort} />

            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: SLATE_500 }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <FileText size={28} color={SLATE_400} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: SLATE_700 }}>No approved submissions</div>
                  <div style={{ fontSize: 12 }}>
                    {selectedProgram
                      ? 'No files for ' + selectedProgram + '.'
                      : query ? 'No matches for "' + query + '".'
                      : 'This department has no approved files yet.'}
                  </div>
                </div>
              </div>
            ) : (
              filtered.map((r) => (
                <DataRow key={r.id} row={r} onView={onView} onExport={onExport} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovedFileTable;
