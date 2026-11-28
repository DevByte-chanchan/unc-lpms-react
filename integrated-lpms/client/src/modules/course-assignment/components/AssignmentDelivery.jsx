/**
 * Was each Lead / Contributor told about the course? The server adds
 * `row.delivery = { lead, contributors: { [faculty_id]: status } }`
 * (server/services/assignmentDelivery.js).
 *
 *   <DeliveryIcon status={…} />           a small icon inside a name chip
 *   <DeliveryLine status={…} />           icon + "Email sent · Nov 12" under the Lead
 *   <DeliveryPanel row={…} onResend={…} /> the Edit pop-up's Notifications tab
 */
import React from 'react';
import { Check, CheckCircle, Clock, Bell, AlertCircle, MinusCircle, Send } from 'react-feather';

const LOOK = {
  sent:       { Icon: CheckCircle, color: '#15803D' },
  told:       { Icon: Check,       color: '#15803D' },
  bell:       { Icon: Bell,        color: '#1D4ED8' },
  queued:     { Icon: Clock,       color: '#B45309' },
  retrying:   { Icon: Clock,       color: '#B45309' },
  failed:     { Icon: AlertCircle, color: '#B91C1C' },
  not_sent:   { Icon: AlertCircle, color: '#B91C1C' },
  held:       { Icon: AlertCircle, color: '#B91C1C' },
  no_account: { Icon: AlertCircle, color: '#B91C1C' },
  inactive:   { Icon: MinusCircle, color: '#9CA3AF' },
};
const lookOf = (s) => LOOK[s && s.state] || LOOK.inactive;

const fmtWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const titleOf = (s) => (s ? [s.label + (s.at ? ' · ' + fmtWhen(s.at) : ''), s.detail].filter(Boolean).join('\n') : '');

export const DeliveryIcon = ({ status, size = 12 }) => {
  if (!status) return null;
  const { Icon, color } = lookOf(status);
  return (
    <span title={titleOf(status)} aria-label={status.label} style={{ display: 'inline-flex', flexShrink: 0, marginRight: 4 }}>
      <Icon size={size} color={color} strokeWidth={2.4} />
    </span>
  );
};

export const DeliveryLine = ({ status }) => {
  if (!status) return null;
  const { Icon, color } = lookOf(status);
  return (
    <span title={titleOf(status)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 11, fontWeight: 500, color, whiteSpace: 'nowrap', cursor: 'help' }}>
      <Icon size={11} strokeWidth={2.4} />
      {status.label}{status.at && (status.state === 'sent' || status.state === 'told') ? ' · ' + fmtWhen(status.at).split(',')[0] : ''}
    </span>
  );
};

/** Everyone on the course, with what they were told and a Send again button. */
export const DeliveryPanel = ({ row, onResend, readOnly }) => {
  const [busy, setBusy] = React.useState(null);
  const [msg, setMsg] = React.useState(null);
  const d = row.delivery || { lead: null, contributors: {} };
  const people = [
    ...(row.faculty_id ? [{ key: 'lead', faculty_id: row.faculty_id, name: row.faculty_name, role: 'Lead Faculty', status: d.lead }] : []),
    ...(Array.isArray(row.contributors) ? row.contributors : []).filter(Boolean).map((c) => ({
      key: 'c' + (c.faculty_id || c.faculty_name), faculty_id: c.faculty_id, name: c.faculty_name, role: 'Contributor',
      status: d.contributors ? d.contributors[c.faculty_id || c.faculty_name] : null,
    })),
  ];
  const resend = async (p) => {
    setBusy(p.key); setMsg(null);
    try { const r = await onResend(p.faculty_id); setMsg({ ok: true, text: (r && r.message) || 'Sent.' }); }
    catch (err) { setMsg({ ok: false, text: err.message || 'Could not send.' }); }
    finally { setBusy(null); }
  };
  if (!people.length) return <div style={{ color: '#6B7280', fontSize: 13 }}>No faculty matched to this course yet, so nobody has been notified.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.45 }}>
        Each person gets an in-app notification and one email about the course (an invitation if they haven&apos;t set a password yet).
      </div>
      {people.map((p) => {
        const s = p.status;
        const { Icon, color } = lookOf(s);
        return (
          <div key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8 }}>
            <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                {p.name} <span style={{ fontWeight: 400, color: '#6B7280' }}>· {p.role}</span>
              </div>
              <div style={{ fontSize: 12.5, color, marginTop: 2 }}>
                {s ? s.label : 'Unknown'}{s && s.at ? ' · ' + fmtWhen(s.at) : ''}
              </div>
              {s && s.detail && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{s.detail}</div>}
            </div>
            {!readOnly && s && s.canResend && p.faculty_id && (
              <button type="button" onClick={() => resend(p)} disabled={!!busy}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontFamily: 'inherit', fontSize: 12.5, cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                <Send size={13} /> {busy === p.key ? 'Sending…' : 'Send again'}
              </button>
            )}
          </div>
        );
      })}
      {msg && <div role="status" style={{ fontSize: 12.5, color: msg.ok ? '#166534' : '#B91C1C' }}>{msg.text}</div>}
    </div>
  );
};
