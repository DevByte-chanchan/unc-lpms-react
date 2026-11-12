/**
 * "Was this person told about this course?" — for the Course Assignment page.
 *
 * Read from what the notice worker already records (services/notices.js):
 *   notifications        one row per person per course (lead_added /
 *                        contributor_added), with emailed_at and read_at
 *   account_notices      the queue: dirty / send_after, last_error, last_result,
 *                        and told_lead / told_contributor (what they were told)
 *   account_invitations  for people who haven't set a password yet
 *
 * deliveryFor(rows, periodId) → Map(rowId → { lead: Status|null,
 *   contributors: { [faculty_id|name]: Status } })
 *
 * Status = { state, label, detail?, at?, canResend }
 *   sent       emailed (and maybe seen in the app)
 *   told       told earlier (before tracking, or in their invitation)
 *   bell       in the app only — their invitation is already out
 *   queued     sends after the undo window (a few minutes)
 *   retrying   the email failed and will be tried again
 *   failed     the email failed for good
 *   not_sent   the mailer skipped it (e.g. dev allow-list)
 *   held       their invitation is held (e.g. not a UNC email)
 *   no_account no LPMS account to send to
 *   inactive   the assignment isn't Active / On Leave, so nobody is told
 */
import db from '../models/index.js';
import { accountForPerson } from './notices.js';

const { Faculty, UserAccount, Notification, AccountNotice, AccountInvitation } = db;
const COUNTED = ['Active', 'On Leave'];
const KINDS = ['lead_added', 'contributor_added'];

const fmt = (d) => (d ? new Date(d).toISOString() : null);
const codeOf = (row) => String(row.course_code || '').trim();

function statusFor({ row, account, notice, notification, invitation }) {
  const code = codeOf(row);
  if (!COUNTED.includes(row.status)) {
    return { state: 'inactive', label: 'Not sent', detail: 'Faculty are notified once the assignment is Active.', canResend: false };
  }
  if (!account) {
    return { state: 'no_account', label: 'No account', detail: 'Not matched to an LPMS account (check the Faculty list name and email).', canResend: false };
  }
  if (account.must_change_password && invitation && invitation.status === 'held') {
    return { state: 'held', label: 'Invitation held', detail: invitation.hold_reason || 'Needs a check before it can be sent.', canResend: false };
  }
  const told = notice ? [...(notice.told_lead || []), ...(notice.told_contributor || [])].map(String) : [];
  if (notification) {
    if (notification.emailed_at) {
      return notification.read_at
        ? { state: 'sent', label: 'Seen', detail: 'Emailed and seen in the app.', at: fmt(notification.read_at), canResend: true }
        : { state: 'sent', label: 'Email sent', detail: 'Emailed; also in their bell.', at: fmt(notification.emailed_at), canResend: true };
    }
    if (notice && notice.dirty && notice.last_error) {
      return { state: 'retrying', label: 'Retrying', detail: 'Email failed: ' + notice.last_error + '. Trying again.', canResend: true };
    }
    if (notice && /failed/i.test(notice.last_result || '')) {
      return { state: 'failed', label: 'Email failed', detail: notice.last_error || notice.last_result, canResend: true };
    }
    if (notice && /^Not sent/i.test(notice.last_result || '')) {
      return { state: 'not_sent', label: 'Not emailed', detail: notice.last_result, canResend: true };
    }
    return notification.read_at
      ? { state: 'sent', label: 'Seen', detail: 'Seen in the app.', at: fmt(notification.read_at), canResend: true }
      : { state: 'bell', label: 'In the app', detail: 'Their invitation is already out; this course waits in their bell until they sign in.', at: fmt(notification.createdAt), canResend: true };
  }
  if (notice && notice.dirty && !told.includes(code)) {
    return { state: 'queued', label: 'Sending soon', detail: 'Goes out after the undo window (a few minutes).', at: fmt(notice.send_after), canResend: false };
  }
  if (told.includes(code)) {
    return { state: 'told', label: 'Notified', detail: 'Told earlier (in an invitation or an earlier email).', at: fmt(notice.last_sent_at), canResend: true };
  }
  return { state: 'queued', label: 'Not sent yet', detail: 'Will be sent with the next notice.', canResend: true };
}

/** The account for a faculty id, using the same matching as the notices. */
async function accountsByFaculty(facultyIds) {
  const ids = [...new Set(facultyIds.filter(Boolean).map(Number))];
  if (!ids.length) return new Map();
  const [rows, accounts] = await Promise.all([
    Faculty.findAll({ where: { id: ids }, attributes: ['id', 'name', 'email'] }),
    UserAccount.findAll({ attributes: ['id', 'email', 'display_name', 'status', 'must_change_password', 'roles'] }),
  ]);
  return new Map(rows.map((f) => [Number(f.id), accountForPerson(accounts, f)]));
}

