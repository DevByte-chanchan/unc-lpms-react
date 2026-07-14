/**
 * CourseOfferingPicker — single-select course picker sourced from the period's
 * Course Offerings, grouped by SCIS year level with filter chips + search.
 *
 * Mirrors the Industry Consultant "Assigned Course Offering" picker (same year
 * buckets, chips, and portal dropdown), but selects ONE course. Picking a
 * course reports the full row so the caller can store code + title together.
 *
 * Props:
 *   value        — selected course code (string)
 *   onChange     — (code, course|null) => void   // course = { code, title, year_level }
 *   courses      — [{ code, title, year_level }]  (this term's offerings)
 *   excludeCodes — string[] of codes to hide (e.g. already assigned). The
 *                  current `value` is never hidden, so it always stays visible.
 *   placeholder, invalid
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, X } from 'react-feather';
import dd from '../styles/DropdownMenu.module.sass';

const YEAR_DEFS = [
  { n: 1, label: '1st Year' },
  { n: 2, label: '2nd Year' },
  { n: 3, label: '3rd Year' },
  { n: 4, label: '4th Year' },
];
const yearLevelNum = (yearLvl) => {
  const s = String(yearLvl || '').toLowerCase();
  if (s.includes('first')  || s.includes('1st') || s.trim() === '1') return 1;
  if (s.includes('second') || s.includes('2nd') || s.trim() === '2') return 2;
  if (s.includes('third')  || s.includes('3rd') || s.trim() === '3') return 3;
  if (s.includes('fourth') || s.includes('4th') || s.trim() === '4') return 4;
  return null;
};

const CourseOfferingPicker = ({ value, onChange, courses = [], excludeCodes = [], placeholder = 'Search course code or title…', invalid = false }) => {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [yearFilter, setYearFilter] = React.useState('all');
  const [menuPos, setMenuPos] = React.useState(null);
  const wrapRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const selected = React.useMemo(
    () => courses.find((c) => String(c.code).toLowerCase() === String(value || '').toLowerCase()) || null,
    [courses, value],
  );

  // Anchor the fixed-position menu to the box (flip up when tight) so it
  // escapes the modal's scroll clipping.
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

  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Codes to hide (already assigned), minus the currently-selected one.
  const excludeSet = React.useMemo(() => {
    const s = new Set((excludeCodes || []).map((c) => String(c).toLowerCase()));
    if (value) s.delete(String(value).toLowerCase());
    return s;
  }, [excludeCodes, value]);

  const options = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses
      .filter((c) => !excludeSet.has(String(c.code).toLowerCase()))
      .filter((c) => !q || c.code.toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q));
  }, [courses, query, excludeSet]);

  const byYear = React.useMemo(() => {
    const m = { 1: [], 2: [], 3: [], 4: [], null: [] };
    options.forEach((o) => { m[yearLevelNum(o.year_level) ?? 'null'].push(o); });
    return m;
  }, [options]);

  const pick = (course) => { onChange(course.code, course); setQuery(''); setOpen(false); };
  const clear = () => { onChange('', null); setQuery(''); };

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
                background: active ? '#EA1212' : '#FFFFFF',
                color: active ? '#FFFFFF' : '#374151',
                border: '1px solid ' + (active ? '#EA1212' : '#D1D5DB'),
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
          minHeight: 44, border: '1px solid ' + (invalid ? '#DC2626' : '#D1D5DB'), borderRadius: 6,
          padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 6,
          background: '#FFFFFF', cursor: 'text', alignItems: 'center',
        }}
      >
        {selected ? (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0,
              padding: '4px 8px', background: '#E5E7EB', color: '#18191A',
              borderRadius: 9999, fontSize: 13, fontWeight: 500, maxWidth: '100%',
            }}
          >
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <strong>{selected.code}</strong> — {selected.title}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              aria-label="Clear selection"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </span>
        ) : (
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            style={{ flex: 1, minWidth: 120, border: 'none', outline: 'none', fontSize: 14, padding: '4px 2px' }}
          />
        )}
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
            const groups = [1, 2, 3, 4, null].filter((n) => {
              if (yearFilter !== 'all' && n !== yearFilter) return false;
              return (byYear[n] || []).length > 0;
            });
            if (groups.length === 0) {
              return <div style={{ padding: '10px 12px', fontSize: 13, color: '#6B7280' }}>No matching courses available.</div>;
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
                    const isSel = String(o.code).toLowerCase() === String(value || '').toLowerCase();
                    return (
                      <button
                        type="button"
                        key={o.code}
                        onClick={() => pick(o)}
                        className={dd.item + (isSel ? ' ' + dd.itemSelected : '')}
                        style={{ justifyContent: 'space-between' }}
                      >
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>{o.code}</strong> — {o.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default CourseOfferingPicker;
