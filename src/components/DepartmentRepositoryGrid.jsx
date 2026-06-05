/**
 * DepartmentRepositoryGrid — landing view for OVPAA's approved-files
 * repositories (Learning Plan and TOS).
 *
 * Renders one card per department in the master list. Each card shows:
 *   - the department logo (bundled asset OR user-uploaded library entry
 *     OR an initials avatar as a clean stylised fallback)
 *   - the department code + name
 *   - a count badge for approved submissions in the active period
 *   - an "Insert Logo" affordance that opens a picker modal
 *
 * Clicking a card calls `onOpen(dept)` — the parent page transitions to
 * the drill-down data table view for that department.
 *
 * Visual language matches AcademicTerms.jsx: slate-50 canvas, white
 * cards with hairline borders, institutional red as the accent for
 * the count badge and hover ring.
 */
import React from 'react';
import { Image as ImageIcon, ArrowRight, FileText } from 'react-feather';
import { resolveDeptLogo, getAssignedLogoId } from '../services/deptLogos.js';

const ACCENT     = '#B91C1C';
const SLATE_900  = '#0F172A';
const SLATE_700  = '#334155';
const SLATE_500  = '#64748B';
const SLATE_400  = '#94A3B8';
const SLATE_300  = '#CBD5E1';
const SLATE_200  = '#E2E8F0';
const SLATE_100  = '#F1F5F9';
const SLATE_50   = '#F8FAFC';

// Stable hue per department code — keeps the initials avatar visually
// consistent across reloads (same code → same colour).
const hueFor = (code) => {
  const s = String(code || '?').toUpperCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
};

const initialsFor = (code, name) => {
  if (code) return String(code).toUpperCase().slice(0, 4);
  if (!name) return '?';
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).join('').slice(0, 3).toUpperCase();
};

const InitialsAvatar = ({ code, name }) => {
  const hue = hueFor(code || name);
  return (
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: 'linear-gradient(135deg, hsl(' + hue + ', 32%, 92%) 0%, hsl(' + hue + ', 28%, 84%) 100%)',
      border: '1px solid ' + SLATE_200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, fontWeight: 700, letterSpacing: '0.02em',
      color: 'hsl(' + hue + ', 38%, 28%)',
      userSelect: 'none',
    }}>
      {initialsFor(code, name)}
    </div>
  );
};

const DepartmentCard = ({ dept, count, onOpen, onInsertLogo, logoRefreshKey }) => {
  const [hover, setHover] = React.useState(false);
  // logoRefreshKey is bumped by the parent whenever the user closes the
  // logo modal — re-renders this card so a freshly-assigned logo shows
  // immediately without a page reload.
  const logoUrl = React.useMemo(
    () => resolveDeptLogo(dept.code),
    [dept.code, logoRefreshKey]
  );
  const hasLogo = !!logoUrl;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#FFFFFF',
        border: '1px solid ' + (hover ? ACCENT : SLATE_200),
        borderRadius: 14,
        padding: 18,
        boxShadow: hover
          ? '0 8px 22px rgba(185,28,28,0.10), 0 2px 4px rgba(15,23,42,0.04)'
          : '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.04)',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex', flexDirection: 'column', gap: 14,
        position: 'relative', cursor: 'pointer', minHeight: 184,
      }}
      onClick={() => onOpen(dept)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(dept); } }}
    >
      {/* Count badge — white pill with a red outline, dark-gray text.
          When count is 0 the stroke softens to slate so the empty
          state reads as neutral instead of an alert. */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        background: '#FFFFFF',
        color: SLATE_700,
        border: '1px solid ' + (count > 0 ? ACCENT : SLATE_200),
        borderRadius: 9999, padding: '4px 10px',
        fontSize: 12, fontWeight: 500, letterSpacing: 0,
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        <FileText size={11} color={count > 0 ? ACCENT : SLATE_400} />
        {count} {count === 1 ? 'file' : 'files'}
      </div>

      {/* Logo / initials avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {hasLogo ? (
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#FFFFFF', border: '1px solid ' + SLATE_200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <img src={logoUrl} alt={dept.code + ' logo'}
                 style={{ maxWidth: '88%', maxHeight: '88%', objectFit: 'contain' }} />
          </div>
        ) : (
          <InitialsAvatar code={dept.code} name={dept.name} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            color: SLATE_500, textTransform: 'uppercase', marginBottom: 4,
          }}>
            {dept.code || 'DEPARTMENT'}
          </div>
          <div style={{
            fontSize: 15, fontWeight: 500, color: SLATE_900,
            lineHeight: 1.25, letterSpacing: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }} title={dept.name}>
            {dept.name || 'Unnamed Department'}
          </div>
        </div>
      </div>

      {/* Footer row — Insert Logo (left), Open arrow (right) */}
      <div style={{
        marginTop: 'auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 12, borderTop: '1px solid ' + SLATE_100,
      }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onInsertLogo(dept); }}
          style={{
            background: 'transparent', border: '1px dashed ' + SLATE_300,
            color: SLATE_700, fontSize: 12, fontWeight: 500,
            padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; e.currentTarget.style.borderColor = SLATE_400; e.currentTarget.style.color = SLATE_900; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = SLATE_300; e.currentTarget.style.color = SLATE_700; }}
        >
          <ImageIcon size={12} />
          {hasLogo ? 'Change logo' : 'Insert logo'}
        </button>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: hover ? ACCENT : SLATE_500,
          transition: 'color 0.15s ease, transform 0.18s ease',
          transform: hover ? 'translateX(2px)' : 'translateX(0)',
        }}>
          Open
          <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
};

const DepartmentRepositoryGrid = ({
  departments,
  counts,
  onOpen,
  onInsertLogo,
  logoRefreshKey,
  emptyMessage,
}) => {
  if (!departments || departments.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40,
        background: '#FFFFFF', border: '1px dashed ' + SLATE_200, borderRadius: 12,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 16, background: SLATE_100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FileText size={32} color={SLATE_400} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: SLATE_900 }}>
          No departments to display
        </div>
        <div style={{ color: SLATE_500, fontSize: 13, textAlign: 'center', maxWidth: 380, lineHeight: 1.5 }}>
          {emptyMessage || 'Upload a Department List on the Department page to populate this repository.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 16,
      paddingBottom: 4,
    }}>
      {departments.map((d) => (
        <DepartmentCard
          key={d.id || d.code}
          dept={d}
          count={counts[d.code] || 0}
          onOpen={onOpen}
          onInsertLogo={onInsertLogo}
          logoRefreshKey={logoRefreshKey}
        />
      ))}
    </div>
  );
};

export default DepartmentRepositoryGrid;
