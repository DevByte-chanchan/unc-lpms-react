/**
 * YearFilter — shared "filter by year level" control.
 *
 * Presentational only: it receives the active value, an onChange, and the
 * per-year counts (the parent owns the year-level normalization so the same
 * first/second/third/fourth → 1–4 rule is reused everywhere). Renders as a
 * pill DROPDOWN (icon + "Year:" label + selected value + chevron) matching the
 * "Program: All programs" control, opening a menu of years with their counts.
 *
 *   value      'all' | 1 | 2 | 3 | 4
 *   onChange(key)  called with 'all' or a 1–4 number
 *   counts     { 1: n, 2: n, 3: n, 4: n }  (per-year totals)
 *   total      number — the "All Years" count
 *
 * Empty years (count 0) are disabled in the menu so users don't pick a level
 * that would show a blank table.
 */
import React from 'react';
import { Layers, ChevronDown, Check } from 'react-feather';

const RED = '#EA1212';
const OPTIONS = [
  { key: 'all', label: 'All Year Levels' },
  { key: 1, label: '1st Year' },
  { key: 2, label: '2nd Year' },
  { key: 3, label: '3rd Year' },
  { key: 4, label: '4th Year' },
];

export default function YearFilter({ value, onChange, counts = {}, total = 0 }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  // Click outside dismisses the menu.
  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const countFor = (key) => (key === 'all' ? total : (counts[key] || 0));
  const current = OPTIONS.find((o) => o.key === value) || OPTIONS[0];

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        // Subtle ring on focus instead of the default black outline.
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(234,18,18,0.15)'; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 40, padding: '0 14px', borderRadius: 9999,
          border: '1px solid #D1D5DB', background: '#FFFFFF',
          fontSize: 14, cursor: 'pointer', outline: 'none', whiteSpace: 'nowrap',
        }}
      >
        <Layers size={16} color="#6B7280" />
        <span style={{ color: '#6B7280', fontWeight: 500 }}>Year Level:</span>
        <span style={{ color: '#111827', fontWeight: 600 }}>{current.label}</span>
        <ChevronDown size={16} color="#6B7280" style={{ marginLeft: 2 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 210,
            background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, zIndex: 50,
          }}
        >
          {OPTIONS.map((o) => {
            const active = value === o.key;
            const count = countFor(o.key);
            const disabled = o.key !== 'all' && count === 0;
            return (
              <button
                key={String(o.key)}
                type="button"
                disabled={disabled}
                onClick={() => { if (!disabled) { onChange(o.key); setOpen(false); } }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  width: '100%', textAlign: 'left', border: 'none', borderRadius: 6,
                  padding: '8px 10px', outline: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  background: active ? RED : 'transparent',
                  color: active ? '#FFFFFF' : (disabled ? '#C4C9D1' : '#374151'),
                  fontSize: 14, fontWeight: active ? 600 : 500,
                }}
              >
                <span>{o.label}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#FFFFFF' : '#9CA3AF' }}>{count}</span>
                  {active && <Check size={15} color="#FFFFFF" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
