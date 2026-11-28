/**
 * PageArchive — per-page Archive modal opened by FloatingArchiveButton.
 *
 * Strictly scoped: each instance shows archived rows for ONE module only
 * (no tabs, no cross-module mixing), but spans every academic period so
 * users see the full history from a single place.
 *
 * Read-only: to restore a record, the user changes its status back on
 * its own page.
 */
import React from 'react';
import { X, Edit2 } from 'react-feather';
import { ArchiveAPI } from '../services/api.js';
import { statusPillStyle } from '../services/statusPolicy.js';
import { usePeriod } from '../services/period.jsx';
import { prettifyLabel, formatSemester } from '../services/periodLabel.js';

// Per-module list of statuses an archived row can be RESTORED to via the
// Edit Status dropdown. Selecting any of these moves the row out of the
// archive and back into the main table.
const RESTORE_OPTIONS = {
  academic_terms:     ['Active'],
  departments:        ['Active'],
  programs:           ['Active'],
  faculty:            ['Active', 'On Leave'],
  consultants:        ['Active'],
  course_offering_assignments: ['Active'],
};

// moduleType slug → { title, entity (for pill styling), columns to render }.
// `cols` is [rowKey, headerLabel] pairs; the row's value at rowKey is
// shown verbatim, or '—' when missing.
const MODULES = {
  academic_terms: {
    title:  'Academic Terms',
    entity: 'academicterm',
    cols:   [['label', 'Term'], ['school_year', 'School Year'], ['semester', 'Semester']],
    // Academic Terms ARE the period — no separate Period column.
    hidePeriodColumn: true,
  },
  departments: {
    title:  'Departments',
    entity: 'department',
    cols:   [['name', 'Name'], ['code', 'Code'], ['dean', 'Dean']],
  },
  faculty: {
    title:  'Faculty',
    entity: 'faculty',
    cols:   [['name', 'Name'], ['role', 'Role'], ['department', 'Department']],
  },
  programs: {
    title:  'Programs',
    entity: 'program',
    cols:   [['code', 'Code'], ['name', 'Name'], ['program_head', 'Faculty Name']],
  },
  consultants: {
    title:  'Industry Consultants',
    entity: 'consultant',
    cols:   [['name', 'Name'], ['assigned_course_code', 'Assigned Course']],
  },
  course_offering_assignments: {
    title:  'Course Assignments',
    entity: 'courseassign',
    cols:   [['course_code', 'Course ID'], ['course_name', 'Course Name'], ['faculty_name', 'Assigned Faculty']],
  },
};

