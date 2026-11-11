/**
 * "Compare with official offerings" — the registrar's SUBJECT OFFERINGS export
 * (the official assignment, out at the end of enrollment) against this
 * program's pre-assignment.
 *
 *   1. Pick the .xls → dry run (nothing written).
 *   2. Rows grouped by case:
 *        Differs      suggested fix, Accept / Skip, a Lead picker where one is needed
 *        New          add it with the official faculty as Contributors (Lead optional)
 *        Not offered  Keep / Archive
 *        Confirmed    nothing to do — they get "Confirmed (official)" on Apply
 *   3. Apply → one undoable batch (the page's Undo button picks it up).
 *
 * The server re-reads the file on Apply and re-derives every suggestion; the
 * client only sends what the Program Head decided per course.
 */
import React from 'react';
import { Upload, AlertTriangle, CheckCircle } from 'react-feather';
import DialogShell from './DialogShell.jsx';
import { CourseOfferingAssignmentsAPI } from '../services/api.js';

const GROUPS = [
  { key: 'differs',     title: 'Differs',     hint: 'The official list has different people.' },
  { key: 'new',         title: 'New',         hint: 'In the official list, not pre-assigned.' },
  { key: 'not_offered', title: 'Not offered', hint: 'Pre-assigned, but not in the official list.' },
  { key: 'confirmed',   title: 'Confirmed',   hint: 'Matches the official list — marked Confirmed (official) on Apply.' },
];

const names = (list) => (list || []).map((p) => p.faculty_name).filter(Boolean).join(', ');
const defaultAction = (row) => {
  if (row.case === 'not_offered') return 'keep';
  if (row.no_official_faculty) return 'skip';
  if (row.case === 'differs' && row.needs_lead) return 'skip';   // opt in by picking a Lead
  return 'accept';
};

const seg = (on) => ({
  height: 30, padding: '0 12px', fontSize: 12.5, fontWeight: on ? 600 : 500, cursor: 'pointer',
  border: '1px solid ' + (on ? '#18191A' : '#D1D5DB'), background: on ? '#18191A' : '#FFFFFF', color: on ? '#FFFFFF' : '#374151',
});

function Choice({ value, options, onChange }) {
  return (
    <span style={{ display: 'flex' }}>
      {options.map((o, i) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          style={{ ...seg(value === o.value), flex: 1, borderRadius: i === 0 ? '6px 0 0 6px' : (i === options.length - 1 ? '0 6px 6px 0' : 0), marginLeft: i ? -1 : 0 }}>
          {o.label}
        </button>
      ))}
    </span>
  );
}

function suggestion(row) {
  if (row.case === 'new') return 'Add it with ' + (names(row.official) || 'no faculty') + ' as Contributors' + (row.official.length ? ' (Lead empty unless you pick one).' : '.');
  if (row.case === 'not_offered') return 'Keep it, or archive it.';
  if (row.case === 'confirmed') return null;
  if (row.no_official_faculty) return 'Offered, but the registrar hasn’t named its faculty yet — nothing to change. Compare again later.';
  const parts = [];
  if (row.add.length) parts.push('Add as Contributors: ' + names(row.add) + '.');
  const removedOthers = row.remove.filter((p) => !(row.lead_removed && row.current.lead && p.faculty_name === row.current.lead.faculty_name));
  if (removedOthers.length) parts.push('Remove: ' + names(removedOthers) + '.');
  if (row.lead_removed) parts.push('The Lead, ' + row.current.lead.faculty_name + ", isn't in the official list — pick a new Lead.");
  else if (!row.current.lead) parts.push('No Lead yet — pick one from the official faculty.');
  return parts.join(' ');
}

