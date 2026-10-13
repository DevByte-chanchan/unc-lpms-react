/**
 * User Accounts — VPAA (/role/ovpaa?page=User%20Accounts).
 *
 * Every LPMS account with its invitation status, and two row actions:
 *   - Send invitation / Resend — emails a set-password link now, signed by
 *     you; any earlier link for that account stops working.
 *   - Send password reset — emails a 1-hour reset link.
 * Below the table: invitations held because no account could be made (an
 * email that isn't UNC's, or one already used by someone else).
 *
 * Accounts are created by the faculty / department / consultant uploads.
 */
import React from 'react';
import { Search, RefreshCw } from 'react-feather';
import ConfirmModal from '../components/ConfirmModal.jsx';
import tableStyles from '../styles/CoursesTable.module.sass';
import syllabusStyles from '../styles/SyllabusSections.module.sass';
import { UserAccountsAPI } from '../services/api.js';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

/** { text, tone } for the Invitation column. */
function invitationLabel(inv) {
  if (!inv) return { text: 'Not sent', tone: 'muted' };
  switch (inv.status) {
    // Created by a faculty upload; sent once they have a course, or on Send invitation.
    case 'waiting':   return { text: 'Not invited yet', tone: 'muted' };
    case 'scheduled': return { text: inv.reason ? 'Scheduled — retrying (' + inv.reason + ')' : 'Scheduled', tone: 'info' };
    case 'sending':   return { text: 'Sending…', tone: 'info' };
    case 'sent':      return { text: 'Sent ' + fmtDate(inv.sent_at), tone: 'info' };
    case 'expired':   return { text: 'Expired (sent ' + fmtDate(inv.sent_at) + ')', tone: 'warn' };
    case 'accepted':  return { text: 'Accepted ' + fmtDate(inv.accepted_at), tone: 'ok' };
    case 'failed':    return { text: 'Failed — ' + (inv.reason || 'unknown error'), tone: 'bad' };
    case 'held':      return { text: 'Held — ' + (inv.reason || 'needs attention'), tone: 'warn' };
    case 'cancelled': return { text: 'Cancelled' + (inv.reason ? ' — ' + inv.reason : ''), tone: 'muted' };
    default:          return { text: inv.status, tone: 'muted' };
  }
}

const TONES = {
  muted: { color: '#6B7280' },
  info:  { color: '#1D4ED8' },
  ok:    { color: '#15803D' },
  warn:  { color: '#B45309' },
  bad:   { color: '#B91C1C' },
};

const canResend = (inv) => !!inv && ['waiting', 'sent', 'expired', 'scheduled', 'sending', 'failed'].includes(inv.status);

const linkBtn = {
  background: 'transparent', border: 'none', padding: '4px 6px', fontFamily: 'inherit',
  fontSize: 13, fontWeight: 500, color: '#18191A', cursor: 'pointer', textDecoration: 'underline',
};

