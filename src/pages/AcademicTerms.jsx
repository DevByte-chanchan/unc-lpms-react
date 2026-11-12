/**
 * Academic Terms — OVPAA dashboard.
 *
 * Four-panel grid:
 *   ┌───────────────────────┬───────────────────────────────┐
 *   │ Current Term          │ Submitted Learning Plan chart │
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
import { Plus, Lock, AlertTriangle, ChevronRight, ChevronDown, ChevronUp, Edit2, RefreshCw, X, Save, Calendar, Check } from 'react-feather';
import { PeriodsAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import { formatSemester, formatPeriodLabel, termDatesPending } from '../services/periodLabel.js';
import {
  BLANK_TERM_DATES, calendarOrderIssue, termDatesOf, termDatesPayload,
} from '../services/schoolCalendar.js';
import {
  calendarChecks, calendarRows, manilaToday, nextCalendarDate, progressText, termProgress, termWeeks,
} from '../services/termCalendar.js';
import SchoolCalendarFill, { SchoolCalendarLink } from '../components/SchoolCalendarFill.jsx';

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => thisYear - 5 + i);

// Per-department submission counts. Reset to a flat-line baseline of 0
// after the data purge — counts will populate once syllabus/TOS tracking
// hooks are wired up to real upload events.
const DEPARTMENTS = ['COE', 'CEA', 'CJE', 'SBA', 'SAS', 'SNAHS', 'SSNS'];

// PLACEHOLDER DATA — not real submissions.
//
// Both charts were plotting a count of 0 for every department, so they drew as
// empty grids: axes, labels, no bars. Nothing was broken; there was simply
// nothing to show. These are hand-picked numbers so the charts read as charts
// while the real feeds are still being wired up — the two sets differ on purpose
// so the panels don't look like a copy-paste of each other, and both stay under
// the y-axis ceiling of 15.
//
// Swap these for the live counts (grouped by department, for the current term)
// and MockChart needs no changes at all.
const MOCK_LEARNING_PLAN = [
  { dept: 'COE',   count: 12 },
  { dept: 'CEA',   count: 9  },
  { dept: 'CJE',   count: 6  },
  { dept: 'SBA',   count: 14 },
  { dept: 'SAS',   count: 8  },
  { dept: 'SNAHS', count: 11 },
  { dept: 'SSNS',  count: 5  },
];
const MOCK_TOS = [
  { dept: 'COE',   count: 8  },
  { dept: 'CEA',   count: 13 },
  { dept: 'CJE',   count: 4  },
  { dept: 'SBA',   count: 10 },
  { dept: 'SAS',   count: 12 },
  { dept: 'SNAHS', count: 7  },
  { dept: 'SSNS',  count: 9  },
];

// ────────────────────────────── helpers ──────────────────────────────

const ACCENT = '#18191A';
// Lighter, not darker: ACCENT is already all but black, so darkening it on hover
// is a change nobody can see. (It briefly WAS the same value as ACCENT, which is
// a hover state that does nothing at all.)
const ACCENT_HOVER = '#33353A';
const FOCUS_RING = 'rgba(24, 25, 26, 0.18)';
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

// Two date fields side by side, one per line when the form is too narrow.
const FIELD_GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 };

// The cards size to their content and the page scrolls: none of them has a
// fixed height or clips what's inside, so no button can end up out of reach.

// White card shell.
const whiteCard = {
  background: '#FFFFFF', border: '1px solid ' + SLATE_200, borderRadius: 12,
  padding: 18, display: 'flex', flexDirection: 'column',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.04)',
  position: 'relative',
};

// Current Term card — a white card with black type, wearing the SAME border as
// every other card on this page (whiteCard above): 1px slate, same radius, same
// shadow. It was a solid red slab, then briefly a red outline; the dashboard is
// monochrome now and the card carries its own emphasis through the 64px year.
// Edit / Update modes morph to formCard so the dense form reads cleanly.
const displayCard = {
  background: '#FFFFFF', color: SLATE_900, borderRadius: 12,
  padding: '12px 20px 28px', display: 'flex', flexDirection: 'column',
  border: '1px solid ' + SLATE_200,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.04)',
  position: 'relative',
};
const formCard = {
  background: '#FFFFFF', color: SLATE_700, borderRadius: 16,
  padding: 24, display: 'flex', flexDirection: 'column',
  border: '1px solid ' + SLATE_200,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
  position: 'relative',
};

const eyebrow = (color = SLATE_400) => ({
  // Mirror styles.label from AddRecordModal: 13px / 500 / slate-500.
  fontSize: 13, fontWeight: 500, color, letterSpacing: 0,
});
const chartTitleStyle = { margin: 0, fontSize: 14, fontWeight: 600, color: SLATE_900, letterSpacing: '-0.01em' };

// Soft dim overlay — slate tint + backdrop blur. Sits inside its panel
// to fade just that one out without affecting the rest of the screen.
const DimOverlay = ({ onClick }) => (
  <div onClick={onClick} className="dashDimIn" style={{
    cursor: onClick ? 'pointer' : 'default',
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
  const ringShadow  = active ? '0 0 0 4px ' + FOCUS_RING : 'none';

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
// The small "from calendar" tag under a date filled from the uploaded school
// calendar; it goes as soon as the date is changed by hand. (Under the field,
// not beside the label: there a long label would wrap and push its input down.)
const FromCalendarTag = () => (
  <span style={{
    alignSelf: 'flex-start', marginTop: 2, padding: '0 7px', borderRadius: 9999, background: SLATE_100, border: '1px solid ' + SLATE_200,
    color: SLATE_600, fontSize: 10.5, fontWeight: 600, lineHeight: '16px', whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', gap: 3,
  }}>
    <Check size={10} aria-hidden="true" /> from calendar
  </span>
);

const DateField = ({ label, value, onChange, disabled, surface = 'light', min, max, invalid, hint, fromCalendar }) => {
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
    ? (isEdit ? '0 0 0 4px ' + FOCUS_RING
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
          color: isRed ? '#D1D5DB' : ACCENT,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <AlertTriangle size={12} /> {hint}
        </span>
      )}
      {fromCalendar && <FromCalendarTag />}
    </label>
  );
};

/**
 * The School calendar group, shared by the three term forms (edit current,
 * start new, edit past). The VPAA can change these at any time.
 *
 *   buf / setBuf  the form buffer (BLANK_TERM_DATES keys)
 *   checks        fieldChecks(buf) — carries the order issue
 *   min / max     the school-year window for the pickers
 *   fromCalendar  the keys filled from the school calendar (tagged); onManual(key)
 *                 is called when one is changed by hand
 */