function CourseRow({ row, decision, onChange }) {
  const action = decision.action;
  const needsPick = row.case === 'differs' && row.needs_lead;
  const leadOptional = row.case === 'new' && row.official.length > 0;
  const missingLead = needsPick && action === 'accept' && !decision.lead_name;
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 16, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#18191A' }}>
            {row.course_code} <span style={{ fontWeight: 400, color: '#6B7280' }}>{row.course_name || ''}</span>
          </div>
          {row.case !== 'new' && (
            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
              <span style={{ color: '#6B7280' }}>Pre-assigned:</span> Lead {row.current.lead ? row.current.lead.faculty_name : '—'}
              {row.current.contributors.length > 0 && <> · Contributors {names(row.current.contributors)}</>}
            </div>
          )}
          {row.official.length > 0 && (
            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
              <span style={{ color: '#6B7280' }}>Official:</span>{' '}
              {row.official.map((p, i) => (
                <span key={p.registrar_name || i}>
                  {i > 0 && ', '}
                  <span title={p.matched ? '' : 'Not in this term’s faculty list'} style={{ color: p.matched ? undefined : '#B45309' }}>{p.faculty_name}</span>
                  {p.sections.length > 0 && <span style={{ color: '#9CA3AF' }}> ({p.sections.join(', ')})</span>}
                </span>
              ))}
            </div>
          )}
          {suggestion(row) && <div style={{ fontSize: 12, color: '#1D4ED8', marginTop: 4 }}>{suggestion(row)}</div>}
        </div>
        {row.case !== 'confirmed' && !row.no_official_faculty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            {row.case === 'not_offered'
              ? <Choice value={action} onChange={(v) => onChange({ ...decision, action: v })} options={[{ value: 'keep', label: 'Keep' }, { value: 'archive', label: 'Archive' }]} />
              : <Choice value={action} onChange={(v) => onChange({ ...decision, action: v })} options={[{ value: 'accept', label: 'Accept' }, { value: 'skip', label: 'Skip' }]} />}
            {(needsPick || leadOptional) && (
              <select value={decision.lead_name || ''} aria-label={'Lead for ' + row.course_code}
                onChange={(e) => onChange({ ...decision, lead_name: e.target.value || null, action: e.target.value ? 'accept' : action })}
                style={{ height: 30, fontSize: 12.5, borderRadius: 6, border: '1px solid ' + (missingLead ? '#DC2626' : '#D1D5DB'), padding: '0 6px', width: '100%' }}>
                <option value="">{needsPick ? 'Pick a Lead…' : 'No Lead yet'}</option>
                {row.official.map((p) => <option key={p.faculty_name} value={p.faculty_name}>{p.faculty_name}</option>)}
              </select>
            )}
            {missingLead && <span style={{ fontSize: 11, color: '#DC2626' }}>Pick a Lead to accept</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OfficialCompareModal({ open, onClose, periodId, programId, programCode, onCommitted }) {
  const [file, setFile] = React.useState(null);
  const [result, setResult] = React.useState(null);     // the dry run
  const [decisions, setDecisions] = React.useState({});  // course_code → { action, lead_name }
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [showConfirmed, setShowConfirmed] = React.useState(false);
  const [showUnmatched, setShowUnmatched] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) { setFile(null); setResult(null); setDecisions({}); setError(null); setBusy(false); setShowConfirmed(false); }
  }, [open]);

  const runPreview = async (f) => {
    if (!/\.(xlsx|xls|csv|pdf)$/i.test(f.name)) {
      setError('Use the Registrar\'s Subject Offerings as a PDF, Excel (.xls, .xlsx) or CSV file.');
      return;
    }
    setFile(f); setBusy(true); setError(null); setResult(null);
    try {
      const r = await CourseOfferingAssignmentsAPI.compareOfficial(f, periodId, programId);
      setResult(r);
      setDecisions(Object.fromEntries((r.rows || []).map((row) => [row.course_code, { action: defaultAction(row), lead_name: null }])));
    } catch (err) {
      setError((err && err.message) || 'Could not read the file.');
      setFile(null);
    } finally { setBusy(false); }
  };

  const rows = (result && result.rows) || [];
  const acceptAll = (list) => setDecisions((prev) => {
    const next = { ...prev };
    for (const r of list) {
      if (r.no_official_faculty || (r.case === 'differs' && r.needs_lead && !(prev[r.course_code] || {}).lead_name)) continue;
      next[r.course_code] = { ...(prev[r.course_code] || {}), action: 'accept' };
    }
    return next;
  });
  const byCase = (k) => rows.filter((r) => r.case === k);
  const blocked = rows.some((r) => r.case === 'differs' && r.needs_lead && decisions[r.course_code]
    && decisions[r.course_code].action === 'accept' && !decisions[r.course_code].lead_name);
  const tally = rows.reduce((t, r) => {
    const d = decisions[r.course_code] || {};
    if (r.case === 'confirmed') t.confirm += 1;
    else if (r.case === 'not_offered' && d.action === 'archive') t.archive += 1;
    else if (r.case === 'differs' && d.action === 'accept') t.update += 1;
    else if (r.case === 'new' && d.action === 'accept') t.add += 1;
    return t;
  }, { confirm: 0, update: 0, add: 0, archive: 0 });

  const apply = async () => {
    setBusy(true); setError(null);
    try {
      const list = rows.map((r) => ({ course_code: r.course_code, ...(decisions[r.course_code] || {}) }));
      const out = await CourseOfferingAssignmentsAPI.compareOfficial(file, periodId, programId, list);
      if (onCommitted) await onCommitted(out);
      onClose();
    } catch (err) {
      setError((err && err.message) || 'Apply failed.');
      setBusy(false);
    }
  };

  return (
    <DialogShell open={open} onBackdropClick={() => !busy && onClose()} ariaLabel="Compare with official offerings"
      panelStyle={{ width: 820, maxWidth: '94vw', maxHeight: '88vh', background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
      <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Compare with official offerings</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
          {result
            ? <>{result.filename} · {result.term || 'term not stated'} · {result.program}</>
            : <>The registrar&apos;s SUBJECT OFFERINGS export for {programCode || 'your program'}. Nothing is saved until you Apply.</>}
        </div>
      </div>

      <div style={{ padding: '12px 24px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
        {!result && (
          <div onClick={() => !busy && inputRef.current && inputRef.current.click()} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f && !busy) runPreview(f); }}
            style={{ border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: busy ? 'wait' : 'pointer' }}>
            <Upload size={36} color="#9CA3AF" />
            <div style={{ fontWeight: 600, color: '#18191A' }}>{busy ? 'Reading ' + (file ? file.name : 'file') + '…' : 'Drag & drop the Registrar\'s Subject Offerings file here'}</div>
            <div style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>PDF, .xls, .xlsx or .csv — the list with sections and faculty (e.g. CS_26271-Course-Offerings.pdf)</div>
            <input type="file" ref={inputRef} accept=".pdf,.csv,.xlsx,.xls" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) runPreview(f); }} />
          </div>
        )}

        {result && result.term_mismatch && (
          <div role="alert" style={{ display: 'flex', gap: 8, padding: '10px 12px', margin: '4px 0 8px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B', fontSize: 12.5 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{result.term_mismatch} Check you picked the right file before applying.</span>
          </div>
        )}

        {result && result.unmatched && result.unmatched.length > 0 && (
          <div role="note" style={{ display: 'flex', gap: 8, padding: '10px 12px', margin: '4px 0 8px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, color: '#92400E', fontSize: 12.5 }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>{result.unmatched.length} {result.unmatched.length === 1 ? 'teacher' : 'teachers'}</strong> in the official list {result.unmatched.length === 1 ? "isn't" : "aren't"} in this term&apos;s Faculty list, so {result.unmatched.length === 1 ? "they're" : "they're"} shown by their registrar name. Ask the Dean to add them to the Faculty list, then compare again.{' '}
              <button type="button" onClick={() => setShowUnmatched((v) => !v)} style={{ background: 'none', border: 'none', padding: 0, color: '#92400E', textDecoration: 'underline', fontSize: 12.5, cursor: 'pointer' }}>
                {showUnmatched ? 'Hide names' : 'Show names'}
              </button>
              {showUnmatched && <span style={{ display: 'block', marginTop: 4 }}>{result.unmatched.join(', ')}</span>}
            </span>
          </div>
        )}

        {result && rows.length === 0 && <div style={{ fontSize: 14, color: '#6B7280', padding: '20px 0' }}>No {result.program} courses in this file, and nothing pre-assigned.</div>}

        {result && GROUPS.map((g) => {
          const list = byCase(g.key);
          if (!list.length) return null;
          const collapsed = g.key === 'confirmed' && !showConfirmed;
          return (
            // A div, not a <section>: the syllabus .module.sass files carry an
            // unscoped `section { display: flex; height: 100% }` rule that would
            // lay these rows out side by side.
            <div key={g.key} style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, position: 'sticky', top: -12, background: '#FFFFFF', padding: '8px 0', borderBottom: '1px solid #E5E7EB', zIndex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#18191A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {g.title} <span style={{ color: '#6B7280', fontWeight: 600 }}>{list.length}</span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#6B7280', textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>{g.hint}</span>
                </div>
                {(g.key === 'differs' || g.key === 'new') && (
                  <button type="button" onClick={() => acceptAll(list)} style={{ background: 'none', border: 'none', color: '#1D4ED8', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Accept all that don&apos;t need a Lead
                  </button>
                )}
                {g.key === 'confirmed' && (
                  <button type="button" onClick={() => setShowConfirmed((v) => !v)} style={{ background: 'none', border: 'none', color: '#1D4ED8', fontSize: 12.5, cursor: 'pointer' }}>
                    {showConfirmed ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              {!collapsed && list.map((row) => (
                <CourseRow key={row.course_code} row={row} decision={decisions[row.course_code] || { action: defaultAction(row) }}
                  onChange={(d) => setDecisions((prev) => ({ ...prev, [row.course_code]: d }))} />
              ))}
            </div>
          );
        })}
        {error && <div role="alert" style={{ fontSize: 13, color: '#B91C1C', marginTop: 10 }}>{error}</div>}
      </div>

      <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {result && <><CheckCircle size={14} color="#15803D" /> Confirm {tally.confirm} · update {tally.update} · add {tally.add} · archive {tally.archive}</>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {result && <button type="button" disabled={busy} onClick={() => { setResult(null); setFile(null); }} style={{ height: 40, padding: '0 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, cursor: 'pointer' }}>Choose another file</button>}
          <button type="button" disabled={busy} onClick={onClose} style={{ height: 40, padding: '0 16px', background: '#FFFFFF', border: '1px solid #18191A', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          {result && (
            <button type="button" disabled={busy || blocked || rows.length === 0} onClick={apply}
              title={blocked ? 'Pick a Lead for every accepted course that needs one' : undefined}
              style={{ height: 40, padding: '0 18px', background: (busy || blocked) ? '#9CA3AF' : '#18191A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 600, cursor: (busy || blocked) ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Applying…' : 'Apply'}
            </button>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
