/**
 * RowActionsMenu — the per-row action set for the management / CRUD tables
 * (Course Assignment, Departments, Faculty, Programs, Industry Consultants).
 *
 * Renders TWO groups, right-aligned in the row's last cell:
 *   • `inline`  — the primary actions, shown as visible icon+label links
 *                 (e.g. View / Edit / Manage) so they're one click away.
 *   • `actions` — secondary / destructive actions (e.g. Archive), tucked
 *                 behind a "⋯" overflow menu.
 *
 *   <RowActionsMenu row={r}
 *     inline={[{ key:'edit', label:'Edit', icon:<Edit3 size={16}/>, onClick:onEdit }]}
 *     actions={[{ key:'archive', label:'Archive', icon:<Archive size={16}/>, onClick:onArchive, danger:true }]}
 *   />
 *
 * Each action is `{ key, label, icon, onClick(row), danger? }`. Pass only
 * the actions a given table needs; empty groups simply render nothing, and
 * if BOTH groups are empty the component renders nothing at all (so a
 * read-only term shows a clean, action-free row).
 *
 * Accessibility (overflow menu):
 *   • trigger is a real <button> with aria-haspopup="menu" + aria-expanded
 *   • popup is role="menu", each item role="menuitem"
 *   • ArrowUp/Down move focus, Escape closes & restores focus, Enter/Space
 *     activate. The popup is position:fixed at the trigger's measured
 *     coordinates so it's never clipped by table overflow, and closes on
 *     scroll / resize.
 */
import React from 'react';
import { createPortal } from 'react-dom';

const MENU_MIN_WIDTH = 184;
const MENU_MAX_WIDTH = 300;
const EDGE = 8;   // keep the menu this far from the window edges

// Kebab glyph drawn as three plain HTML dots (coloured <span>s), NOT an SVG —
// feather's stroke-only circles can render invisibly at small sizes, and a
// plain element with a background colour is guaranteed to paint.
const Dot = ({ color }) => (
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, display: 'block' }} />
);
const KebabIcon = ({ color = '#374151' }) => (
  <span
    aria-hidden="true"
    style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, height: 20 }}
  >
    <Dot color={color} />
    <Dot color={color} />
    <Dot color={color} />
  </span>
);

const linkStyle = {
  background: 'transparent', border: 'none', padding: 0,
  color: '#18191A', fontWeight: 500, cursor: 'pointer',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
};

const RowActionsMenu = ({ row, inline = [], actions = [], label = 'More actions', menuHeader }) => {
  const inlineItems = inline.filter(Boolean);
  const menuItems = actions.filter(Boolean);

  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState(null);
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);

  // Right-align the menu to the ⋮ button, sized to its longest item; open
  // upward when there's no room below, and never past a window edge.
  const place = React.useCallback(() => {
    const el = btnRef.current;
    const menu = menuRef.current;
    if (!el || !menu) return;
    const r = el.getBoundingClientRect();
    const w = menu.offsetWidth;
    const h = menu.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.right - w;
    left = Math.max(EDGE, Math.min(left, vw - w - EDGE));
    let top = r.bottom + 6;
    if (top + h > vh - EDGE && r.top - 6 - h >= EDGE) top = r.top - 6 - h;
    setCoords({ top: Math.round(top), left: Math.round(left) });
  }, []);

  React.useLayoutEffect(() => { if (open) place(); else setCoords(null); }, [open, place]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); if (btnRef.current) btnRef.current.focus(); }
    };
    const onScrollResize = () => setOpen(false);
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !menuRef.current) return;
    const first = menuRef.current.querySelector('[role="menuitem"]');
    if (first) first.focus();
  }, [open]);

  if (inlineItems.length === 0 && menuItems.length === 0) return null;

  const activate = (action) => { setOpen(false); if (btnRef.current) btnRef.current.focus(); action.onClick(row); };

  const onMenuKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const nodes = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'));
    if (nodes.length === 0) return;
    const i = nodes.indexOf(document.activeElement);
    let next = 0;
    if (e.key === 'ArrowDown') next = i < nodes.length - 1 ? i + 1 : 0;
    else if (e.key === 'ArrowUp') next = i > 0 ? i - 1 : nodes.length - 1;
    else if (e.key === 'End') next = nodes.length - 1;
    nodes[next].focus();
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, width: '100%' }}>
      {inlineItems.map((a) => (
        <a
          key={a.key || a.label}
          href="#"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); a.onClick(row); }}
          style={{ ...linkStyle, color: a.danger ? '#B91C1C' : '#18191A' }}
        >
          {a.icon}
          <span>{a.label}</span>
        </a>
      ))}

      {menuItems.length > 0 && (
        <div style={{ display: 'inline-flex' }}>
          <button
            ref={btnRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={label}
            title={label}
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: 8,
              background: open ? '#F3F4F6' : '#FFFFFF', border: '1px solid #D1D5DB',
              color: '#374151', cursor: 'pointer',
            }}
          >
            <KebabIcon />
          </button>

          {open && createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              onKeyDown={onMenuKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                // Portalled to <body> so no table overflow or transformed parent can clip it.
                position: 'fixed', top: coords ? coords.top : -9999, left: coords ? coords.left : -9999,
                visibility: coords ? 'visible' : 'hidden',
                width: 'max-content', minWidth: MENU_MIN_WIDTH, maxWidth: MENU_MAX_WIDTH,
                background: '#FFFFFF', boxSizing: 'border-box',
                border: '1px solid #E5E7EB', borderRadius: 10,
                boxShadow: '0 10px 28px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.06)',
                padding: 4, zIndex: 1000,
              }}
            >
              {menuHeader && (
                <div style={{ padding: '6px 10px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                  {menuHeader}
                </div>
              )}
              {menuItems.map((a) => (
                <button
                  key={a.key || a.label}
                  role="menuitem"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); activate(a); }}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px 9px 10px', borderRadius: 6,
                    background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', fontFamily: 'inherit',
                    color: a.danger ? '#B91C1C' : '#18191A',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = a.danger ? '#FEF2F2' : '#F3F4F6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  onFocus={(e) => { e.currentTarget.style.background = a.danger ? '#FEF2F2' : '#F3F4F6'; }}
                  onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {a.icon && <span style={{ display: 'inline-flex', alignItems: 'center', color: a.danger ? '#B91C1C' : '#6B7280' }}>{a.icon}</span>}
                  <span>{a.label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )}
        </div>
      )}
    </div>
  );
};

export default RowActionsMenu;
