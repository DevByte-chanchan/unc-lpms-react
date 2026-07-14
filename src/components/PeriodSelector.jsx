/**
 * PeriodSelector — read-only term picker.
 *
 * Custom dropdown (not a native <select>) so each option can render a
 * react-feather Lock icon next to Closed terms. The OVPAA manages the
 * term list (Add / Close) on the Academic Term page; this selector is
 * purely for switching context everywhere else in the app.
 */
import React from 'react';
import { Calendar, AlertTriangle, Lock, ChevronDown } from 'react-feather';
import { usePeriod } from '../services/period.jsx';
import { prettifyLabel } from '../services/periodLabel.js';
import styles from '../styles/PeriodSelector.module.sass';

// Chronological rank used to sort within each group (newest first).
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

const PeriodSelector = ({ prominent = false }) => {
  const { periods, currentPeriod, activeTerm, isCurrentTermActive, setCurrentPeriodId } = usePeriod();
  const empty = !Array.isArray(periods) || periods.length === 0;

  // Locked = anything that is not THE current term (the newest Active one, per
  // services/period.jsx and the server's utils/latestPeriod.js). That covers both
  // explicitly Closed terms AND terms still flagged Active but superseded by a
  // newer one — the latter are already read-only everywhere else, so keying this
  // icon off `status` alone made them look editable when they aren't.
  const isLocked = (p) => !activeTerm || p.id !== activeTerm.id;

  // Sort: strictly chronological, newest → oldest. Status is NOT part of the
  // order — grouping Active above Closed interleaves the school years and
  // reads as random. Closed terms keep their place and are marked with a Lock.
  const sortedPeriods = React.useMemo(() => {
    if (!Array.isArray(periods)) return [];
    return [...periods].sort((a, b) => rank(b) - rank(a));
  }, [periods]);

  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  // Click outside dismisses the popup.
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (id) => {
    setCurrentPeriodId(id);
    setOpen(false);
  };

  const buttonLabel = empty
    ? 'No terms — ask OVPAA to add one'
    : (currentPeriod ? prettifyLabel(currentPeriod.label) : '— Select —');

  return (
    <div className={styles.wrapper} ref={wrapRef}>
      <span className={styles.label} style={prominent ? { fontWeight: 700, color: '#18191A' } : undefined}>
        <Calendar size={prominent ? 16 : 14} color="#374151" />
        Current Term:
      </span>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={styles.select}
          onClick={() => !empty && setOpen((v) => !v)}
          disabled={empty}
          style={prominent ? {
            // Prominent filter-bar scope control: emphasis comes from a bold
            // "Current Term:" label, a softly-tinted chip and the calendar
            // icon — NOT a red border (red reads as a validation error).
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 40, padding: '0 14px',
            border: '1px solid #D1D5DB', background: '#F8FAFC',
            borderRadius: 9999, fontSize: 14, fontWeight: 600, color: '#18191A',
            cursor: empty ? 'not-allowed' : 'pointer',
            backgroundImage: 'none',  // override the SASS background chevron
          } : {
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: '1px solid #D1D5DB', background: '#FFFFFF',
            fontSize: 13, color: '#18191A', cursor: empty ? 'not-allowed' : 'pointer',
            backgroundImage: 'none',  // override the SASS background chevron
            paddingRight: 10,
          }}
        >
          <span>{buttonLabel}</span>
          <ChevronDown size={prominent ? 16 : 14} color="#374151" />
        </button>

        {open && !empty && (
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0,
              minWidth: '100%', maxWidth: 320,
              maxHeight: 220, overflowY: 'auto',
              background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, zIndex: 80,
              whiteSpace: 'nowrap',
            }}
          >
            {sortedPeriods.map((p) => {
              const isSelected = currentPeriod && p.id === currentPeriod.id;
              const locked     = isLocked(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p.id)}
                  title={locked
                    ? (p.status === 'Closed'
                        ? 'Closed term — read-only.'
                        : 'Past term — only the current term can be edited.')
                    : 'Current term'}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    padding: '8px 10px', borderRadius: 6,
                    background: isSelected ? '#F3F4F6' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    fontSize: 13, color: locked ? '#6B7280' : '#18191A',
                  }}
                >
                  <span>{prettifyLabel(p.label)}</span>
                  {locked && <Lock size={14} color="#6B7280" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {currentPeriod && !isCurrentTermActive && (
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: 12, marginLeft: 4 }}
          title={currentPeriod.status === 'Closed'
            ? 'This term is closed (read-only).'
            : 'This is a past term — only the current term can be edited.'}
        >
          <Lock size={14} /> {currentPeriod.status === 'Closed' ? 'closed' : 'read-only'}
        </span>
      )}

      {empty && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#B45309', fontSize: 12, marginLeft: 4 }} title="No academic terms exist yet">
          <AlertTriangle size={14} /> setup needed
        </span>
      )}
    </div>
  );
};

export default PeriodSelector;