const TermCalendarFields = ({ buf, setBuf, checks, min, max, disabled, fromCalendar, onManual }) => {
  const set = (key) => (v) => { setBuf((b) => ({ ...b, [key]: v })); if (onManual) onManual(key); };
  const issue = checks.orderIssue;
  const orderHint = (key) => (issue && issue.key === key ? issue.message : undefined);
  const field = (key, label) => (
    <DateField surface="edit" label={label}
      value={buf[key]}
      min={buf.start_date || min}
      max={buf.end_date || max}
      invalid={!!orderHint(key)}
      hint={orderHint(key)}
      onChange={set(key)}
      fromCalendar={!!(fromCalendar && fromCalendar.has(key))}
      disabled={disabled} />
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ ...eyebrow(SLATE_500), textAlign: 'left' }}>School calendar</div>
      <div style={FIELD_GRID}>
        {field('classes_start', 'Start of classes')}
        {field('prelim_exam', 'Prelim exam')}
        {field('midterm_exam', 'Midterm exam')}
        {field('semifinal_exam', 'Semi-final exam')}
        {field('final_exam', 'Final exam')}
      </div>
    </div>
  );
};

// ── Read-only term summary (the expanded Current Term card, past terms) ──

// The 13px grey label with a small icon that every detail row on the card uses.
const DetailLabel = ({ children }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: SLATE_500, fontSize: 13, fontWeight: 500 }}>
    <Calendar size={12} /> {children}
  </div>
);

// "Week 3 of 17 · 82 days left" over a thin bar for start → end of semester.
const ProgressStrip = ({ term, today }) => {
  const p = termProgress(term, today);
  const text = progressText(p);
  if (!p) return null;
  const pct = Math.round(p.ratio * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: SLATE_600 }}>
        <strong style={{ color: SLATE_900, fontWeight: 600 }}>{text.strong}</strong>
        {text.rest && <> {p.phase === 'ended' ? '—' : '·'} {text.rest}</>}
      </div>
      <div role="progressbar" aria-label="Semester progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        style={{ marginTop: 6, height: 6, borderRadius: 9999, background: SLATE_200, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 9999, background: SLATE_900, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
};

