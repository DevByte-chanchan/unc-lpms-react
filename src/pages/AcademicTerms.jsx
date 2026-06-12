/**
 * Academic Terms — OVPAA dashboard.
 *
 * Four-panel grid:
 *   ┌───────────────────────┬───────────────────────────────┐
 *   │ Current Term (red)    │ Submitted Syllabus chart      │
 *   ├───────────────────────┼───────────────────────────────┤
 *   │ Past Terms (white)    │ TOS chart                     │
 *   └───────────────────────┴───────────────────────────────┘
 *
 * Theme:
 *   - Canvas is slate-50, panels are white with fine borders + soft
 *     shadows. The institutional red is reserved as an accent — kept
 *     only on the Current Term card and the chart data bars.
 *   - Year / Semester / Details inside the Current Term card are
 *     center-aligned per spec.
 *
 * Focus mechanic:
 *   - One focus token at a time (current-edit, current-update,
 *     past-edit-<id>, past-view-<id>). The active panel stays bright
 *     and interactive; the others render a translucent slate overlay
 *     with backdrop-blur so they fade out without a heavy mask.
 *
 * Auto-close: the backend's listPeriods marks an Active period as
 * Closed when its end_date has passed, so a refresh after the term
 * ends naturally moves the row into the Past list.
 */
import React from 'react';
import { Plus, Lock, AlertTriangle, ChevronRight, ChevronDown, ChevronUp, Edit2, RefreshCw, X, Save, Calendar, Clock, FileText, Check } from 'react-feather';
import { PeriodsAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import { formatSemester, formatPeriodLabel } from '../services/periodLabel.js';

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => thisYear - 5 + i);

// Per-department submission counts. Reset to a flat-line baseline of 0
// after the data purge — counts will populate once syllabus/TOS tracking
// hooks are wired up to real upload events.
const DEPARTMENTS = ['COE', 'CEA', 'CJE', 'SBA', 'SAS', 'SNAHS', 'SSNS'];
const MOCK_SYLLABUS = DEPARTMENTS.map((d) => ({ dept: d, count: 0 }));
const MOCK_TOS      = DEPARTMENTS.map((d) => ({ dept: d, count: 0 }));

// ────────────────────────────── helpers ──────────────────────────────

const ACCENT = '#B91C1C';
const ACCENT_HOVER = '#991B1B';
const RED_RING = 'rgba(220, 38, 38, 0.18)';
const SLATE_900 = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50  = '#F8FAFC';

const semRank = (s) => {
  const v = String(s || '').toLowerCase();
  if (v === 'summer' || v === '3') return 3;
  if (v === '2') return 2;
  if (v === '1') return 1;
  return Number(v) || 0;
};
const startYear = (sy) => {
  const m = String(sy || '').match(/(\d{4})/);
  return m ? Number(m[1]) : 0;
};
const rank = (p) => startYear(p.school_year) * 1000 + semRank(p.semester);

// Formal public-document date format: "February 12, 2028".
// Falls back to dash when the value is missing or unparseable.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = (d) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-').map(Number);
  if (!y || !m || !day || m < 1 || m > 12) return String(d);
  return MONTHS[m - 1] + ' ' + day + ', ' + y;
};

// MM/DD/YYYY for the input field overlay (forces US format regardless
// of browser locale, since native <input type="date"> uses the OS locale
// by default).
const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
const fmtMMDDYYYY = (d) => {
  if (!d) return '';
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-').map(Number);
  if (!y || !m || !day) return '';
  return pad2(m) + '/' + pad2(day) + '/' + y;
};

// White card shell.
const whiteCard = {
  background: '#FFFFFF', border: '1px solid ' + SLATE_200, borderRadius: 12,
  padding: 18, display: 'flex', flexDirection: 'column', minHeight: 0,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.04)',
  position: 'relative', overflow: 'hidden',
};

// Current Term card — display mode uses the institutional red so the
// active term reads as the page's accent. Edit / Update modes morph
// to a white card (formCard) so the dense form reads cleanly.
const displayCard = {
  background: ACCENT, color: '#FFFFFF', borderRadius: 16,
  padding: '12px 20px 28px', display: 'flex', flexDirection: 'column', minHeight: 0,
  boxShadow: '0 6px 18px rgba(185,28,28,0.20)',
  position: 'relative', overflow: 'hidden',
};
const formCard = {
  background: '#FFFFFF', color: SLATE_700, borderRadius: 16,
  padding: 24, display: 'flex', flexDirection: 'column', minHeight: 0,
  border: '1px solid ' + SLATE_200,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
  position: 'relative', overflow: 'hidden',
};

const eyebrow = (color = SLATE_400) => ({
  // Mirror styles.label from AddRecordModal: 13px / 500 / slate-500.
  fontSize: 13, fontWeight: 500, color, letterSpacing: 0,
});
const chartTitleStyle = { margin: 0, fontSize: 14, fontWeight: 600, color: SLATE_900, letterSpacing: '-0.01em' };

// Soft dim overlay — slate tint + backdrop blur. Sits inside its panel
// to fade just that one out without affecting the rest of the screen.
const DimOverlay = () => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 'inherit',
    background: 'rgba(15, 23, 42, 0.10)',
    backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
    transition: 'opacity 0.3s ease', zIndex: 5,
  }} />
);

// Buttons — three variants tuned for white vs. red surfaces.
const Btn = ({ onClick, children, variant = 'outline', disabled, surface = 'light' }) => {
  const base = {
    height: 34, padding: '0 14px', borderRadius: 8,
    fontWeight: 600, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    opacity: disabled ? 0.55 : 1, transition: 'background 0.15s ease, border-color 0.15s ease',
  };
  let style;
  if (surface === 'red') {
    style = variant === 'solid'
      ? { background: '#FFFFFF', color: ACCENT, border: 'none' }
      : { background: 'transparent', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.55)' };
  } else {
    style = variant === 'solid'
      ? { background: SLATE_900, color: '#FFFFFF', border: 'none' }
      : variant === 'accent'
        ? { background: ACCENT, color: '#FFFFFF', border: 'none' }
        : { background: '#FFFFFF', color: SLATE_700, border: '1px solid ' + SLATE_200 };
  }
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...style }}>{children}</button>;
};

