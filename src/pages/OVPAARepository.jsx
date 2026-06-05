/**
 * OVPAARepository — shared content shell for the OVPAA's approved-files
 * pages (Learning Plan Management and TOS Management).
 *
 * Data sources (per the LPMS data dictionary):
 *   §11.1 Approved-Learning-Plan-Repository → OVPAALearningPlan
 *   §12.1 Approved-TOS-Repository           → OVPAATOS
 *
 * Each row carried by `dataset` mirrors the canonical fields from
 * those sections (co_assign_id, pc_offering_id, stakeholder_id,
 * date_submitted, the full ph/ic/ld/d returned & accepted audit trail,
 * period_type) plus a small denormalised display layer for the table:
 *   instructor_name, course_id, course_name, department_code, program,
 *   file_name, file_url, submission_date, approved_date.
 * See data/mockApprovedSubmissions.js for the exact mapping.
 *
 * Why one shell: the two modules have identical mechanics — list every
 * department as a card, drill down into a sortable/filterable table,
 * view-or-export each row. Only the data source and the document
 * "kind" string differ. The wrapper page (OVPAALearningPlan.jsx /
 * OVPAATOS.jsx) supplies those as props so the shell can stay generic.
 *
 * Architecture:
 *   - Departments come from the master DepartmentsAPI, scoped by the
 *     PeriodSelector's current term.
 *   - Approved submissions are passed in (currently mock data; later
 *     the instructor → approval pipeline writes into §11.1 / §12.1
 *     and the read endpoint replaces the mock here).
 *   - Card counts = #rows whose department_code matches AND whose
 *     period_label matches the active term.
 *   - Drill-down is in-page (no URL change) so the back transition
 *     stays smooth; a 220ms cross-fade swaps between Grid and Table.
 *
 * Visual language mirrors AcademicTerms.jsx: slate-50 canvas, white
 * cards, institutional red reserved as the accent for primary actions
 * and the count badge.
 */
import React from 'react';
import { ChevronLeft, FileText, Inbox } from 'react-feather';
import PeriodSelector from '../components/PeriodSelector.jsx';
import DepartmentRepositoryGrid from '../components/DepartmentRepositoryGrid.jsx';
import ApprovedFileTable from '../components/ApprovedFileTable.jsx';
import PDFViewerModal from '../components/PDFViewerModal.jsx';
import LogoUploadModal from '../components/LogoUploadModal.jsx';
import { resolveDeptLogo } from '../services/deptLogos.js';
import { DepartmentsAPI } from '../services/api.js';
import { usePeriod } from '../services/period.jsx';
import { prettifyLabel } from '../services/periodLabel.js';
import { partitionByArchive } from '../services/statusPolicy.js';
import { countByDepartment, rowsForDepartment, PROGRAMS_BY_DEPT } from '../data/mockApprovedSubmissions.js';

const ACCENT     = '#B91C1C';
const SLATE_900  = '#0F172A';
const SLATE_700  = '#334155';
const SLATE_600  = '#475569';
const SLATE_500  = '#64748B';
const SLATE_400  = '#94A3B8';
const SLATE_200  = '#E2E8F0';
const SLATE_100  = '#F1F5F9';
const SLATE_50   = '#F8FAFC';

/**
 * Export a single approved file. Spec: per-row export only (no bulk).
 *
 * Real-world: hits a backend endpoint that streams the file as an
 * attachment. Mock: synthesises a tiny placeholder text file so the
 * browser download flow can be demoed end-to-end.
 */