const PageArchive = ({ moduleType, onClose, onEditStatus }) => {
  const cfg = MODULES[moduleType];
  const { currentPeriod } = usePeriod();
  const periodId = currentPeriod && currentPeriod.id;
  const [rows,    setRows]    = React.useState(null);
  const [error,   setError]   = React.useState(null);
  const [busyId,  setBusyId]  = React.useState(null);
  // { rowId, top, right } — viewport-relative; the menu renders as
  // position:fixed so no ancestor overflow can clip it.
  const [menu,    setMenu]    = React.useState(null);

  const restoreOptions = RESTORE_OPTIONS[moduleType] || [];
  const showActionColumn = !!onEditStatus && restoreOptions.length > 0;

  const load = React.useCallback(() => {
    if (!cfg) { setError('Unknown module: ' + moduleType); return; }
    setRows(null); setError(null);
    ArchiveAPI.list(moduleType, periodId)
      .then((d) => setRows(Array.isArray(d && d.rows) ? d.rows : []))
      .catch((e) => setError(e.message || 'Failed to load archive'));
  }, [moduleType, cfg, periodId]);

  React.useEffect(() => { load(); }, [load]);

  // Close the row-level status menu when clicking elsewhere, or on scroll.
  React.useEffect(() => {
    if (!menu) return;
    const onDoc = (e) => {
      if (!e.target.closest || !e.target.closest('[data-edit-status-menu]')) setMenu(null);
    };
    const onScrollOrResize = () => setMenu(null);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [menu]);

  const toggleMenu = (row, e) => {
    if (menu && menu.rowId === row.id) { setMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ rowId: row.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const pickStatus = async (row, newStatus) => {
    if (!onEditStatus || busyId) return;
    setMenu(null);
    setBusyId(row.id);
    try {
      await onEditStatus(row, newStatus);
      await load();
    } catch (e) {
      alert(e.message || 'Status update failed');
    } finally {
      setBusyId(null);
    }
  };

  const title = cfg ? cfg.title : moduleType;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70 }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(1200px, 95vw)', height: 'min(820px, 90vh)', background: '#FFFFFF', borderRadius: 12,
          zIndex: 71, display: 'flex', flexDirection: 'column', boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#18191A' }}>Archived {title}</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              {cfg && cfg.hidePeriodColumn
                ? 'All closed terms. To restore a term, use the Edit Status button on its row.'
                : 'Archived ' + title.toLowerCase() + ' for '
                    + (currentPeriod ? prettifyLabel(currentPeriod.label) : 'this period')
                    + '. Switch the dashboard term to see archives from other periods.'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={22} color="#18191A" />
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px', overflowY: 'auto' }}>
          {error && <div style={{ color: '#B91C1C', fontSize: 14 }}>{error}</div>}
          {!rows && !error && <div style={{ color: '#6B7280', fontSize: 14 }}>Loading…</div>}
          {rows && !error && rows.length === 0 && (
            <div style={{ color: '#6B7280', fontSize: 14 }}>No archived {title.toLowerCase()}.</div>
          )}
          {rows && !error && rows.length > 0 && cfg && (
            // Override the global flex-table layout from index.css with
            // explicit display:table / table-row / table-cell so headers
            // render cleanly and cells don't clip absolute children.
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, display: 'table', tableLayout: 'auto' }}>
              <thead style={{ display: 'table-header-group' }}>
                <tr style={{ display: 'table-row', background: '#F3F4F6' }}>
                  {cfg.cols.map(([k, label]) => (
                    <th key={k} style={archiveHeaderStyle}>{label}</th>
                  ))}
                  <th style={archiveHeaderStyle}>Status</th>
                  {!cfg.hidePeriodColumn && (
                    <th style={archiveHeaderStyle}>Period</th>
                  )}
                  {showActionColumn && (
                    <th style={{ ...archiveHeaderStyle, textAlign: 'right' }}>Edit Status</th>
                  )}
                </tr>
              </thead>
              <tbody style={{ display: 'table-row-group' }}>
                {rows.map((r) => (
                  <tr key={r.id} style={{ display: 'table-row' }}>
                    {cfg.cols.map(([k]) => {
                      // The Academic Terms archive renders the row's own
                      // `semester` column — format it with the ordinal label.
                      const val = k === 'semester' ? formatSemester(r[k])
                                : (r[k] != null && r[k] !== '' ? String(r[k]) : '—');
                      return (
                        <td key={k} style={archiveCellStyle}>{val}</td>
                      );
                    })}
                    <td style={archiveCellStyle}>
                      <span style={{ ...statusPillStyle(cfg.entity, r.status), padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                        {r.status}
                      </span>
                    </td>
                    {!cfg.hidePeriodColumn && (
                      <td style={{ ...archiveCellStyle, color: '#6B7280' }}>
                        {r.period && r.period.label ? prettifyLabel(r.period.label) : '—'}
                      </td>
                    )}
                    {showActionColumn && (
                      <td style={{ ...archiveCellStyle, textAlign: 'right' }} data-edit-status-menu>
                        <button
                          onClick={(e) => toggleMenu(r, e)}
                          disabled={busyId === r.id}
                          title="Edit Status"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 10px', borderRadius: 6,
                            background: '#FFFFFF', border: '1px solid #18191A', color: '#18191A',
                            cursor: busyId === r.id ? 'not-allowed' : 'pointer',
                            fontSize: 13, fontWeight: 500, opacity: busyId === r.id ? 0.7 : 1,
                          }}
                        >
                          <Edit2 size={13} />
                          {busyId === r.id ? 'Saving…' : 'Edit Status'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Fixed-position dropdown — escapes every overflow ancestor. */}
      {menu && (() => {
        const r = (rows || []).find((row) => row.id === menu.rowId);
        if (!r) return null;
        return (
          <div
            data-edit-status-menu
            style={{
              position: 'fixed', top: menu.top, right: menu.right,
              background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)', minWidth: 180, padding: 6, zIndex: 200,
            }}
          >
            <div style={{ padding: '4px 8px', fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
              Restore to
            </div>
            {restoreOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => pickStatus(r, opt)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderRadius: 4, fontSize: 14, color: '#18191A',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      })()}
    </>
  );
};

// Inline style helpers — kept outside the component body so the styles
// aren't reallocated on every render.
const archiveHeaderStyle = {
  display: 'table-cell',
  padding: '12px 16px',
  textAlign: 'left',
  color: '#374151',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0,
  borderBottom: '1px solid #E5E7EB',
  whiteSpace: 'nowrap',
  background: '#F3F4F6',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const archiveCellStyle = {
  display: 'table-cell',
  padding: '12px 16px',
  borderBottom: '1px solid #F3F4F6',
  color: '#18191A',
  verticalAlign: 'middle',
};

export default PageArchive;