// SelectField — custom branded dropdown. The trigger keeps DateField's
// SaaS look (soft fill, focus morphs to white bg + red border + red ring);
// opening it reveals a custom popup list (rounded panel, hover states, red
// active highlight + check mark) instead of the native OS option list, so
// it matches the Faculty "Role:" filter. Callers still pass <option>
// children — we read {value,label} off them, so call sites need no change.
const SelectField = ({ label, value, onChange, disabled, children, hideLabel }) => {
  const [open, setOpen]       = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  // Lift {value,label} out of the <option> children to render our own list.
  const items = React.Children.toArray(children)
    .filter((c) => c && c.props)
    .map((c) => ({ value: c.props.value, label: c.props.children }));
  const selected = items.find((it) => String(it.value) === String(value));

  const baseBg      = '#F8FAFC';
  const active      = open || focused;
  const borderColor = active ? ACCENT : SLATE_200;
  const ringShadow  = active ? '0 0 0 4px ' + RED_RING : 'none';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13,
      color: '#6B7280', fontWeight: 500, letterSpacing: 0, minWidth: 0,
    }}>
      {hideLabel ? <span style={{ visibility: 'hidden' }}>&nbsp;</span> : label}
      <div style={{ position: 'relative', minWidth: 0 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, padding: '0 14px',
            background: active ? '#FFFFFF' : baseBg,
            border: '1px solid ' + borderColor,
            borderRadius: 12,
            boxShadow: ringShadow,
            color: SLATE_900, fontSize: 14, fontWeight: 500,
            textAlign: 'left', outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {selected ? selected.label : ''}
          </span>
          <span style={{
            display: 'inline-flex', flexShrink: 0,
            color: active ? ACCENT : SLATE_400,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease, color 0.2s ease',
          }}>
            <ChevronDown size={16} />
          </span>
        </button>

        {open && !disabled && (
          <>
            {/* Click-away catcher */}
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#FFFFFF',
              border: '1px solid ' + SLATE_200, borderRadius: 12,
              boxShadow: '0 12px 28px rgba(15,23,42,0.14)',
              padding: 6, zIndex: 41,
              maxHeight: 260, overflowY: 'auto',
            }}>
              {items.map((it) => {
                const isActive = String(it.value) === String(value);
                return (
                  <button
                    key={String(it.value)}
                    type="button"
                    onClick={() => { onChange(it.value); setOpen(false); }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = SLATE_100; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, width: '100%', textAlign: 'left',
                      border: 'none', borderRadius: 8, padding: '9px 12px',
                      outline: 'none', cursor: 'pointer',
                      background: isActive ? ACCENT : 'transparent',
                      color: isActive ? '#FFFFFF' : SLATE_700,
                      fontSize: 14, fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <span>{it.label}</span>
                    {isActive && <Check size={15} color="#FFFFFF" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Modern inline date field — calendar icon prefix, focus ring, optional
// min/max bounds for cross-field validation, and an invalid state that
// surfaces a red border + inline hint when the value violates min/max.
// Field body is always white with black text + light color scheme so the
// native calendar picker pops up in a clean light theme regardless of
// the surrounding card surface.
const DateField = ({ label, value, onChange, disabled, surface = 'light', min, max, invalid, hint }) => {
  const isRed  = surface === 'red';
  const isEdit = surface === 'edit';
  const [focused, setFocused] = React.useState(false);

  // Surface palettes:
  //  - light: default white card; subtle slate borders
  //  - red:   on red surface (display mode); translucent
  //  - edit:  soft slate-50 fill, slate-200 border, focus morphs to
  //           white bg + red border + red ring (SaaS form style)
  const baseBg      = isEdit ? '#F8FAFC' : '#FFFFFF';
  const focusBg     = '#FFFFFF';
  const baseBorder  = isEdit ? SLATE_200 : SLATE_200;
  const focusBorder = isEdit ? ACCENT   : SLATE_900;
  const labelColor  = isRed ? 'rgba(255,255,255,0.85)' : SLATE_500;
  const iconColor   = focused ? (isEdit ? ACCENT : SLATE_700) : SLATE_400;
  const borderColor = invalid ? ACCENT : focused ? focusBorder : baseBorder;
  const ringShadow  = focused
    ? (isEdit ? '0 0 0 4px ' + RED_RING
       : isRed ? '0 0 0 3px rgba(255,255,255,0.25)'
       : '0 0 0 3px rgba(15,23,42,0.08)')
    : 'none';

  return (
    <label style={{
      display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13,
      color: labelColor,
      fontWeight: 500, letterSpacing: 0,
    }}>
      {label}
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center',
        height: 44,
        background: focused ? focusBg : baseBg,
        border: '1px solid ' + borderColor,
        borderRadius: 12,
        boxShadow: ringShadow,
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}>
        <span style={{
          position: 'absolute', left: 14, pointerEvents: 'none',
          color: iconColor, display: 'inline-flex',
          transition: 'color 0.2s ease',
        }}>
          <Calendar size={16} />
        </span>
        <input
          type="date"
          className="dashDateInput"
          lang="en-US"
          value={value || ''}
          min={min || undefined}
          max={max || undefined}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          style={{
            flex: 1, height: '100%',
            padding: '0 14px 0 40px',
            border: 'none', outline: 'none', background: 'transparent',
            color: 'transparent',           /* hide the native locale-formatted text */
            caretColor: 'transparent',
            fontSize: 14, fontWeight: 500,
            colorScheme: 'light',
            borderRadius: 12,
            textTransform: 'none', letterSpacing: 'normal',
          }}
        />
        {/* Overlay text — forces MM/DD/YYYY display across every browser/locale.
            pointer-events: none lets clicks fall through to the input below. */}
        <span style={{
          position: 'absolute', left: 40, right: 36,
          fontSize: 14, fontWeight: 500,
          color: value ? SLATE_900 : SLATE_400,
          pointerEvents: 'none', userSelect: 'none',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {value ? fmtMMDDYYYY(value) : 'mm/dd/yyyy'}
        </span>
      </div>
      {invalid && hint && (
        <span style={{
          marginTop: 2, fontSize: 11, fontWeight: 500, textTransform: 'none',
          letterSpacing: 'normal',
          color: isRed ? '#FECACA' : ACCENT,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <AlertTriangle size={12} /> {hint}
        </span>
      )}
    </label>
  );
};

// SVG bar chart — thick pill-shaped bars in a muted crimson, light
// diagonal hatched fill, faint dashed gridlines, and a floating value
// pill crowning the top-performing department.
const MockChart = ({ title, data }) => {
  const max = 15;
  const W = 560, H = 220;
  const padL = 32, padR = 10, padT = 22, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const slot = innerW / data.length;
  // Thick pillar bars — wider than before, clamped at 42 SVG units so 7
  // columns at viewBox width still leave breathing room between pills.
  const barW = Math.min(42, slot * 0.78);
  const yFor = (v) => padT + innerH - (v / max) * innerH;

  // Unique gradient id per chart instance so the two SVGs on the same
  // page don't collide on SVG's document-wide id space.
  const uid = React.useId().replace(/[:]/g, '');
  const gradId = 'barGrad-' + uid;

  // Identify the top-performing bar — gets a floating value pill above.
  const topIdx = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0);
  const total  = data.reduce((s, d) => s + d.count, 0);
  const topPct = total > 0 ? Math.round((data[topIdx].count / total) * 100) : 0;

  return (
    <>
      <h3 style={{ ...chartTitleStyle, marginBottom: 10 }}>{title}</h3>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          <defs>
            {/* Vertical crimson gradient — lighter at the top of the pill,
                deepening toward the base for a clean premium look. */}
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#F87171" />
              <stop offset="55%"  stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>

          {/* Faint dashed gridlines */}
          {[5, 10, 15].map((v) => (
            <g key={v}>
              <line x1={padL} y1={yFor(v)} x2={W - padR} y2={yFor(v)}
                    stroke="#EEF2F7" strokeDasharray="3 3" />
              <text x={padL - 6} y={yFor(v) + 3} textAnchor="end" fontSize="9" fill={SLATE_400}>{v}</text>
            </g>
          ))}

          {/* No heavy axis borders — just the baseline as a hairline */}
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#F1F5F9" />

          {/* Pill-shaped bars — zero-count cells just render a baseline tick. */}
          {data.map((d, i) => {
            const cx = padL + slot * i + slot / 2;
            const top = yFor(d.count);
            const barH = H - padB - top;
            const r = barW / 2;
            const isTop = total > 0 && i === topIdx;
            return (
              <g key={d.dept}>
                {d.count > 0 && (
                  <rect x={cx - barW / 2} y={top} width={barW} height={Math.max(barH, barW)}
                        rx={r} ry={r}
                        fill={'url(#' + gradId + ')'}
                        opacity={isTop ? 1 : 0.9} />
                )}
                <text x={cx} y={H - padB + 14} textAnchor="middle" fontSize="10" fill={SLATE_600} fontWeight={isTop ? 600 : 500}>
                  {d.dept}
                </text>
              </g>
            );
          })}

          {/* Floating value pill above the top bar — only when there's data. */}
          {total > 0 && (() => {
            const cx = padL + slot * topIdx + slot / 2;
            const top = yFor(data[topIdx].count);
            const pillW = 56, pillH = 18, gap = 8;
            const py = Math.max(2, top - gap - pillH);
            const px = Math.min(W - padR - pillW, Math.max(padL, cx - pillW / 2));
            return (
              <g>
                <rect x={px} y={py} width={pillW} height={pillH} rx={pillH / 2} ry={pillH / 2}
                      fill="#0F172A" />
                <path d={'M ' + (cx - 4) + ' ' + (py + pillH) + ' L ' + cx + ' ' + (py + pillH + 4) + ' L ' + (cx + 4) + ' ' + (py + pillH) + ' Z'}
                      fill="#0F172A" />
                <text x={px + pillW / 2} y={py + 12} textAnchor="middle" fontSize="10" fill="#FFFFFF" fontWeight="600">
                  {data[topIdx].count} · {topPct}%
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </>
  );
};

// ────────────────────────────── page ──────────────────────────────

const AcademicTerms = () => {
  const { periods, refreshPeriods, setCurrentPeriodId, apiReachable } = usePeriod();

  const [focus, setFocus] = React.useState(null);
  const isFocused = (token) => focus === token;
  const anyFocus = focus !== null;

  // Collapsed/expanded toggle for the Current Term card's details panel.
  const [isExpanded, setIsExpanded] = React.useState(false);


  const [editBuf,     setEditBuf]     = React.useState({ semester: '1', start_date: '', end_date: '', midterm_deadline: '', finals_deadline: '' });
  const [updateBuf,   setUpdateBuf]   = React.useState({ mode: 'term', year_from: thisYear, year_to: thisYear + 1, semester: '1', start_date: '', end_date: '', midterm_deadline: '', finals_deadline: '' });
  const [pastEditBuf, setPastEditBuf] = React.useState({ semester: '1', start_date: '', end_date: '', midterm_deadline: '', finals_deadline: '' });
  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState(null);

  // Date-range validity. Bound-checked piecewise so each field can be
  // flagged individually; lexicographic compare works on YYYY-MM-DD.
  const fieldChecks = (buf) => {
    const s = buf.start_date || '';
    const e = buf.end_date   || '';
    const m = buf.midterm_deadline || '';
    const f = buf.finals_deadline  || '';
    const endBadOrder      = !!(s && e && e < s);
    const midtermOutOfRange = !!(m && ((s && m < s) || (e && m > e)));
    const finalsOutOfRange  = !!(f && ((s && f < s) || (e && f > e)));
    const finalsBeforeMid   = !!(m && f && f < m);
    return { endBadOrder, midtermOutOfRange, finalsOutOfRange, finalsBeforeMid };
  };
  const datesValid = (buf) => {
    const c = fieldChecks(buf);
    return !c.endBadOrder && !c.midtermOutOfRange && !c.finalsOutOfRange && !c.finalsBeforeMid;
  };
  const editChecks    = fieldChecks(editBuf);
  const updateChecks  = fieldChecks(updateBuf);
  const pastChecks    = fieldChecks(pastEditBuf);
  const editValid     = datesValid(editBuf);
  const updateValid   = datesValid(updateBuf);
  const pastEditValid = datesValid(pastEditBuf);

  const currentTerm = React.useMemo(() => {
    const actives = periods.filter((p) => p.status === 'Active');
    if (actives.length === 0) return null;
    return actives.reduce((best, p) => (rank(p) > rank(best) ? p : best), actives[0]);
  }, [periods]);

  const pastTerms = React.useMemo(() => (
    periods.filter((p) => p.status === 'Closed').sort((a, b) => rank(b) - rank(a))
  ), [periods]);

  const mostRecentPastId = pastTerms[0] && pastTerms[0].id;

  // True while the current term hasn't ended yet (today ≤ end_date).
  const isWithinTerm = React.useMemo(() => {
    if (!currentTerm || !currentTerm.end_date) return false;
    const today = new Date().toISOString().slice(0, 10);
    const end   = String(currentTerm.end_date).slice(0, 10);
    return today <= end;
  }, [currentTerm]);

  // Next action the user can take:
  //   'sem'  → there's still room in this school year (current term is
  //            1st sem AND the term hasn't ended yet) — they can add
  //            the 2nd semester to the same year.
  //   'term' → no more sems left in this year (current is 2nd) OR the
  //            term has already ended — they must start a whole new
  //            academic term (new year + new semester).
  const nextAction = React.useMemo(() => {
    if (!currentTerm) return 'term';
    if (!isWithinTerm) return 'term';
    if (String(currentTerm.semester) === '1') return 'sem';
    return 'term';
  }, [currentTerm, isWithinTerm]);

  // ── Current term: Edit ───────────────────────────────────────────
  const startEdit = () => {
    if (!currentTerm) return;
    setEditBuf({
      semester:         currentTerm.semester || '1',
      start_date:       currentTerm.start_date       ? String(currentTerm.start_date).slice(0, 10)       : '',
      end_date:         currentTerm.end_date         ? String(currentTerm.end_date).slice(0, 10)         : '',
      midterm_deadline: currentTerm.midterm_deadline ? String(currentTerm.midterm_deadline).slice(0, 10) : '',
      finals_deadline:  currentTerm.finals_deadline  ? String(currentTerm.finals_deadline).slice(0, 10)  : '',
    });
    setError(null);
    setFocus('current-edit');
  };
  const saveEdit = async () => {
    if (!currentTerm) return;
    if (editBuf.start_date && editBuf.end_date && editBuf.end_date < editBuf.start_date) {
      setError('End date must be on or after start date.'); return;
    }
    setSaving(true); setError(null);
    try {
      // Edit only adjusts the current sem's dates — semester/year are
      // left as-is so the period's identity (and label) stay stable.
      await PeriodsAPI.update(currentTerm.id, {
        start_date:       editBuf.start_date       || null,
        end_date:         editBuf.end_date         || null,
        midterm_deadline: editBuf.midterm_deadline || null,
        finals_deadline:  editBuf.finals_deadline  || null,
      });
      await refreshPeriods();
      setFocus(null);
    } catch (err) { setError(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  // ── Current term: Update (create a new period) ───────────────────
  // mode='sem'  → Update Sem (next semester in the SAME school year as
  //               the current term; school-year selector hidden)
  // mode='term' → Start a New Term (pick a fresh school year + sem)
  const startUpdate = (mode = 'term') => {
    let yFrom = thisYear, yTo = thisYear + 1, semester = '1';
    if (currentTerm) {
      yFrom = startYear(currentTerm.school_year) || thisYear;
      yTo = yFrom + 1;
      if (currentTerm.semester === '1') { semester = '2'; }
      else if (currentTerm.semester === '2') {
        // Advancing past 2nd sem rolls into the next year's 1st sem
        // for a fresh "New Term"; for "Update Sem" we just default to 1st.
        if (mode === 'term') { yFrom += 1; yTo += 1; }
        semester = '1';
      }
      else { semester = '1'; }
    }
    setUpdateBuf({ mode, year_from: yFrom, year_to: yTo, semester, start_date: '', end_date: '', midterm_deadline: '', finals_deadline: '' });
    setError(null);
    setFocus('current-update');
  };

  // Calendar-day bounds derived from the chosen school year. Start/End
  // of Semester pickers can only resolve inside this window.
  const yearBounds = React.useMemo(() => ({
    min: updateBuf.year_from ? (updateBuf.year_from + '-01-01') : undefined,
    max: updateBuf.year_to   ? (updateBuf.year_to   + '-12-31') : undefined,
  }), [updateBuf.year_from, updateBuf.year_to]);

  // Same idea for the Edit flow: lock pickers to the term's existing
  // school year (e.g. "2026-2027" → Jan 1 2026 → Dec 31 2027).
  const editYearBounds = React.useMemo(() => {
    if (!currentTerm || !currentTerm.school_year) return { min: undefined, max: undefined };
    const m = String(currentTerm.school_year).match(/(\d{4})\s*-\s*(\d{4})/);
    if (!m) return { min: undefined, max: undefined };
    return { min: m[1] + '-01-01', max: m[2] + '-12-31' };
  }, [currentTerm]);

  const saveUpdate = async () => {
    const { year_from, year_to, semester, start_date, end_date, midterm_deadline, finals_deadline } = updateBuf;
    if (!year_from || !year_to || year_to <= year_from) { setError('End year must be after start year.'); return; }
    if (!start_date)                                    { setError('Pick a Start of Semester date.'); return; }
    if (!end_date)                                      { setError('Pick an End of Semester date.'); return; }
    if (start_date && end_date && end_date < start_date) { setError('End date must be on or after start date.'); return; }
    if (!semester)                                      { setError('Pick a Semester.'); return; }
    setSaving(true); setError(null);
    try {
      const school_year = year_from + '-' + year_to;
      const label = formatPeriodLabel({ school_year, semester });
      const created = await PeriodsAPI.create({
        label, school_year, semester, sort_order: 50,
        start_date,
        end_date,
        midterm_deadline: midterm_deadline || null,
        finals_deadline:  finals_deadline  || null,
      });
      // Move the prior current term into the Past Academic Terms list
      // by closing it. Done after the new term is successfully created
      // so a failure here doesn't strand the user without an active term.
      if (currentTerm && currentTerm.id !== created.id) {
        try { await PeriodsAPI.close(currentTerm.id); }
        catch (e) { console.warn('[period] could not auto-close prior term:', e && e.message); }
      }
      await refreshPeriods();
      setCurrentPeriodId(created.id);
      setFocus(null);
    } catch (err) { setError(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  // ── Past term: Edit (most recent only) / View ────────────────────
  const startPastEdit = (p) => {
    setPastEditBuf({
      semester:         p.semester         || '1',
      start_date:       p.start_date       ? String(p.start_date).slice(0, 10)       : '',
      end_date:         p.end_date         ? String(p.end_date).slice(0, 10)         : '',
      midterm_deadline: p.midterm_deadline ? String(p.midterm_deadline).slice(0, 10) : '',
      finals_deadline:  p.finals_deadline  ? String(p.finals_deadline).slice(0, 10)  : '',
    });
    setError(null);
    setFocus('past-edit-' + p.id);
  };
  const savePastEdit = async (p) => {
    setSaving(true); setError(null);
    try {
      const newSem   = pastEditBuf.semester || p.semester;
      const newLabel = formatPeriodLabel({ school_year: p.school_year, semester: newSem });
      await PeriodsAPI.update(p.id, {
        semester:         newSem,
        label:            newLabel,
        start_date:       pastEditBuf.start_date       || null,
        end_date:         pastEditBuf.end_date         || null,
        midterm_deadline: pastEditBuf.midterm_deadline || null,
        finals_deadline:  pastEditBuf.finals_deadline  || null,
      });
      await refreshPeriods();
      setFocus(null);
    } catch (err) { setError(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };
  const startPastView = (p) => { setFocus('past-view-' + p.id); };

  const cancelFocus = () => { setFocus(null); setError(null); };

  // Dim helpers per panel.
  const dimCurrent = anyFocus && !(isFocused('current-edit') || isFocused('current-update'));
  const dimPast    = anyFocus && !(focus && focus.startsWith('past-'));
  const dimCharts  = anyFocus;

  // ─────────────────────────── render ───────────────────────────
  return (
    <div style={{ padding: 20, background: '#FFFFFF', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <div style={{ marginTop: 4, fontSize: 13, color: SLATE_600 }}>
            Manage the current academic term and review past terms. Terms auto-close when their end date passes.
          </div>
        </div>
      </div>

      {!apiReachable && (
        <div style={{ marginBottom: 12, padding: '12px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, color: ACCENT, fontSize: 13 }}>
          <strong>Cannot reach the API.</strong> Restart <code>npm run dev</code> in the <code>server</code> folder.
        </div>
      )}

      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 1.7fr)',
        // Row ratio adapts to which panel is the focus, so the active
        // panel always has room and the inactive one stays visible.
        //   current-edit  → Current grows, Past shrinks but visible
        //   past-view     → Past grows, Current shrinks but visible
        //   everything else → equal split
        // (current-update + past-edit both span both rows on their own
        //  panel via gridRow:'1/span 2' and hide the sibling — handled
        //  per-panel, so this row-template stays neutral for them.)
        gridTemplateRows: isFocused('current-edit') ? '1.55fr 0.45fr'
                        : (focus && focus.startsWith('past-view-')) ? '0.55fr 1.45fr'
                        : '1fr 1fr',
        gap: 14,
        transition: 'grid-template-rows 0.3s ease',
      }}>

        {/* ───── Current term ─────
            Display mode → red card. Edit / Update New Term focus →
            morphs into a white "form mode" card with red text + black
            field outlines so the dense form reads cleanly. The Update
            New Term focus also spans both grid rows so nothing has to
            scroll, and the past-terms cell hides for balance. */}
        <div style={{
          ...(isFocused('current-edit') || isFocused('current-update') ? formCard : displayCard),
          // Update New Term still spans both rows (lots of fields).
          // Edit form stays in row 1 — the row ratio above expands it.
          ...(isFocused('current-update') ? { gridRow: '1 / span 2', overflowY: 'auto' } : null),
          ...(isFocused('current-edit') ? { overflowY: 'auto' } : null),
          // Hide the Current Term card while the user is editing a past
          // term — the Past Academic Terms card expands to fill both rows.
          ...(focus && focus.startsWith('past-edit-') ? { display: 'none' } : null),
        }}>
          {!currentTerm && !isFocused('current-update') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#FFFFFF' }}>No active term yet</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>Click <strong>Update Term</strong> to create the first one.</div>
              <button
                onClick={() => startUpdate('term')}
                style={{
                  background: '#FFFFFF', color: ACCENT, border: 'none', cursor: 'pointer',
                  padding: '0 20px', height: 40, borderRadius: 12, fontSize: 14, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                <Plus size={14} /> Update Term
              </button>
            </div>
          )}

          {currentTerm && !isFocused('current-edit') && !isFocused('current-update') && (
            <>
              {/* ── COLLAPSED state ── Only eyebrow + big year + semester + down arrow */}
              {!isExpanded && (
                <>
                  <div style={{ ...eyebrow('rgba(255,255,255,0.80)'), textAlign: 'left' }}>
                    Current Term
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', gap: 10,
                  }}>
                    <div style={{
                      fontSize: 64, fontWeight: 800, color: '#FFFFFF',
                      letterSpacing: '-0.02em', lineHeight: 1,
                    }}>
                      {currentTerm.school_year}
                    </div>
                    <div style={{
                      fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.95)',
                      lineHeight: 1.2,
                    }}>
                      {formatSemester(currentTerm.semester)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    title="Show details"
                    aria-label="Expand term details"
                    style={{
                      alignSelf: 'center', marginTop: 12,
                      background: 'transparent', border: 'none',
                      color: '#FFFFFF', cursor: 'pointer',
                      padding: 2, borderRadius: 9999,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'dashArrowBob 1.6s ease-in-out infinite',
                      transition: 'transform 0.2s ease, background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <ChevronDown size={22} color="#FFFFFF" strokeWidth={2.5} />
                  </button>
                </>
              )}

              {/* ── EXPANDED state ── Up arrow + details + action buttons */}
              {isExpanded && (
                <>
                  {/* Up arrow at the top — collapses back to year/semester view */}
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    title="Hide details"
                    aria-label="Collapse term details"
                    style={{
                      alignSelf: 'center', marginBottom: 12,
                      background: 'transparent', border: 'none',
                      color: '#FFFFFF', cursor: 'pointer',
                      padding: 2, borderRadius: 9999,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.2s ease, background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <ChevronUp size={22} color="#FFFFFF" strokeWidth={2.5} />
                  </button>

                  {/* Subtle divider — clear breathing room under the up-arrow */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.20)', margin: '0 0 12px' }} />

                  {/* Semester Duration */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
                      <Calendar size={12} /> Semester Duration
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
                      {fmtDate(currentTerm.start_date)} &nbsp;—&nbsp; {fmtDate(currentTerm.end_date)}
                    </div>
                  </div>

                  {/* Midterm + Finals deadlines */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
                        <Clock size={12} /> Midterm Deadline
                      </div>
                      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
                        {fmtDate(currentTerm.midterm_deadline)}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
                        <FileText size={12} /> Finals Deadline
                      </div>
                      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: '#FFFFFF' }}>
                        {fmtDate(currentTerm.finals_deadline)}
                      </div>
                    </div>
                  </div>

                  {/* Push buttons to the bottom */}
                  <div style={{ flex: 1, minHeight: 8 }} />

                  {/* Action row — two distinct forms:
                      - Edit (outlined) → edits the current sem's dates only.
                      - Update Sem / Update Term (primary) → opens the
                        new-term creation form. Label dynamically swaps:
                        "Update Sem" while the current term is still active
                        (you're adding the next sem), "Update Term" once
                        the current term has ended (you're moving to the
                        next school year). Both go to startUpdate. */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 10, marginTop: 10, paddingTop: 10,
                    borderTop: '1px solid rgba(255,255,255,0.15)',
                  }}>
                    <button
                      onClick={startEdit}
                      style={{
                        background: 'transparent', color: '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.45)',
                        cursor: 'pointer', padding: '0 14px', height: 34, borderRadius: 10,
                        fontSize: 13, fontWeight: 500,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        transition: 'background 0.15s ease, border-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor = '#FFFFFF'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'; }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => startUpdate(nextAction)}
                      style={{
                        background: '#FFFFFF', color: ACCENT, border: 'none', cursor: 'pointer',
                        padding: '0 16px', height: 34, borderRadius: 10,
                        fontSize: 13, fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                    >
                      <RefreshCw size={13} /> {nextAction === 'sem' ? 'Update Sem' : 'Update Term'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {currentTerm && isFocused('current-edit') && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <div style={{ ...eyebrow(SLATE_500), textAlign: 'left' }}>Edit Current Sem</div>
                  <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: SLATE_900, letterSpacing: '-0.01em' }}>
                    {currentTerm.school_year} · {formatSemester(currentTerm.semester)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <DateField surface="edit" label="Start of Semester"
                    value={editBuf.start_date}
                    min={editYearBounds.min}
                    max={editBuf.end_date || editYearBounds.max}
                    onChange={(v) => setEditBuf((b) => ({ ...b, start_date: v }))}
                    disabled={saving} />
                  <DateField surface="edit" label="End of Semester"
                    value={editBuf.end_date}
                    min={editBuf.start_date || editYearBounds.min}
                    max={editYearBounds.max}
                    invalid={!editValid}
                    hint={!editValid ? 'End date must be on or after start date' : undefined}
                    onChange={(v) => setEditBuf((b) => ({ ...b, end_date: v }))}
                    disabled={saving} />
                  <DateField surface="edit" label="Midterm Deadline"
                    value={editBuf.midterm_deadline}
                    min={editBuf.start_date || editYearBounds.min}
                    max={editBuf.end_date   || editYearBounds.max}
                    invalid={editChecks.midtermOutOfRange}
                    hint={editChecks.midtermOutOfRange ? 'Must fall within Start and End of Semester' : undefined}
                    onChange={(v) => setEditBuf((b) => ({ ...b, midterm_deadline: v }))}
                    disabled={saving} />
                  <DateField surface="edit" label="Finals Deadline"
                    value={editBuf.finals_deadline}
                    min={editBuf.midterm_deadline || editBuf.start_date || editYearBounds.min}
                    max={editBuf.end_date         || editYearBounds.max}
                    invalid={editChecks.finalsOutOfRange || editChecks.finalsBeforeMid}
                    hint={editChecks.finalsOutOfRange ? 'Must fall within Start and End of Semester'
                          : editChecks.finalsBeforeMid ? 'Must be on or after Midterm Deadline'
                          : undefined}
                    onChange={(v) => setEditBuf((b) => ({ ...b, finals_deadline: v }))}
                    disabled={saving} />
                </div>

                {error && (
                  <div style={{ fontSize: 12, color: ACCENT, background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={12} /> {error}
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 24, paddingTop: 16, borderTop: '1px solid ' + SLATE_100 }}>
                <button
                  onClick={cancelFocus} disabled={saving}
                  style={{
                    background: 'transparent', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                    padding: '8px 16px', fontSize: 14, fontWeight: 500, color: SLATE_500,
                    opacity: saving ? 0.6 : 1, transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.color = SLATE_900; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit} disabled={saving || !editValid}
                  style={{
                    background: (saving || !editValid) ? '#FCA5A5' : ACCENT,
                    color: '#FFFFFF', border: 'none', cursor: (saving || !editValid) ? 'not-allowed' : 'pointer',
                    padding: '0 24px', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    boxShadow: (saving || !editValid) ? 'none' : '0 4px 12px rgba(185,28,28,0.25)',
                    transition: 'background 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!saving && editValid) e.currentTarget.style.background = ACCENT_HOVER; }}
                  onMouseLeave={(e) => { if (!saving && editValid) e.currentTarget.style.background = ACCENT; }}
                >
                  <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )}

          {isFocused('current-update') && (() => {
            const isSemMode = updateBuf.mode === 'sem';
            const headerEyebrow = isSemMode ? 'Update Sem' : 'Start a New Term';
            const headerTitle   = isSemMode
              ? ('Next semester · ' + updateBuf.year_from + '-' + updateBuf.year_to)
              : 'Term details';
            const primaryLabel  = isSemMode ? 'Save Sem' : 'Save New Term';
            return (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <div style={{ ...eyebrow(SLATE_500), textAlign: 'left' }}>{headerEyebrow}</div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: SLATE_900, letterSpacing: '-0.01em' }}>
                      {headerTitle}
                    </div>
                  </div>

                  {/* School Year — only when creating a brand new term */}
                  {!isSemMode && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', columnGap: 12, alignItems: 'end' }}>
                      <SelectField
                        label="School Year"
                        value={updateBuf.year_from}
                        onChange={(v) => setUpdateBuf((b) => ({ ...b, year_from: Number(v), year_to: Number(v) + 1, start_date: '', end_date: '', midterm_deadline: '', finals_deadline: '' }))}
                        disabled={saving}
                      >
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </SelectField>
                      <span style={{ marginBottom: 12, color: SLATE_400, fontSize: 13, fontWeight: 500 }}>to</span>
                      <SelectField
                        label="School Year"
                        hideLabel
                        value={updateBuf.year_to}
                        onChange={(v) => setUpdateBuf((b) => ({ ...b, year_to: Number(v), start_date: '', end_date: '', midterm_deadline: '', finals_deadline: '' }))}
                        disabled={saving}
                      >
                        {YEARS.filter((y) => y > updateBuf.year_from).map((y) => <option key={y} value={y}>{y}</option>)}
                      </SelectField>
                    </div>
                  )}

                  {/* 1. Semester */}
                  <SelectField
                    label="Semester"
                    value={updateBuf.semester}
                    onChange={(v) => setUpdateBuf((b) => (
                      v === b.semester
                        ? b
                        : { ...b, semester: v, start_date: '', end_date: '', midterm_deadline: '', finals_deadline: '' }
                    ))}
                    disabled={saving}
                  >
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </SelectField>

                  {/* 2. Start + End — strictly bounded by the school year window */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <DateField surface="edit" label="Start of Semester"
                      value={updateBuf.start_date}
                      min={yearBounds.min}
                      max={updateBuf.end_date || yearBounds.max}
                      onChange={(v) => setUpdateBuf((b) => ({ ...b, start_date: v }))}
                      disabled={saving} />
                    <DateField surface="edit" label="End of Semester"
                      value={updateBuf.end_date}
                      min={updateBuf.start_date || yearBounds.min}
                      max={yearBounds.max}
                      invalid={updateChecks.endBadOrder}
                      hint={updateChecks.endBadOrder ? 'End date must be on or after start date' : undefined}
                      onChange={(v) => setUpdateBuf((b) => ({ ...b, end_date: v }))}
                      disabled={saving} />
                  </div>

                  {/* 3. Midterm + Finals — bounded by the picked semester window */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <DateField surface="edit" label="Midterm Deadline"
                      value={updateBuf.midterm_deadline}
                      min={updateBuf.start_date || yearBounds.min}
                      max={updateBuf.end_date   || yearBounds.max}
                      invalid={updateChecks.midtermOutOfRange}
                      hint={updateChecks.midtermOutOfRange ? 'Must fall within Start and End of Semester' : undefined}
                      onChange={(v) => setUpdateBuf((b) => ({ ...b, midterm_deadline: v }))}
                      disabled={saving} />
                    <DateField surface="edit" label="Finals Deadline"
                      value={updateBuf.finals_deadline}
                      min={updateBuf.midterm_deadline || updateBuf.start_date || yearBounds.min}
                      max={updateBuf.end_date         || yearBounds.max}
                      invalid={updateChecks.finalsOutOfRange || updateChecks.finalsBeforeMid}
                      hint={updateChecks.finalsOutOfRange ? 'Must fall within Start and End of Semester'
                            : updateChecks.finalsBeforeMid ? 'Must be on or after Midterm Deadline'
                            : undefined}
                      onChange={(v) => setUpdateBuf((b) => ({ ...b, finals_deadline: v }))}
                      disabled={saving} />
                  </div>

                  {error && (
                    <div style={{ fontSize: 12, color: ACCENT, background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={12} /> {error}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 24, paddingTop: 16, borderTop: '1px solid ' + SLATE_100 }}>
                  <button
                    onClick={cancelFocus} disabled={saving}
                    style={{
                      background: 'transparent', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                      padding: '8px 16px', fontSize: 14, fontWeight: 500, color: SLATE_500,
                      opacity: saving ? 0.6 : 1, transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!saving) e.currentTarget.style.color = SLATE_900; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveUpdate} disabled={saving || !updateValid}
                    style={{
                      background: (saving || !updateValid) ? '#FCA5A5' : ACCENT,
                      color: '#FFFFFF', border: 'none', cursor: (saving || !updateValid) ? 'not-allowed' : 'pointer',
                      padding: '0 24px', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      boxShadow: (saving || !updateValid) ? 'none' : '0 4px 12px rgba(185,28,28,0.25)',
                      transition: 'background 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!saving && updateValid) e.currentTarget.style.background = ACCENT_HOVER; }}
                    onMouseLeave={(e) => { if (!saving && updateValid) e.currentTarget.style.background = ACCENT; }}
                  >
                    <Save size={14} /> {saving ? 'Saving…' : primaryLabel}
                  </button>
                </div>
              </>
            );
          })()}

          {dimCurrent && <DimOverlay />}
        </div>

        {/* ───── Syllabus chart ───── */}
        <div style={whiteCard}>
          <MockChart title="Submitted Syllabus" data={MOCK_SYLLABUS} />
          {dimCharts && <DimOverlay />}
        </div>

        {/* ───── Past terms (white) ─────
            Expands to span both rows when the user is editing a past term
            so the inline edit form has room to breathe; switches its body
            into a dedicated full-card edit layout (buttons pinned bottom). */}
        <div style={{
          ...whiteCard,
          // Past Terms stays visible during current-edit (just smaller).
          // It only hides when the Update New Term form takes both rows.
          ...(isFocused('current-update') ? { display: 'none' } : null),
          ...(focus && focus.startsWith('past-edit-') ? { gridRow: '1 / span 2', overflowY: 'auto' } : null),
        }}>
          <div style={eyebrow(SLATE_400)}>History</div>
          <h3 style={{ margin: '4px 0 12px', fontSize: 16, fontWeight: 700, color: SLATE_900 }}>Past Academic Terms</h3>

          {/* ── Past-edit dedicated body — fills the card, buttons at bottom ── */}
          {focus && focus.startsWith('past-edit-') && (() => {
            const editingId = Number(focus.slice('past-edit-'.length));
            const p = pastTerms.find((x) => x.id === editingId);
            if (!p) return null;
            return (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ ...eyebrow(SLATE_500), textAlign: 'left' }}>Edit Past Term</div>
                    <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: SLATE_900, letterSpacing: '-0.01em' }}>
                      {p.school_year}
                    </div>
                  </div>

                  <SelectField
                    label="Semester"
                    value={pastEditBuf.semester}
                    onChange={(v) => setPastEditBuf((b) => (
                      v === b.semester
                        ? b
                        : { ...b, semester: v, start_date: '', end_date: '', midterm_deadline: '', finals_deadline: '' }
                    ))}
                    disabled={saving}
                  >
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </SelectField>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <DateField surface="edit" label="Start of Semester"
                      value={pastEditBuf.start_date}
                      max={pastEditBuf.end_date || undefined}
                      onChange={(v) => setPastEditBuf((b) => ({ ...b, start_date: v }))}
                      disabled={saving} />
                    <DateField surface="edit" label="End of Semester"
                      value={pastEditBuf.end_date}
                      min={pastEditBuf.start_date || undefined}
                      invalid={pastChecks.endBadOrder}
                      hint={pastChecks.endBadOrder ? 'End date must be on or after start date' : undefined}
                      onChange={(v) => setPastEditBuf((b) => ({ ...b, end_date: v }))}
                      disabled={saving} />
                    <DateField surface="edit" label="Midterm Deadline"
                      value={pastEditBuf.midterm_deadline}
                      min={pastEditBuf.start_date || undefined}
                      max={pastEditBuf.end_date   || undefined}
                      invalid={pastChecks.midtermOutOfRange}
                      hint={pastChecks.midtermOutOfRange ? 'Must fall within Start and End of Semester' : undefined}
                      onChange={(v) => setPastEditBuf((b) => ({ ...b, midterm_deadline: v }))}
                      disabled={saving} />
                    <DateField surface="edit" label="Finals Deadline"
                      value={pastEditBuf.finals_deadline}
                      min={pastEditBuf.midterm_deadline || pastEditBuf.start_date || undefined}
                      max={pastEditBuf.end_date         || undefined}
                      invalid={pastChecks.finalsOutOfRange || pastChecks.finalsBeforeMid}
                      hint={pastChecks.finalsOutOfRange ? 'Must fall within Start and End of Semester'
                            : pastChecks.finalsBeforeMid ? 'Must be on or after Midterm Deadline'
                            : undefined}
                      onChange={(v) => setPastEditBuf((b) => ({ ...b, finals_deadline: v }))}
                      disabled={saving} />
                  </div>

                  {error && (
                    <div style={{ fontSize: 12, color: ACCENT, background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={12} /> {error}
                    </div>
                  )}
                </div>

                {/* Spacer pushes Cancel + Save to the bottom of the card */}
                <div style={{ flex: 1, minHeight: 16 }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18, paddingTop: 16, borderTop: '1px solid ' + SLATE_100 }}>
                  <button
                    onClick={cancelFocus} disabled={saving}
                    style={{
                      background: 'transparent', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                      padding: '8px 16px', fontSize: 14, fontWeight: 500, color: SLATE_500,
                      opacity: saving ? 0.6 : 1, transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!saving) e.currentTarget.style.color = SLATE_900; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => savePastEdit(p)} disabled={saving || !pastEditValid}
                    style={{
                      background: (saving || !pastEditValid) ? '#FCA5A5' : ACCENT,
                      color: '#FFFFFF', border: 'none', cursor: (saving || !pastEditValid) ? 'not-allowed' : 'pointer',
                      padding: '0 24px', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      boxShadow: (saving || !pastEditValid) ? 'none' : '0 4px 12px rgba(185,28,28,0.25)',
                      transition: 'background 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!saving && pastEditValid) e.currentTarget.style.background = ACCENT_HOVER; }}
                    onMouseLeave={(e) => { if (!saving && pastEditValid) e.currentTarget.style.background = ACCENT; }}
                  >
                    <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Normal list (hidden during past-edit) ── */}
          {!(focus && focus.startsWith('past-edit-')) && (<>


          {pastTerms.length === 0 && (
            <div style={{ fontSize: 13, color: SLATE_600 }}>
              No past terms yet. Once the current term's end date passes, it will appear here.
            </div>
          )}

          <div
            className="dashPastScrollList"
            style={{ overflowY: 'auto', flex: 1, paddingTop: pastTerms.length ? 4 : 0 }}
          >
            {pastTerms.map((p) => {
              const isMostRecent = p.id === mostRecentPastId;
              const editing = focus === 'past-edit-' + p.id;
              const viewing = focus === 'past-view-' + p.id;
              return (
                <div key={p.id} style={{
                  padding: 16, marginBottom: 12,
                  borderRadius: 12, background: '#FFFFFF',
                  border: '1px solid ' + SLATE_100,
                  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                  transition: 'background 0.15s ease, box-shadow 0.15s ease',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
                onMouseEnter={(e) => { if (!editing && !viewing) e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  {!editing && !viewing && (
                    /* Compact row — year + sem on left, action buttons on right */
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: SLATE_900, lineHeight: 1.2 }}>
                          {p.school_year}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: SLATE_500, marginTop: 2 }}>
                          {formatSemester(p.semester)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {!isMostRecent && (
                          <span title="Older terms are locked"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: SLATE_400, fontSize: 12 }}>
                            <Lock size={12} /> locked
                          </span>
                        )}
                        <button onClick={() => startPastView(p)} style={{
                          background: 'transparent', border: 'none', color: SLATE_700,
                          cursor: 'pointer', fontSize: 13, fontWeight: 500,
                          display: 'inline-flex', alignItems: 'center', gap: 2,
                        }}>
                          View <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {viewing && (
                    <>
                      {/* Header row — year + sem on left, status badge on right */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: SLATE_900, lineHeight: 1.2 }}>
                            {p.school_year}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: SLATE_500, marginTop: 2 }}>
                            {formatSemester(p.semester)}
                          </span>
                        </div>
                        <span style={{
                          padding: '2px 10px', borderRadius: 9999,
                          fontSize: 11, fontWeight: 600,
                          background: SLATE_100, color: SLATE_600,
                          letterSpacing: '0.02em', whiteSpace: 'nowrap',
                        }}>
                          {p.status || 'Closed'}
                        </span>
                      </div>

                      {/* Duration row */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: SLATE_700, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{fmtDate(p.start_date)}</span>
                          <span style={{ color: SLATE_400 }}>→</span>
                          <span>{fmtDate(p.end_date)}</span>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: SLATE_500 }}>
                          Semester Duration
                        </div>
                      </div>

                      {/* Deadlines grid */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 8,
                        paddingTop: 10, borderTop: '1px solid ' + SLATE_100,
                      }}>
                        <div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#6B7280', fontSize: 13, fontWeight: 500 }}>
                            <Clock size={11} /> Midterm
                          </div>
                          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 500, color: SLATE_700 }}>
                            {fmtDate(p.midterm_deadline)}
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#6B7280', fontSize: 13, fontWeight: 500 }}>
                            <FileText size={11} /> Finals
                          </div>
                          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 500, color: SLATE_700 }}>
                            {fmtDate(p.finals_deadline)}
                          </div>
                        </div>
                      </div>

                      {/* Footer actions — Edit only for the most recent past term */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                        <Btn variant="outline" onClick={cancelFocus}><X size={12} /> Close</Btn>
                        {isMostRecent && (
                          <Btn variant="accent" onClick={() => startPastEdit(p)}><Edit2 size={12} /> Edit</Btn>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </>)}

          {dimPast && <DimOverlay />}
        </div>

        {/* ───── TOS chart ───── */}
        <div style={whiteCard}>
          <MockChart title="Table of Specification" data={MOCK_TOS} />
          {dimCharts && <DimOverlay />}
        </div>
      </div>

    </div>
  );
};

export default AcademicTerms;
