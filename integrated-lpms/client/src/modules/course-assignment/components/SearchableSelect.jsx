/**
 * SearchableSelect — single-select combobox with type-to-filter.
 *
 * Used by Add/Edit record modals when a `select` would have too many
 * options to scroll comfortably (e.g. picking a Faculty for a Program
 * Chair). The input doubles as a search filter; clicking an option
 * commits it and shows the label in the input.
 *
 * The options menu is rendered through a portal with `position: fixed`
 * anchored to the input, so it OVERLAPS (escapes) the modal container
 * instead of being clipped by its `overflow`. It has a capped max-height
 * and scrolls when the list is long, and flips above the input when there
 * isn't enough room below.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, X, Check } from 'react-feather';
import styles from '../styles/DropdownMenu.module.sass';

const MENU_MAX_HEIGHT = 160;

const SearchableSelect = ({ value, onChange, options, placeholder, highlight, searchable = true }) => {
  const [query, setQuery] = React.useState('');
  const [open, setOpen]   = React.useState(false);
  const [menuPos, setMenuPos] = React.useState(null);
  const wrapRef = React.useRef(null);
  const menuRef = React.useRef(null);

  // Anchor the fixed-position menu to the input's current viewport rect,
  // flipping above when there isn't enough room below.
  const computePos = React.useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const spaceBelow = vh - r.bottom - 12;
    const spaceAbove = r.top - 12;
    const flipUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    setMenuPos({
      left: r.left,
      width: r.width,
      top: flipUp ? undefined : r.bottom + 4,
      bottom: flipUp ? (vh - r.top + 4) : undefined,
      maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, flipUp ? spaceAbove : spaceBelow)),
    });
  }, []);

  // Recompute on open, and keep the menu pinned while the modal body (or
  // window) scrolls/resizes. Capture phase catches inner scroll containers.
  React.useLayoutEffect(() => {
    if (!open) return undefined;
    computePos();
    const reflow = () => computePos();
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);
    return () => {
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
    };
  }, [open, computePos]);

  // Click outside closes the dropdown — the menu lives in a portal, so we
  // must treat clicks inside it as "inside" too.
  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Normalize options to {value, label}.
  const normOptions = React.useMemo(() => {
    return (options || []).map((o) => typeof o === 'string' ? { value: o, label: o } : o);
  }, [options]);

  // When the popup is closed the input displays the selected label.
  // When it's open the input becomes a search field.
  const selectedLabel = React.useMemo(() => {
    const m = normOptions.find((o) => o.value === value);
    return m ? m.label : '';
  }, [normOptions, value]);

  const filtered = React.useMemo(() => {
    // Non-searchable (plain dropdown) mode never filters — always show all.
    const q = searchable ? query.trim().toLowerCase() : '';
    if (!q) return normOptions;
    return normOptions.filter((o) => o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q) || String(o.sub || '').toLowerCase().includes(q));
  }, [normOptions, query, searchable]);

  const commit = (v) => { onChange(v); setQuery(''); setOpen(false); };
  const clear  = () => { onChange(''); setQuery(''); };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen((v) => (searchable ? (v ? v : true) : !v))}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 40, padding: '0 8px 0 12px',
          border: '1px solid ' + (highlight ? '#DC2626' : (open ? '#94A3B8' : '#D1D5DB')), borderRadius: 8, background: '#FFFFFF',
          boxShadow: highlight ? '0 0 0 3px rgba(220,38,38,0.18)' : (open ? '0 0 0 3px rgba(148,163,184,0.20)' : 'none'),
          transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
          cursor: searchable ? 'text' : 'pointer',
        }}
      >
        <input
          value={(searchable && open) ? query : selectedLabel}
          onChange={(e) => { if (!searchable) return; setQuery(e.target.value); setOpen(true); }}
          readOnly={!searchable}
          placeholder={placeholder || (searchable ? 'Search…' : 'Select…')}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', cursor: searchable ? 'text' : 'pointer' }}
        />
        {value && !open && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            title="Clear"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
          >
            <X size={16} color="#6B7280" />
          </button>
        )}
        <ChevronDown size={16} color="#6B7280" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </div>

      {open && menuPos && ReactDOM.createPortal(
        <div
          ref={menuRef}
          className={styles.menu}
          style={{
            position: 'fixed',
            left: menuPos.left, width: menuPos.width,
            top: menuPos.top, bottom: menuPos.bottom,
            maxHeight: menuPos.maxHeight, overflowY: 'auto',
            background: '#FFFFFF', zIndex: 1000,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 13, color: '#6B7280' }}>No matches.</div>
          )}
          {filtered.map((o) => {
            const selected = o.value === value;
            return (
              <button
                type="button"
                key={o.value}
                onClick={() => commit(o.value)}
                className={styles.item + (selected ? ' ' + styles.itemSelected : '')}
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <Check size={14} color="#EA1212" style={{ flexShrink: 0, opacity: selected ? 1 : 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                </span>
                {o.sub ? <span style={{ fontSize: 12, color: '#6B7280', flexShrink: 0 }}>{o.sub}</span> : null}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableSelect;