export async function deliveryFor(rows, periodId) {
  const out = new Map();
  if (!rows.length || !periodId) return out;
  const people = (r) => [
    ...(r.faculty_id ? [{ role: 'lead', faculty_id: Number(r.faculty_id) }] : []),
    ...(Array.isArray(r.contributors) ? r.contributors : []).filter(Boolean)
      .map((c) => ({ role: 'contributor', faculty_id: c.faculty_id ? Number(c.faculty_id) : null, name: c.faculty_name })),
  ];
  const byFaculty = await accountsByFaculty(rows.flatMap((r) => people(r).map((p) => p.faculty_id)));
  const accountIds = [...new Set([...byFaculty.values()].filter(Boolean).map((a) => a.id))];

  const [notices, notifications, invitations] = accountIds.length ? await Promise.all([
    AccountNotice.findAll({ where: { user_account_id: accountIds, period_id: periodId } }),
    Notification.findAll({
      where: { user_account_id: accountIds, period_id: periodId, kind: KINDS, target_type: 'assignment' },
      attributes: ['user_account_id', 'target_id', 'emailed_at', 'read_at', 'createdAt', 'id'],
      order: [['id', 'DESC']],
    }),
    AccountInvitation.findAll({
      where: { user_account_id: accountIds }, attributes: ['user_account_id', 'status', 'hold_reason', 'id'], order: [['id', 'DESC']],
    }),
  ]) : [[], [], []];
  const noticeOf = new Map(notices.map((n) => [n.user_account_id, n]));
  const notifOf = new Map();
  for (const n of notifications) {
    const k = n.user_account_id + '|' + String(n.target_id || '').trim();
    if (!notifOf.has(k)) notifOf.set(k, n);   // newest first
  }
  const inviteOf = new Map();
  for (const i of invitations) if (!inviteOf.has(i.user_account_id)) inviteOf.set(i.user_account_id, i);

  for (const r of rows) {
    const entry = { lead: null, contributors: {} };
    for (const p of people(r)) {
      const account = p.faculty_id ? byFaculty.get(p.faculty_id) || null : null;
      const status = statusFor({
        row: r,
        account,
        notice: account ? noticeOf.get(account.id) : null,
        notification: account ? notifOf.get(account.id + '|' + codeOf(r)) : null,
        invitation: account ? inviteOf.get(account.id) : null,
      });
      if (p.role === 'lead') entry.lead = status;
      else entry.contributors[p.faculty_id || p.name] = status;
    }
    out.set(r.id, entry);
  }
  return out;
}

/**
 * "Send again" for one person on one course. Not signed in yet → a fresh
 * invitation now (it lists their courses). Signed in → the course is taken
 * out of what they were told, and the notice worker emails it on its next tick.
 */
export async function resendFor(row, facultyId, { senderId }) {
  const { inviteNow, tooManyInvites } = await import('./invitations.js');
  const byFaculty = await accountsByFaculty([facultyId]);
  const account = byFaculty.get(Number(facultyId));
  if (!account) return { status: 400, message: 'This person has no LPMS account to send to.' };
  if (account.status !== 'Active') return { status: 400, message: 'This account is disabled.' };
  if (account.must_change_password) {
    if (await tooManyInvites(account.id)) return { status: 429, message: 'At most 5 invitations an hour for one person. Try again later.' };
    const r = await inviteNow(account, { senderId, source: 'notice', periodId: row.period_id });
    if (r.status === 'sent' || r.status === 'captured') return { status: 200, message: 'Invitation sent to ' + account.email + '.' };
    if (r.status === 'skipped') return { status: 200, message: 'Not sent: ' + (r.reason || 'skipped by the mailer') };
    return { status: 502, message: 'The email could not be sent: ' + (r.reason || 'unknown error') };
  }
  const code = codeOf(row);
  const [notice] = await AccountNotice.findOrCreate({
    where: { user_account_id: account.id, period_id: row.period_id },
    defaults: { dirty: false, told_lead: [], told_contributor: [], told_roles: account.roles || [], told_consultant: [] },
  });
  const drop = (list) => (Array.isArray(list) ? list : []).filter((c) => String(c).trim() !== code);
  await notice.update({
    told_lead: drop(notice.told_lead), told_contributor: drop(notice.told_contributor),
    dirty: true, send_after: new Date(), first_dirty_at: new Date(), sent_by_account_id: senderId,
    attempts: 0, last_error: null, last_result: null,
  });
  return { status: 202, message: 'Queued: ' + account.email + ' gets an email about ' + code + ' within a minute.' };
}