const exportSingleFile = (row, kind) => {
  if (row.file_url && /^https?:\/\//i.test(row.file_url)) {
    // Real URL path — let the browser pick up the Content-Disposition.
    const a = document.createElement('a');
    a.href = row.file_url;
    a.download = row.file_name || (kind + '.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }
  // Mock path — placeholder text blob carrying the metadata so the
  // download still produces a tangible file.
  const lines = [
    'UNC LPMS — ' + (kind || 'Document') + ' Export (mock)',
    '----------------------------------------',
    'Faculty:         ' + (row.instructor_name || ''),
    'Course:          ' + (row.course_id || '') + ' — ' + (row.course_name || ''),
    'Submission date: ' + (row.submission_date || ''),
    'Academic period: ' + (row.period_label || ''),
    'Department code: ' + (row.department_code || ''),
    'File name:       ' + (row.file_name || ''),
    '',
    'This placeholder will be replaced by the actual approved PDF once',
    'the instructor → approval submission pipeline is wired up.',
  ].join('\n');
  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (row.file_name || (kind || 'document') + '.txt').replace(/\.pdf$/i, '.txt');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const OVPAARepository = ({ kind, dataset }) => {
  const { currentPeriod } = usePeriod();
  const periodId = currentPeriod && currentPeriod.id;
  const periodLabel = currentPeriod ? prettifyLabel(currentPeriod.label) : null;

  // ── Master Department list (scoped to active period) ───────────────
  const [departments, setDepartments] = React.useState([]);
  const [loading, setLoading]         = React.useState(false);

  const refreshDepts = React.useCallback(() => {
    if (!periodId) { setDepartments([]); return; }
    setLoading(true);
    DepartmentsAPI.list(periodId)
      .then((rows) => {
        const safe = Array.isArray(rows) ? rows : [];
        // Apply the same archive partition the Department List page uses,
        // so unlisted / archived departments stay out of OVPAA's view.
        setDepartments(partitionByArchive(safe, 'department').main);
      })
      .catch(() => setDepartments([]))
      .finally(() => setLoading(false));
  }, [periodId]);

  React.useEffect(() => { refreshDepts(); }, [refreshDepts]);

  // ── Approved-files counts per department ───────────────────────────
  // DEMO BEHAVIOUR: the mock dataset is treated as belonging to the
  // currently-active period — period_label is rewritten on the fly so
  // counts always reflect the term shown in the PeriodSelector. Once
  // the real submission pipeline is wired up, drop this synthesis and
  // pass `periodLabel` back into countByDepartment.
  const periodRows = React.useMemo(
    () => dataset.map((r) => (
      periodLabel ? { ...r, period_label: periodLabel } : r
    )),
    [dataset, periodLabel]
  );

  const counts = React.useMemo(
    () => countByDepartment(periodRows),
    [periodRows]
  );

  const totalApproved = React.useMemo(
    () => Object.values(counts).reduce((s, n) => s + n, 0),
    [counts]
  );

  // ── Drill-down state ───────────────────────────────────────────────
  const [selectedDept, setSelectedDept] = React.useState(null);
  // Animation token — bumps to retrigger the cross-fade on every view
  // change so the grid and table appear to slide into place.
  const [animKey, setAnimKey] = React.useState(0);

  const goToDept = (dept) => { setSelectedDept(dept); setAnimKey((k) => k + 1); };
  const backToGrid = ()    => { setSelectedDept(null); setAnimKey((k) => k + 1); };

  // ── Logo modal ─────────────────────────────────────────────────────
  const [logoDept, setLogoDept] = React.useState(null);
  const [logoBump, setLogoBump] = React.useState(0);  // refresh key for cards after a logo change

  // ── PDF viewer modal ───────────────────────────────────────────────
  const [viewingFile, setViewingFile] = React.useState(null);

  // Per-department rows for the active period only.
  // Uses the period-synthesised dataset so the table label column
  // stays consistent with the PeriodSelector (see comment above).
  const deptRows = React.useMemo(() => {
    if (!selectedDept) return [];
    return rowsForDepartment(periodRows, selectedDept.code);
  }, [periodRows, selectedDept]);

  return (
    <div style={{
      padding: 24, background: '#FFFFFF', height: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* ───────────────────── Page header ───────────────────── */}
      {/* Weights match AcademicTerms / HRStaff: h2 uses the browser
          default (no explicit fontWeight/fontSize override) and the
          subheader is plain 13px / 400. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          {selectedDept && (
            <button onClick={backToGrid}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: SLATE_500, fontSize: 12, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: 0, marginBottom: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = ACCENT; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = SLATE_500; }}
            >
              <ChevronLeft size={14} /> All Departments
            </button>
          )}
          <h2 style={{ margin: 0 }}>
            {selectedDept
              ? (kind + ' · ' + (selectedDept.code || selectedDept.name))
              : kind}
          </h2>
          <div style={{ marginTop: 4, fontSize: 13, color: SLATE_600 }}>
            {selectedDept
              ? ((selectedDept.name || '') + ' · Showing files approved for ' + (periodLabel || 'the active term') + '.')
              : ('Approved ' + kind.toLowerCase() + ' submissions, organised by department. Click a card to drill into its file list.')}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {!selectedDept && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: SLATE_500, fontWeight: 500,
              background: '#FFFFFF', border: '1px solid ' + SLATE_200,
              borderRadius: 9999, padding: '6px 12px',
            }}>
              <Inbox size={12} />
              <strong style={{ color: SLATE_900 }}>{totalApproved}</strong> approved file{totalApproved === 1 ? '' : 's'} this term
            </div>
          )}
        </div>
      </div>

      {/* Current-term selector on its own left-aligned row, matching the
          Program Head / Dean pages. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <PeriodSelector prominent />
      </div>

      {/* ───────────────────── Body — cross-fades between grid and table ───────────────────── */}
      <div
        key={animKey}
        style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          animation: 'ovpaaRepoFade 220ms ease',
        }}
      >
        {!selectedDept ? (
          <DepartmentRepositoryGrid
            departments={departments}
            counts={counts}
            onOpen={goToDept}
            onInsertLogo={(d) => setLogoDept(d)}
            logoRefreshKey={logoBump}
            emptyMessage={
              loading
                ? 'Loading departments…'
                : periodId
                  ? 'Upload a Department List for ' + (periodLabel || 'this term') + ' on the Department page to populate this repository.'
                  : 'Select an academic period to begin.'
            }
          />
        ) : (
          <ApprovedFileTable
            rows={deptRows}
            programs={PROGRAMS_BY_DEPT[selectedDept.code] || []}
            onView={(r)   => setViewingFile(r)}
            onExport={(r) => exportSingleFile(r, kind)}
          />
        )}
      </div>

      {/* ───────────────────── Modals ───────────────────── */}
      {logoDept && (
        <LogoUploadModal
          dept={logoDept}
          departments={departments}
          onClose={() => setLogoDept(null)}
          onSaved={() => setLogoBump((n) => n + 1)}
        />
      )}

      {viewingFile && (
        <PDFViewerModal
          file={viewingFile}
          kind={kind}
          onClose={() => setViewingFile(null)}
          onExport={(r) => exportSingleFile(r, kind)}
        />
      )}

      {/* Keyframes for the grid/table cross-fade */}
      <style>{
        '@keyframes ovpaaRepoFade {' +
        '  from { opacity: 0; transform: translateY(6px); }' +
        '  to   { opacity: 1; transform: translateY(0);   }' +
        '}'
      }</style>
    </div>
  );
};

export default OVPAARepository;
