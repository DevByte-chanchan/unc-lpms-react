/**
 * The Edit pop-up's History tab on the Program Head's Course Assignment page.
 * (Plain helpers such as fmtDay and lastUpdatedText live in services/assignmentTracking.js.)
 */
import React from 'react';
import { CourseOfferingAssignmentsAPI } from '../services/api.js';
import { fmtDayTime } from '../services/assignmentTracking.js';
import { displayName } from '../utils/nameCase.js';

const SOURCE_LABEL = { manual: 'manual', upload: 'upload', undo: 'undo', official_match: 'official match' };
const nameOf = (p) => (p && displayName(p.faculty_name)) || null;
const personKey = (p) => String((p && p.faculty_name) || (p && p.faculty_id) || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function describeEntry(e) {
  const from = nameOf(e.lead_before);
  const to = nameOf(e.lead_after);
  switch (e.action) {
    case 'assigned':
      return to ? 'Assigned to ' + to : 'Course added (no Lead yet)';
    case 'lead_changed':
      if (from && to) return 'Lead changed from ' + from + ' to ' + to;
      if (to) return 'Lead set to ' + to;
      return 'Lead ' + (from || '') + ' removed';
    case 'contributors_changed':
      return 'Contributors changed';
    case 'course_changed':
      return e.note || 'Course changed';
    case 'removed':
      return 'Removed' + (from ? ' (Lead was ' + from + ')' : '');
    case 'restored':
      return 'Restored' + (to ? ' (Lead ' + to + ')' : '');
    case 'upload_undone':
      return 'Upload undone' + (from !== to ? (to ? ' — Lead back to ' + to : ' — course taken off') : '');
    case 'upload_replaced':
      return 'Replaced by an upload';
    case 'official_confirmed':
      return 'Confirmed by the official Subject Offerings';
    case 'official_updated':
      return 'Updated from the official Subject Offerings';
    default:
      return e.action;
  }
}

function contributorDelta(e) {
  const before = Array.isArray(e.contributors_before) ? e.contributors_before : [];
  const after = Array.isArray(e.contributors_after) ? e.contributors_after : [];
  const b = new Set(before.map(personKey));
  const a = new Set(after.map(personKey));
  return {
    added: after.filter((c) => !b.has(personKey(c))),
    removed: before.filter((c) => !a.has(personKey(c))),
  };
}

const deltaChip = (c, added) => (
  <span key={(added ? '+' : '-') + personKey(c)} style={{
    display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 9999, fontSize: 11.5,
    background: added ? '#DCFCE7' : '#FEE2E2', color: added ? '#166534' : '#991B1B',
    border: '1px solid ' + (added ? '#BBF7D0' : '#FECACA'), textDecoration: added ? 'none' : 'line-through',
  }}>
    {added ? '+ ' : '− '}{displayName(c.faculty_name)}
  </span>
);

export function HistoryTimeline({ assignmentId, periodId }) {
  const [state, setState] = React.useState({ loading: true, entries: [], error: null });
  React.useEffect(() => {
    let alive = true;
    CourseOfferingAssignmentsAPI.history(assignmentId, periodId)
      .then((r) => { if (alive) setState({ loading: false, entries: (r && r.entries) || [], error: null }); })
      .catch((err) => { if (alive) setState({ loading: false, entries: [], error: (err && err.message) || 'Could not load the history.' }); });
    return () => { alive = false; };
  }, [assignmentId, periodId]);

  if (state.loading) return <div style={{ fontSize: 13, color: '#6B7280' }}>Loading history…</div>;
  if (state.error) return <div role="alert" style={{ fontSize: 13, color: '#B91C1C' }}>{state.error}</div>;
  if (!state.entries.length) {
    return <div style={{ fontSize: 13, color: '#6B7280' }}>No changes recorded yet. Changes are recorded from now on — every new assignment, Lead change, upload and undo.</div>;
  }
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {state.entries.map((e, i) => {
        const { added, removed } = contributorDelta(e);
        const meta = [e.changed_by_name ? 'by ' + e.changed_by_name : null, SOURCE_LABEL[e.source] || e.source].filter(Boolean).join(', ');
        const showNote = e.note && e.action !== 'course_changed';
        return (
          <li key={e.id} style={{ position: 'relative', padding: '0 0 14px 18px' }}>
            <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 5, width: 8, height: 8, borderRadius: 9999, background: i === 0 ? '#18191A' : '#CBD5E1' }} />
            {i < state.entries.length - 1 && <span aria-hidden="true" style={{ position: 'absolute', left: 3.5, top: 15, bottom: 0, width: 1, background: '#E5E7EB' }} />}
            <div style={{ fontSize: 13, color: '#18191A', lineHeight: 1.45 }}>
              <span style={{ color: '#6B7280' }}>{fmtDayTime(e.created_at)} — </span>
              {describeEntry(e)}
              {meta && <span style={{ color: '#6B7280' }}> ({meta})</span>}
            </div>
            {showNote && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{e.note}</div>}
            {(added.length > 0 || removed.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                {added.map((c) => deltaChip(c, true))}
                {removed.map((c) => deltaChip(c, false))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
