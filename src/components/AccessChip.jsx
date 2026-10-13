/**
 * AccessChip — the Access column on the Faculty and Industry Consultant lists:
 * where this person stands with their LPMS account, as a small chip in the
 * existing pill styles, plus the one action that fits:
 *
 *   Not invited yet  → Invite now
 *   Invited / Expired / Failed → Resend
 *   Sending… / Active / Held / No account → no action
 *
 * `access` is the server's { status, label, reason, sent_at } per row
 * (services/invitations.js → accessSummaries).
 */
import React from 'react';
import { Send } from 'react-feather';

const TONE = {
  active:    { background: '#DCFCE7', color: '#166534' },
  sent:      { background: '#DBEAFE', color: '#1E40AF' },
  scheduled: { background: '#EDE9FE', color: '#5B21B6' },
  sending:   { background: '#EDE9FE', color: '#5B21B6' },
  waiting:   { background: '#F3F4F6', color: '#374151' },
  expired:   { background: '#FEF3C7', color: '#92400E' },
  failed:    { background: '#FEE2E2', color: '#991B1B' },
  held:      { background: '#FEF3C7', color: '#92400E' },
  disabled:  { background: '#FEE2E2', color: '#991B1B' },
  none:      { background: '#F9FAFB', color: '#9CA3AF' },
};

const SHORT_LABEL = {
  held: 'Held',
};

/** The row action for this access status, or null. */
export const accessAction = (access) => {
  if (!access) return null;
  if (access.status === 'waiting') return 'Invite now';
  if (['sent', 'expired', 'failed'].includes(access.status)) return 'Resend';
  return null;
};

const AccessChip = ({ access }) => {
  if (!access) return <span style={{ color: '#9CA3AF', fontSize: 12, fontStyle: 'italic' }}>—</span>;
  const tone = TONE[access.status] || TONE.none;
  const label = SHORT_LABEL[access.status] || access.label || access.status;
  const title = access.status === 'held' ? access.label
    : access.status === 'sent' && access.sent_at ? 'Invited ' + new Date(access.sent_at).toLocaleString()
    : access.reason || access.label;
  return (
    <span title={title} style={{ ...tone, padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {label}
    </span>
  );
};

/** The inline "Invite now" / "Resend" link for RowActionsMenu, or null. */
export const inviteRowAction = (access, onInvite, busy) => {
  const label = accessAction(access);
  if (!label || !onInvite) return null;
  return { key: 'invite', label: busy ? 'Sending…' : label, icon: <Send size={16} />, onClick: (row) => { if (!busy) onInvite(row); } };
};

export default AccessChip;