// The five calendar dates as a vertical timeline. `past` greys everything and
// drops the chips and Add links: closed terms are read-only.
const CalendarTimeline = ({ term, today, past = false, onAdd }) => {
  const rows = calendarRows(term, today);
  return (
    <ol aria-label="School calendar" style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
      {rows.map((r, i) => {
        const isNext = !past && r.state === 'next';
        const muted = past || r.state === 'done' || r.state === 'unset';
        const dotColor = isNext ? SLATE_900 : (r.state === 'upcoming' && !past) ? SLATE_500 : SLATE_300;
        return (
          <li key={r.key} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0' }}>
            {i < rows.length - 1 && (
              <span aria-hidden="true" style={{ position: 'absolute', left: 3.5, top: 16, bottom: -6, width: 1, background: SLATE_200 }} />
            )}
            <span aria-hidden="true" style={{
              flexShrink: 0, width: 8, height: 8, marginTop: 6, borderRadius: '50%', background: dotColor,
              boxShadow: isNext ? '0 0 0 3px ' + SLATE_200 : 'none', position: 'relative',
            }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 10, rowGap: 0 }}>
              <span style={{ flex: '1 1 110px', fontSize: 13, fontWeight: isNext ? 700 : 500, color: muted ? SLATE_500 : SLATE_900 }}>
                {r.label}
                {isNext && (
                  <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 9999, background: SLATE_900, color: '#FFFFFF', fontSize: 10.5, fontWeight: 600, verticalAlign: 1 }}>
                    Next
                  </span>
                )}
              </span>
              {r.state === 'unset' ? (
                <span style={{ fontSize: 13, color: SLATE_400, fontStyle: 'italic' }}>
                  Not set
                  {!past && onAdd && (
                    <>
                      {' · '}
                      <button type="button" onClick={onAdd} aria-label={'Add ' + r.label}
                        style={{ padding: 0, border: 'none', background: 'transparent', font: 'inherit', fontStyle: 'normal', fontWeight: 600, color: SLATE_900, textDecoration: 'underline', cursor: 'pointer' }}>
                        Add
                      </button>
                    </>
                  )}
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10, fontSize: 13 }}>
                  <span style={{ fontWeight: isNext ? 700 : 500, color: muted ? SLATE_500 : SLATE_900, whiteSpace: 'nowrap' }}>{fmtDate(r.day)}</span>
                  {!past && (
                    <span title={r.hint} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: r.state === 'done' ? SLATE_400 : SLATE_600, whiteSpace: 'nowrap' }}>
                      {r.state === 'done' && <Check size={11} aria-hidden="true" />}
                      {r.hint}
                    </span>
                  )}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

// Amber note, only when the calendar has something to say.
const CalendarChecks = ({ term }) => {
  const lines = calendarChecks(term);
  if (lines.length === 0) return null;
  return (
    <div role="note" style={{
      marginTop: 12, padding: '8px 12px', borderRadius: 10,
      background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E',
      fontSize: 12.5, lineHeight: 1.45, display: 'flex', gap: 8,
    }}>
      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>{lines.map((l) => <div key={l}>{l}</div>)}</div>
    </div>
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
      {/* Absolutely placed so the SVG takes the room its grid row offers and never
          sets that row's height: the row follows the Current Term card beside it. */}
      <div style={{ flex: 1, minHeight: 160, position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            {/* Vertical gradient — RED at the top of the pill, fading to white at the
                base. Inverted from the original (which was light-topped and deepened
                downward), so the colour sits where the value is read.
                The bars are the one thing on this dashboard carrying a quantity, and
                the only thing still carrying colour. */}
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#B91C1C" />
              <stop offset="55%"  stopColor="#E5837F" />
              <stop offset="100%" stopColor="#FFFFFF" />
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

const useMediaQuery = (query) => {
  const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
};

const AcademicTerms = () => {
  const { periods, refreshPeriods, setCurrentPeriodId, apiReachable } = usePeriod();

  const [focus, setFocus] = React.useState(null);
  const isFocused = (token) => focus === token;
  const anyFocus = focus !== null;

  // Collapsed/expanded toggle for the Current Term card's details panel.
  const [isExpanded, setIsExpanded] = React.useState(false);
  // Opening/closing the details animates: the pane fades and slides out (termClosing),
  // then the other pane fades in. While the details are open, the other panels dim + blur.
  const [termClosing, setTermClosing] = React.useState(false);
  const termToggleTimer = React.useRef(null);
  const toggleTermDetails = React.useCallback((open) => {
    if (termToggleTimer.current) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setIsExpanded(open); return; }
    setTermClosing(true);
    termToggleTimer.current = setTimeout(() => {
      termToggleTimer.current = null;
      setTermClosing(false);
      setIsExpanded(open);
    }, 180);
  }, []);
  React.useEffect(() => () => { if (termToggleTimer.current) clearTimeout(termToggleTimer.current); }, []);
  // Past terms whose calendar is shown (the Show calendar toggle).
  const [pastCalendars, setPastCalendars] = React.useState(() => new Set());
  const togglePastCalendar = (id) => setPastCalendars((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  // Today in Manila; re-read each minute so the page rolls over at midnight.
  const [today, setToday] = React.useState(() => manilaToday());
  React.useEffect(() => {
    const t = setInterval(() => setToday(manilaToday()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Below this the two-column grid has no room: stack the cards.
  const isNarrow = useMediaQuery('(max-width: 900px)');


  const [editBuf,     setEditBuf]     = React.useState({ semester: '1', ...BLANK_TERM_DATES });
  const [updateBuf,   setUpdateBuf]   = React.useState({ mode: 'term', year_from: thisYear, year_to: thisYear + 1, semester: '1', ...BLANK_TERM_DATES });
  const [pastEditBuf, setPastEditBuf] = React.useState({ semester: '1', ...BLANK_TERM_DATES });
  const [saving, setSaving] = React.useState(false);
  const [error,  setError]  = React.useState(null);
  // Dates filled from the uploaded school calendar ("from calendar" tags), per form.
  const [editFromCal,   setEditFromCal]   = React.useState(() => new Set());
  const [updateFromCal, setUpdateFromCal] = React.useState(() => new Set());
  const dropTag = (setTags) => (key) => setTags((s) => {
    if (!s.has(key)) return s;
    const n = new Set(s);
    n.delete(key);
    return n;
  });
  // "Use these dates": fill the form (found dates only) and tag them.
  const applyCalendar = (setBuf, setTags) => (values) => {
    setBuf((b) => ({ ...b, ...values }));
    setTags(new Set(Object.keys(values)));
    setError(null);
  };

  // Date-range validity; lexicographic compare works on YYYY-MM-DD.
  const fieldChecks = (buf) => {
    const s = buf.start_date || '';
    const e = buf.end_date   || '';
    const endBadOrder = !!(s && e && e < s);
    // start ≤ classes ≤ prelim ≤ midterm ≤ semi-final ≤ final ≤ end (blanks skipped).
    const orderIssue  = calendarOrderIssue(buf);
    return { endBadOrder, orderIssue };
  };
  const datesValid = (buf) => {
    const c = fieldChecks(buf);
    return !c.endBadOrder && !c.orderIssue;
  };
  // The order message when it's the End of Semester that's out of place.
  const endOrderHint  = (c) => (c.orderIssue && c.orderIssue.key === 'end_date' ? c.orderIssue.message : undefined);
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

  // Every term that ISN'T the current one is a past term — regardless of what its
  // status column says.
  //
  // This used to filter on status === 'Closed', which meant a period that was
  // Active but NOT the newest Active one belonged to neither list: not the
  // current term, not a past term. It appeared nowhere on this page, so the one
  // person who could close it couldn't see it — while every other page in the app
  // happily let users edit it. Deriving the list from "not current" makes a
  // stranded term impossible to hide.
  const pastTerms = React.useMemo(() => (
    periods
      .filter((p) => !currentTerm || p.id !== currentTerm.id)
      .sort((a, b) => rank(b) - rank(a))
  ), [periods, currentTerm]);

  const mostRecentPastId = pastTerms[0] && pastTerms[0].id;

  // True while the current term hasn't ended yet (today ≤ end_date).
  const isWithinTerm = React.useMemo(() => {
    if (!currentTerm || !currentTerm.end_date) return false;
    const end   = String(currentTerm.end_date).slice(0, 10);
    return today <= end;
  }, [currentTerm, today]);

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
    setEditBuf({ semester: currentTerm.semester || '1', ...termDatesOf(currentTerm) });
    setEditFromCal(new Set());
    setError(null);
    setFocus('current-edit');
  };
  const saveEdit = async () => {
    if (!currentTerm) return;
    if (editBuf.start_date && editBuf.end_date && editBuf.end_date < editBuf.start_date) {
      setError('End date must be on or after start date.'); return;
    }
    if (editChecks.orderIssue) { setError(editChecks.orderIssue.message); return; }
    setSaving(true); setError(null);
    try {
      // Edit only adjusts the current sem's dates (incl. the school calendar) —
      // semester/year are left as-is so the period's identity (and label) stay stable.
      await PeriodsAPI.update(currentTerm.id, termDatesPayload(editBuf));
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
    setUpdateBuf({ mode, year_from: yFrom, year_to: yTo, semester, ...BLANK_TERM_DATES });
    setUpdateFromCal(new Set());
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
    const { year_from, year_to, semester, start_date, end_date } = updateBuf;
    if (!year_from || !year_to || year_to <= year_from) { setError('End year must be after start year.'); return; }
    if (!start_date)                                    { setError('Pick a Start of Semester date.'); return; }
    if (!end_date)                                      { setError('Pick an End of Semester date.'); return; }
    if (start_date && end_date && end_date < start_date) { setError('End date must be on or after start date.'); return; }
    if (!semester)                                      { setError('Pick a Semester.'); return; }
    if (updateChecks.orderIssue)                        { setError(updateChecks.orderIssue.message); return; }
    setSaving(true); setError(null);
    try {
      const school_year = year_from + '-' + year_to;
      const label = formatPeriodLabel({ school_year, semester });
      const created = await PeriodsAPI.create({
        label, school_year, semester, sort_order: 50,
        ...termDatesPayload(updateBuf),
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
    setPastEditBuf({ semester: p.semester || '1', ...termDatesOf(p) });
    setError(null);
    setFocus('past-edit-' + p.id);
  };
  const savePastEdit = async (p) => {
    if (pastChecks.orderIssue) { setError(pastChecks.orderIssue.message); return; }
    setSaving(true); setError(null);
    try {
      const newSem   = pastEditBuf.semester || p.semester;
      const newLabel = formatPeriodLabel({ school_year: p.school_year, semester: newSem });
      await PeriodsAPI.update(p.id, {
        semester:         newSem,
        label:            newLabel,
        ...termDatesPayload(pastEditBuf),
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
  // The open Current Term details also dim + blur the other panels (click one to close).
  const detailsOpen = isExpanded && !termClosing && !anyFocus;
  const dimPast    = (anyFocus && !(focus && focus.startsWith('past-'))) || detailsOpen;
  const dimCharts  = anyFocus || detailsOpen;

  // ─────────────────────────── render ───────────────────────────
  return (
    // The page scrolls here: SkeletonA's content slot clips its overflow, so a
    // card taller than the slot would otherwise be cut off with no way to reach it.
    <div style={{ padding: 20, boxSizing: 'border-box', background: '#FFFFFF', height: '100%', overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <div style={{ marginTop: 4, fontSize: 13, color: SLATE_600 }}>
            Manage the current academic term and review past terms. Terms auto-close when their end date passes.
          </div>
        </div>
      </div>

      {!apiReachable && (
        <div style={{ marginBottom: 12, padding: '12px 16px', background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: 8, color: ACCENT, fontSize: 13 }}>
          <strong>Cannot reach the API.</strong> Restart <code>npm run dev</code> in the <code>server</code> folder.
        </div>
      )}

      <div style={{
        // Grows past the viewport instead of squeezing the cards; the page scrolls.
        flex: '1 0 auto',
        display: 'grid',
        gridTemplateColumns: isNarrow ? 'minmax(0, 1fr)' : 'minmax(280px, 1fr) minmax(0, 1.7fr)',
        // Row ratio adapts to which panel is the focus, so the active
        // panel always has room and the inactive one stays visible.
        //   current-edit  → Current grows, Past shrinks but visible
        //   past-view     → Past grows, Current shrinks but visible
        //   everything else → equal split
        // (current-update + past-edit both span both rows on their own
        //  panel via gridRow:'1/span 2' and hide the sibling — handled
        //  per-panel, so this row-template stays neutral for them.)
        // The first row never goes below its content, so the Current Term card
        // always shows its buttons. The second has a fixed floor rather than a
        // content one: Past Terms scrolls its own list, however long it gets.
        gridTemplateRows: isNarrow ? 'none'
                        : (isFocused('current-edit') || isFocused('current-update')) ? 'minmax(max-content, auto) minmax(200px, 1fr)'
                        : (focus && focus.startsWith('past-view-')) ? 'minmax(max-content, 0.55fr) minmax(280px, 1.45fr)'
                        : 'minmax(max-content, 1fr) minmax(240px, 1fr)',
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
          // Hide the Current Term card while the user is editing a past
          // term — the Past Academic Terms card expands to fill both rows.
          ...(focus && focus.startsWith('past-edit-') ? { display: 'none' } : null),
        }}>
          {!currentTerm && !isFocused('current-update') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: SLATE_900 }}>No active term yet</div>
              <div style={{ fontSize: 13, color: SLATE_500 }}>Click <strong>Update Term</strong> to create the first one.</div>
              <button
                onClick={() => startUpdate('term')}
                style={{
                  background: ACCENT, color: '#FFFFFF', border: 'none', cursor: 'pointer',
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
                <div key="collapsed" className={'termCardPane' + (termClosing ? ' termCardPaneOut' : '')} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div style={{ ...eyebrow(SLATE_500), textAlign: 'left' }}>
                    Current Term
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', gap: 10,
                  }}>
                    <div style={{
                      fontSize: 64, fontWeight: 800, color: SLATE_900,
                      letterSpacing: '-0.02em', lineHeight: 1,
                    }}>
                      {currentTerm.school_year}
                    </div>
                    <div style={{
                      fontSize: 22, fontWeight: 500, color: SLATE_700,
                      lineHeight: 1.2,
                    }}>
                      {formatSemester(currentTerm.semester)}
                    </div>
                    {termDatesPending(currentTerm) && (
                      <button type="button" onClick={startEdit}
                        title="This term opened when the last semester ended. Set its Start and End of Semester."
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, border: '1px solid #FCD34D', background: '#FFFBEB', color: '#92400E', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                        <AlertTriangle size={13} /> Dates not set yet · Set dates
                      </button>
                    )}
                    {(() => {
                      const next = nextCalendarDate(currentTerm, today);
                      if (!next) return null;
                      return (
                        <div style={{ fontSize: 13, color: SLATE_500, lineHeight: 1.4 }}>
                          Next: <strong style={{ color: SLATE_700, fontWeight: 600 }}>{next.label}</strong>
                          {' · '}{fmtDate(next.day)} <span title={next.hint}>({next.hint})</span>
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTermDetails(true)}
                    title="Show details"
                    aria-label="Expand term details"
                    style={{
                      alignSelf: 'center', marginTop: 12,
                      background: 'transparent', border: 'none',
                      color: SLATE_900, cursor: 'pointer',
                      padding: 2, borderRadius: 9999,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'dashArrowBob 1.6s ease-in-out infinite',
                      transition: 'transform 0.2s ease, background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <ChevronDown size={22} color={SLATE_900} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* ── EXPANDED state ── Up arrow + details + action buttons */}
              {isExpanded && (
                <div key="expanded" className={'termCardPane termCardPaneExpand' + (termClosing ? ' termCardPaneOut' : '')} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  {/* Up arrow at the top — collapses back to year/semester view */}
                  <button
                    type="button"
                    onClick={() => toggleTermDetails(false)}
                    title="Hide details"
                    aria-label="Collapse term details"
                    style={{
                      alignSelf: 'center', marginBottom: 12,
                      background: 'transparent', border: 'none',
                      color: SLATE_900, cursor: 'pointer',
                      padding: 2, borderRadius: 9999,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.2s ease, background 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <ChevronUp size={22} color={SLATE_900} strokeWidth={2.5} />
                  </button>

                  {/* Subtle divider — clear breathing room under the up-arrow */}
                  <div style={{ borderTop: '1px solid ' + SLATE_200, margin: '0 0 12px' }} />

                  {/* Details scroll inside the card when they outgrow it, so the
                      action row below always stays in view. */}
                  <div style={{ maxHeight: isNarrow ? 'none' : 'min(56vh, 460px)', overflowY: 'auto', minHeight: 0, paddingRight: 2 }}>
                    <ProgressStrip term={currentTerm} today={today} />

                    {/* Semester Duration */}
                    <div style={{ marginBottom: 10 }}>
                      <DetailLabel>Semester Duration</DetailLabel>
                      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: SLATE_900 }}>
                        {termDatesPending(currentTerm)
                          ? <span style={{ color: '#92400E' }}>Not set yet. This term opened when the last semester ended.</span>
                          : <>{fmtDate(currentTerm.start_date)} &nbsp;—&nbsp; {fmtDate(currentTerm.end_date)}</>}
                        {termWeeks(currentTerm) != null && (
                          <span style={{ color: SLATE_500, fontWeight: 400 }}> · {termWeeks(currentTerm)} weeks</span>
                        )}
                      </div>
                    </div>

                    {/* School calendar */}
                    <div style={{ marginBottom: 4 }}>
                      <DetailLabel>School Calendar</DetailLabel>
                      <CalendarTimeline term={currentTerm} today={today} onAdd={startEdit} />
                      <SchoolCalendarLink schoolYear={currentTerm.school_year} />
                    </div>

                    <CalendarChecks term={currentTerm} />
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
                    display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
                    gap: 10, marginTop: 10, paddingTop: 10,
                    borderTop: '1px solid ' + SLATE_100,
                  }}>
                    {termDatesPending(currentTerm) ? <span /> : (
                    <button
                      onClick={startEdit}
                      style={{
                        background: 'transparent', color: SLATE_900,
                        border: '1px solid ' + SLATE_300,
                        cursor: 'pointer', padding: '0 14px', height: 34, borderRadius: 10,
                        fontSize: 13, fontWeight: 500,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        transition: 'background 0.15s ease, border-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.06)'; e.currentTarget.style.borderColor = SLATE_500; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = SLATE_300; }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    )}
                    {termDatesPending(currentTerm) ? (
                    <button
                      onClick={startEdit}
                      style={{
                        background: ACCENT, color: '#FFFFFF', border: 'none', cursor: 'pointer',
                        padding: '0 16px', height: 34, borderRadius: 10,
                        fontSize: 13, fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      }}
                    >
                      <Calendar size={13} /> Set dates
                    </button>
                    ) : (
                    <button
                      onClick={() => startUpdate(nextAction)}
                      style={{
                        background: ACCENT, color: '#FFFFFF', border: 'none', cursor: 'pointer',
                        padding: '0 16px', height: 34, borderRadius: 10,
                        fontSize: 13, fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        transition: 'background 0.15s ease, color 0.15s ease',
                      }}
                      // Inverts on hover: light background, BLACK text. The handlers
                      // used to only touch the background — a leftover from when this
                      // was a white pill on a red card — so hovering a black button
                      // with white text turned it white-on-white and the label vanished.
                      // Whatever the background does, the text has to follow it.
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = SLATE_900; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT; e.currentTarget.style.color = '#FFFFFF'; }}
                    >
                      <RefreshCw size={13} /> {nextAction === 'sem' ? 'Update Sem' : 'Update Term'}
                    </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {currentTerm && isFocused('current-edit') && (
            <div className="termCardPane" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <div style={{ ...eyebrow(SLATE_500), textAlign: 'left' }}>{termDatesPending(currentTerm) ? 'Set Dates' : 'Edit Current Sem'}</div>
                  <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, color: SLATE_900, letterSpacing: '-0.01em' }}>
                    {currentTerm.school_year} · {formatSemester(currentTerm.semester)}
                  </div>
                </div>

                <SchoolCalendarFill
                  schoolYear={currentTerm.school_year}
                  semester={currentTerm.semester}
                  purpose="edit"
                  disabled={saving}
                  onApply={applyCalendar(setEditBuf, setEditFromCal)} />

                <div style={FIELD_GRID}>
                  <DateField surface="edit" label="Start of Semester"
                    value={editBuf.start_date}
                    min={editYearBounds.min}
                    max={editBuf.end_date || editYearBounds.max}
                    fromCalendar={editFromCal.has('start_date')}
                    onChange={(v) => { setEditBuf((b) => ({ ...b, start_date: v })); dropTag(setEditFromCal)('start_date'); }}
                    disabled={saving} />
                  <DateField surface="edit" label="End of Semester"
                    value={editBuf.end_date}
                    min={editBuf.start_date || editYearBounds.min}
                    max={editYearBounds.max}
                    invalid={editChecks.endBadOrder || endOrderHint(editChecks) != null}
                    hint={editChecks.endBadOrder ? 'End date must be on or after start date' : endOrderHint(editChecks)}
                    fromCalendar={editFromCal.has('end_date')}
                    onChange={(v) => { setEditBuf((b) => ({ ...b, end_date: v })); dropTag(setEditFromCal)('end_date'); }}
                    disabled={saving} />
                </div>

                <TermCalendarFields buf={editBuf} setBuf={setEditBuf} checks={editChecks}
                  min={editYearBounds.min} max={editYearBounds.max} disabled={saving}
                  fromCalendar={editFromCal} onManual={dropTag(setEditFromCal)} />

                {error && (
                  <div style={{ fontSize: 12, color: ACCENT, background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '10px 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
                    background: (saving || !editValid) ? '#9CA3AF' : ACCENT,
                    color: '#FFFFFF', border: 'none', cursor: (saving || !editValid) ? 'not-allowed' : 'pointer',
                    padding: '0 24px', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    boxShadow: (saving || !editValid) ? 'none' : '0 4px 12px rgba(15,23,42,0.18)',
                    transition: 'background 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!saving && editValid) e.currentTarget.style.background = ACCENT_HOVER; }}
                  onMouseLeave={(e) => { if (!saving && editValid) e.currentTarget.style.background = ACCENT; }}
                >
                  <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {isFocused('current-update') && (() => {
            const isSemMode = updateBuf.mode === 'sem';
            const headerEyebrow = isSemMode ? 'Update Sem' : 'Start a New Term';
            const headerTitle   = isSemMode
              ? ('Next semester · ' + updateBuf.year_from + '-' + updateBuf.year_to)
              : 'Term details';
            const primaryLabel  = isSemMode ? 'Save Sem' : 'Save New Term';
            return (
              <div className="termCardPane" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                        onChange={(v) => { setUpdateBuf((b) => ({ ...b, year_from: Number(v), year_to: Number(v) + 1, ...BLANK_TERM_DATES })); setUpdateFromCal(new Set()); }}
                        disabled={saving}
                      >
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </SelectField>
                      <span style={{ marginBottom: 12, color: SLATE_400, fontSize: 13, fontWeight: 500 }}>to</span>
                      <SelectField
                        label="School Year"
                        hideLabel
                        value={updateBuf.year_to}
                        onChange={(v) => { setUpdateBuf((b) => ({ ...b, year_to: Number(v), ...BLANK_TERM_DATES })); setUpdateFromCal(new Set()); }}
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
                    onChange={(v) => {
                      if (v !== updateBuf.semester) setUpdateFromCal(new Set());
                      setUpdateBuf((b) => (
                        v === b.semester
                          ? b
                          : { ...b, semester: v, ...BLANK_TERM_DATES }
                      ));
                    }}
                    disabled={saving}
                  >
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </SelectField>

                  {/* 2. Fill the dates from the uploaded school calendar (reviewed first) */}
                  <SchoolCalendarFill
                    schoolYear={updateBuf.year_from + '-' + updateBuf.year_to}
                    semester={updateBuf.semester}
                    purpose="create"
                    disabled={saving}
                    onApply={applyCalendar(setUpdateBuf, setUpdateFromCal)} />

                  {/* 3. Start + End — strictly bounded by the school year window */}
                  <div style={FIELD_GRID}>
                    <DateField surface="edit" label="Start of Semester"
                      value={updateBuf.start_date}
                      min={yearBounds.min}
                      max={updateBuf.end_date || yearBounds.max}
                      fromCalendar={updateFromCal.has('start_date')}
                      onChange={(v) => { setUpdateBuf((b) => ({ ...b, start_date: v })); dropTag(setUpdateFromCal)('start_date'); }}
                      disabled={saving} />
                    <DateField surface="edit" label="End of Semester"
                      value={updateBuf.end_date}
                      min={updateBuf.start_date || yearBounds.min}
                      max={yearBounds.max}
                      invalid={updateChecks.endBadOrder || endOrderHint(updateChecks) != null}
                      hint={updateChecks.endBadOrder ? 'End date must be on or after start date' : endOrderHint(updateChecks)}
                      fromCalendar={updateFromCal.has('end_date')}
                      onChange={(v) => { setUpdateBuf((b) => ({ ...b, end_date: v })); dropTag(setUpdateFromCal)('end_date'); }}
                      disabled={saving} />
                  </div>

                  {/* 4. School calendar — bounded by the picked semester window */}
                  <TermCalendarFields buf={updateBuf} setBuf={setUpdateBuf} checks={updateChecks}
                    min={yearBounds.min} max={yearBounds.max} disabled={saving}
                    fromCalendar={updateFromCal} onManual={dropTag(setUpdateFromCal)} />

                  {error && (
                    <div style={{ fontSize: 12, color: ACCENT, background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '10px 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={12} /> {error}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18, marginTop: 16, paddingTop: 12, borderTop: '1px solid ' + SLATE_100 }}>
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
                      background: (saving || !updateValid) ? '#9CA3AF' : ACCENT,
                      color: '#FFFFFF', border: 'none', cursor: (saving || !updateValid) ? 'not-allowed' : 'pointer',
                      padding: '0 24px', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      boxShadow: (saving || !updateValid) ? 'none' : '0 4px 12px rgba(15,23,42,0.18)',
                      transition: 'background 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!saving && updateValid) e.currentTarget.style.background = ACCENT_HOVER; }}
                    onMouseLeave={(e) => { if (!saving && updateValid) e.currentTarget.style.background = ACCENT; }}
                  >
                    <Save size={14} /> {saving ? 'Saving…' : primaryLabel}
                  </button>
                </div>
              </div>
            );
          })()}

          {dimCurrent && <DimOverlay />}
        </div>

        {/* ───── Syllabus chart ───── */}
        <div style={whiteCard}>
          <MockChart title="Submitted Learning Plan" data={MOCK_LEARNING_PLAN} />
          {dimCharts && <DimOverlay onClick={detailsOpen ? () => toggleTermDetails(false) : undefined} />}
        </div>

        {/* ───── Past terms (white) ─────
            Expands to span both rows when the user is editing a past term
            so the inline edit form has room to breathe; switches its body
            into a dedicated full-card edit layout (buttons pinned bottom). */}
        <div style={{
          ...whiteCard,
          // Past Terms stays visible during current-edit (just smaller).
          // It only hides when the Update New Term form takes both rows.
          ...(focus && focus.startsWith('past-edit-') ? { gridRow: '1 / span 2' } : null),
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
                        : { ...b, semester: v, ...BLANK_TERM_DATES }
                    ))}
                    disabled={saving}
                  >
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </SelectField>

                  <div style={FIELD_GRID}>
                    <DateField surface="edit" label="Start of Semester"
                      value={pastEditBuf.start_date}
                      max={pastEditBuf.end_date || undefined}
                      onChange={(v) => setPastEditBuf((b) => ({ ...b, start_date: v }))}
                      disabled={saving} />
                    <DateField surface="edit" label="End of Semester"
                      value={pastEditBuf.end_date}
                      min={pastEditBuf.start_date || undefined}
                      invalid={pastChecks.endBadOrder || endOrderHint(pastChecks) != null}
                      hint={pastChecks.endBadOrder ? 'End date must be on or after start date' : endOrderHint(pastChecks)}
                      onChange={(v) => setPastEditBuf((b) => ({ ...b, end_date: v }))}
                      disabled={saving} />
                  </div>

                  <TermCalendarFields buf={pastEditBuf} setBuf={setPastEditBuf} checks={pastChecks}
                    disabled={saving} />

                  {error && (
                    <div style={{ fontSize: 12, color: ACCENT, background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '10px 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
                      background: (saving || !pastEditValid) ? '#9CA3AF' : ACCENT,
                      color: '#FFFFFF', border: 'none', cursor: (saving || !pastEditValid) ? 'not-allowed' : 'pointer',
                      padding: '0 24px', height: 44, borderRadius: 12, fontSize: 14, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      boxShadow: (saving || !pastEditValid) ? 'none' : '0 4px 12px rgba(15,23,42,0.18)',
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
              // THE MOST RECENT PAST TERM IS ALWAYS EDITABLE — the rest are locked.
              //
              // The term that just ended is the one the OVPAA most often needs to
              // correct (a wrong end date), and the backend is
              // built around exactly that: autoCloseSupersededTerms spares the term
              // immediately before the current one, and updatePeriod imposes no
              // status check, so a Closed period can still be patched.
              //
              // We previously also required `!isClosed`, but creating a new term
              // explicitly closes the one it supersedes (saveUpdate → PeriodsAPI.close),
              // so the most recent past term is essentially always Closed — and the
              // Edit button vanished the moment it landed in this list. Gating on
              // position alone matches the backend's intent: newest past term →
              // editable; every older term → locked and read-only.
              const isClosed  = p.status === 'Closed';
              const canEdit   = isMostRecent;
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
                        {isClosed && !isMostRecent && (
                          <span title="This term is closed — read-only."
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
                          {termWeeks(p) != null && <> · {termWeeks(p)} weeks</>}
                        </div>
                        <button type="button" onClick={() => togglePastCalendar(p.id)}
                          aria-expanded={pastCalendars.has(p.id)}
                          style={{
                            marginTop: 8, padding: 0, border: 'none', background: 'transparent',
                            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: SLATE_700,
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                          {pastCalendars.has(p.id) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {pastCalendars.has(p.id) ? 'Hide calendar' : 'Show calendar'}
                        </button>
                        {pastCalendars.has(p.id) && <CalendarTimeline term={p} today={today} past />}
                      </div>

                      {/* Footer actions — Edit only for the previous term, and only
                          while it is still open. A Closed term is read-only, and
                          offering Edit on one was the page contradicting itself. */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                        <Btn variant="outline" onClick={cancelFocus}><X size={12} /> Close</Btn>
                        {canEdit && (
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

          {dimPast && <DimOverlay onClick={detailsOpen ? () => toggleTermDetails(false) : undefined} />}
        </div>

        {/* ───── TOS chart ───── */}
        <div style={whiteCard}>
          <MockChart title="Table of Specification" data={MOCK_TOS} />
          {dimCharts && <DimOverlay onClick={detailsOpen ? () => toggleTermDetails(false) : undefined} />}
        </div>
      </div>

    </div>
  );
};

export default AcademicTerms;