const UserAccounts = () => {
  const [accounts, setAccounts] = React.useState([]);
  const [held, setHeld] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [confirm, setConfirm] = React.useState(null); // { kind: 'invite'|'reset', account }
  const [busy, setBusy] = React.useState(false);
  const [banner, setBanner] = React.useState(null);   // { tone: 'ok'|'bad', text }

  const refresh = React.useCallback(async () => {
    setLoadError(null);
    try {
      const [list, heldRows] = await Promise.all([UserAccountsAPI.list(), UserAccountsAPI.heldInvitations()]);
      setAccounts(Array.isArray(list) ? list : []);
      setHeld(Array.isArray(heldRows) ? heldRows : []);
    } catch (err) {
      setLoadError(err.message || 'Could not load the accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => [a.display_name, a.email, (a.roles || []).join(' '), invitationLabel(a.invitation).text]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [accounts, query]);

  const run = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const { message } = confirm.kind === 'invite'
        ? await UserAccountsAPI.sendInvitation(confirm.account.id)
        : await UserAccountsAPI.sendPasswordReset(confirm.account.id);
      setBanner({ tone: 'ok', text: message });
    } catch (err) {
      setBanner({ tone: 'bad', text: err.message || 'Could not send the email.' });
    } finally {
      setBusy(false);
      setConfirm(null);
      refresh();
    }
  };

  const confirmCopy = confirm && (confirm.kind === 'invite'
    ? {
      title: (canResend(confirm.account.invitation) ? 'Resend' : 'Send') + ' invitation?',
      message: 'Email ' + confirm.account.display_name + ' (' + confirm.account.email + ') a link to set their password. It\'s signed by you and works for 7 days.'
        + (canResend(confirm.account.invitation) ? ' The link sent earlier will stop working.' : ''),
      label: canResend(confirm.account.invitation) ? 'Resend' : 'Send invitation',
    }
    : {
      title: 'Send password reset?',
      message: 'Email ' + confirm.account.display_name + ' (' + confirm.account.email + ') a link to choose a new password. It works for 1 hour; their current password keeps working until they use it.',
      label: 'Send reset link',
    });

  return (
    <div style={{ padding: 20, background: '#FFFFFF', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>User Accounts</h2>
        <button type="button" onClick={() => { setLoading(true); refresh(); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 20, color: '#374151', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {banner && (
        <div role="status" style={{
          marginBottom: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.4, display: 'flex', justifyContent: 'space-between', gap: 12,
          background: banner.tone === 'ok' ? '#F0FDF4' : '#FEF2F2', border: '1px solid ' + (banner.tone === 'ok' ? '#BBF7D0' : '#FECACA'), color: banner.tone === 'ok' ? '#166534' : '#B91C1C',
        }}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} style={{ ...linkBtn, color: 'inherit', padding: 0 }}>Dismiss</button>
        </div>
      )}

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className={syllabusStyles['section-select']} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', height: 40, borderRadius: 9999, background: 'transparent', border: '1px solid #D1D5DB', flex: '0 1 360px', minWidth: 220, maxWidth: 420 }}>
          <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, role or invitation" style={{ border: 0, outline: 'none', background: 'transparent', width: '100%', fontSize: 14 }} />
        </div>
      </div>

      {loadError && <div style={{ color: '#B91C1C', fontSize: 14, marginBottom: 12 }}>{loadError}</div>}

      {loading ? (
        <div style={{ color: '#6B7280', fontSize: 14 }}>Loading accounts…</div>
      ) : (
        <div className={tableStyles['table-container']} style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflowX: 'auto', overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
              <tr>
                <th width={220}>NAME</th>
                <th width={260}>EMAIL</th>
                <th width={200}>ROLES</th>
                <th width={100}>STATUS</th>
                <th width={300}>INVITATION</th>
                <th className={tableStyles.fill}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => {
                const label = invitationLabel(a.invitation);
                const accepted = a.invitation && a.invitation.status === 'accepted';
                const active = a.status === 'Active';
                return (
                  <tr key={a.id}>
                    <td width={220}>{a.display_name}</td>
                    <td width={260} style={{ wordBreak: 'break-all' }}>{a.email}</td>
                    <td width={200}>{(a.roles || []).join(', ')}</td>
                    <td width={100}>{a.status}</td>
                    <td width={300} style={{ fontSize: 13, ...TONES[label.tone] }} title={label.text}>{label.text}</td>
                    <td className={tableStyles.fill} style={{ paddingRight: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {active && !accepted && (
                        <button type="button" style={linkBtn} onClick={() => setConfirm({ kind: 'invite', account: a })}>
                          {canResend(a.invitation) ? 'Resend' : 'Send invitation'}
                        </button>
                      )}
                      {active && (
                        <button type="button" style={linkBtn} onClick={() => setConfirm({ kind: 'reset', account: a })}>
                          Send password reset
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={6} style={{ color: '#6B7280', padding: 16 }}>{query ? 'No accounts match.' : 'No accounts yet.'}</td></tr>
              )}
            </tbody>
          </table>

          {held.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Held — no account yet</h3>
              <p style={{ margin: '0 0 8px', color: '#6B7280', fontSize: 13 }}>
                These people were in an upload, but no account could be made. Fix the email in the file and upload it again.
              </p>
              <table>
                <tbody>
                  {held.map((h) => (
                    <tr key={h.id}>
                      <td width={220}>{h.display_name}</td>
                      <td width={260} style={{ wordBreak: 'break-all' }}>{h.email}</td>
                      <td style={{ fontSize: 13, color: '#B45309' }}>{h.hold_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirmCopy ? confirmCopy.title : ''}
        message={confirmCopy ? confirmCopy.message : ''}
        confirmLabel={confirmCopy ? confirmCopy.label : 'Send'}
        busyLabel="Sending…"
        busy={busy}
        onConfirm={run}
        onCancel={() => { if (!busy) setConfirm(null); }}
      />
    </div>
  );
};

export default UserAccounts;
