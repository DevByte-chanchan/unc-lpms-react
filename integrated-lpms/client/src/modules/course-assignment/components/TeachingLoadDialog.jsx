/**
 * Teaching load — the Course Assignment page's "Load" dialog, plus the
 * warning shown under the Lead Faculty field in Add / Edit.
 *
 * `load` is GET /course-offering-assignments/load:
 *   { max_units, faculty: [{ name, names, units, over_by, sections, courses: [...] }], course_units }
 * Units are the Course Offerings credit units of the courses a person LEADS,
 * across every program this term. The limit (MAX_TEACHING_UNITS) only warns.
 */
import React from 'react';
import { X } from 'react-feather';
import DialogShell from './DialogShell.jsx';
import { displayName } from '../utils/nameCase.js';

const C = { text: '#18191A', muted: '#6B7280', border: '#E5E7EB', bar: '#334155', over: '#B91C1C', track: '#F1F5F9' };

const TeachingLoadDialog = ({ open, onClose, load, error, title }) => {
  const max = load ? load.max_units : 24;
  const people = load ? load.faculty || [] : [];
  const overCount = people.filter((p) => p.over_by > 0).length;
  return (
    <DialogShell
      open={open}
      onBackdropClick={onClose}
      ariaLabel="Teaching load"
      panelStyle={{ width: 760, maxWidth: '94vw', maxHeight: '86vh', background: '#FFFFFF', borderRadius: 10, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '18px 22px 12px', borderBottom: '1px solid ' + C.border }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>Teaching load</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            {title ? title + ' · ' : ''}Units of the courses each person leads this term, in every program. Limit {max} units.
            {overCount > 0 && <span style={{ color: C.over, fontWeight: 600 }}> {overCount} over the limit.</span>}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}><X size={22} color={C.text} /></button>
      </div>
      <div style={{ overflowY: 'auto', padding: '6px 22px 18px' }}>
        {error && <div role="alert" style={{ color: C.over, fontSize: 13, padding: '12px 0' }}>{error}</div>}
        {!error && !load && <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>Loading…</div>}
        {!error && load && people.length === 0 && <div style={{ color: C.muted, fontSize: 13, padding: '12px 0' }}>No Active or On Leave assignments with a Lead yet.</div>}
        {people.map((p) => {
          const over = p.over_by > 0;
          const pct = Math.min(100, Math.round((p.units / Math.max(1, max)) * 100));
          return (
            <div key={(p.faculty_id || '') + p.name} style={{ padding: '12px 0', borderBottom: '1px solid ' + C.border }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600, color: C.text }}>{displayName(p.name)}</div>
                <div style={{ fontSize: 13, color: over ? C.over : C.text, fontWeight: over ? 700 : 500, whiteSpace: 'nowrap' }}>
                  {p.units} / {max} units{p.sections ? ' · ' + p.sections + ' section' + (p.sections === 1 ? '' : 's') : ''}
                  {over && <span> · Over by {p.over_by} unit{p.over_by === 1 ? '' : 's'}</span>}
                </div>
              </div>
              <div role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={p.units} aria-label={displayName(p.name) + ' teaching units'}
                style={{ height: 8, background: C.track, borderRadius: 9999, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: over ? C.over : C.bar, borderRadius: 9999 }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {p.courses.map((c) => (
                  <span key={c.role + c.course_code + c.assignment_id} title={c.course_name || undefined}
                    style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: c.role === 'Lead' ? '#F3F4F6' : '#FFFFFF', border: '1px solid ' + (c.role === 'Lead' ? '#E5E7EB' : '#D1D5DB'), color: C.text }}>
                    {c.course_code} · {c.role}{c.role === 'Lead' ? ' · ' + (c.units == null ? '? units' : c.units + ' unit' + (c.units === 1 ? '' : 's')) : ''}
                  </span>
                ))}
              </div>
              {p.unknown_units > 0 && (
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{p.unknown_units} course{p.unknown_units === 1 ? '' : 's'} not in Course Offerings: not counted.</div>
              )}
            </div>
          );
        })}
      </div>
    </DialogShell>
  );
};

export default TeachingLoadDialog;
