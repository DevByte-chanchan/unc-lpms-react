/**
 * Account invitations: "you've been given access — set your password".
 *
 *   createInvitation(account, opts)            a new row (waiting, scheduled, held or sending)
 *   sendInvitation(invitation, opts)           token → email → sent / held / failed (+ retry)
 *   scheduleUploadInvitations({ … })           after a faculty / department / program / consultant upload
 *   cancelBatchInvitations(batch)              when that upload is undone
 *   deliverDueInvitations()                    the email worker's tick
 *   sendDueReminders()                         day-3 / day-6 reminders, same tick
 *   inviteNow(account, { senderId })           Invite now / Resend (Dean, Program Head, VPAA)
 *   requestInvitation(email)                   "Send me a new link" from a dead link
 *   findLiveInvitation(token)                  for the set-password page
 *   invitationSummaries(accountIds)            the Invitation / Access columns
 *
 * The email is signed by whoever gave the access (sent_by_account_id), read
 * back from the row at send time — the worker sends long after the upload's
 * request is gone. Every invitation lists the person's CURRENT roles and
 * courses (services/notices.js → currentState), and records what it told them
 * in account_notices, so the notice worker finds nothing new afterwards.
 */
import { Op } from 'sequelize';
import db from '../models/index.js';
import { sendMail } from './mailer.js';
import { invitationEmail } from '../templates/invitationEmail.js';
import { hashPassword } from '../controllers/authController.js';
import { getActiveTermId } from '../utils/latestPeriod.js';
import { UNDO_WINDOW_MS } from '../utils/importUndo.js';
import { isAllowedEmail, isAllowedEmailForRoles, isRole, normalizeEmail, sortRoles } from '../utils/roles.js';
import { schoolEmail, samePerson } from '../utils/schoolEmail.js';
import { newToken, hashToken, looksLikeToken, unusablePassword } from '../utils/tokens.js';
import { currentState, recordTold, deadlinesFor } from './notices.js';

const { AccountInvitation, UserAccount, Faculty, Department, Program } = db;

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_TTL_DAYS = 7;
// After a failed send: retry in 1, 5 and 30 minutes, then give up.
export const RETRY_DELAYS_MS = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000];
// Scheduled sends wait out the upload's undo window, plus a margin, so no
// invitation goes out while the upload that granted it can still be undone.
export const UPLOAD_SEND_DELAY_MS = UNDO_WINDOW_MS + 10 * 1000;
// Someone who hasn't set a password gets a reminder 3 days after each
// invitation, at most this many times per account.
export const REMINDER_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
export const MAX_REMINDERS = 2;

// Not yet accepted, not dead: a newer invitation supersedes these.
const OUTSTANDING = ['waiting', 'held', 'scheduled', 'sent', 'failed'];
// Created but not to be sent until there is news (a course, a role) or
// someone presses Invite now.
export const WAITING = 'waiting';

export const appBaseUrl = () => String(process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

const short = (s, n = 255) => (s == null ? null : String(s).slice(0, n));
const cleanName = (s) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 100);

// --- Who's who in a period ---------------------------------------------------

const periodOr = async (periodId) => Number(periodId) || await getActiveTermId();

export async function facultyRowFor(periodId, { name, email }) {
  if (!periodId) return null;
  const rows = await Faculty.findAll({
    where: { period_id: periodId },
    attributes: ['id', 'name', 'email', 'role', 'status', 'department_id'],
  });
  const e = normalizeEmail(email);
  return rows.find((r) => e && normalizeEmail(r.email) === e)
    || rows.find((r) => samePerson(r.name, name))
    || null;
}

async function departmentsDeanedBy(periodId, name) {
  if (!periodId) return [];
  const rows = await Department.findAll({ where: { period_id: periodId }, attributes: ['id', 'name', 'code', 'dean', 'status'] });
  return rows.filter((d) => d.status !== 'Unlisted' && d.status !== 'Archived' && samePerson(d.dean, name));
}

async function programsHeadedBy(periodId, person, facultyRow) {
  if (!periodId) return [];
  const rows = await Program.findAll({
    where: { period_id: periodId },
    attributes: ['id', 'code', 'program_head', 'program_head_id', 'status'],
    order: [['code', 'ASC']],
  });
  return rows.filter((p) => p.status !== 'Unlisted'
    && ((facultyRow && p.program_head_id === facultyRow.id) || samePerson(p.program_head, person.name)));
}

/** The account's roles as the email shows them: "Program Head (BSIT)", "Dean (SCIS)", … */
export async function describeRoles(account, periodId) {
  const pid = await periodOr(periodId);
  const person = { name: account.display_name, email: account.email };
  const fac = await facultyRowFor(pid, person);
  const out = [];
  for (const role of account.roles || []) {
    if (role === 'Program Head') {
      const codes = (await programsHeadedBy(pid, person, fac)).map((p) => p.code);
      out.push(codes.length ? `Program Head (${codes.join(', ')})` : role);
    } else if (role === 'Dean') {
      let codes = (await departmentsDeanedBy(pid, person.name)).map((d) => d.code);
      if (!codes.length && fac && fac.department_id) {
        const d = await Department.findByPk(fac.department_id, { attributes: ['code'] });
        if (d) codes = [d.code];
      }
      out.push(codes.length ? `Dean (${codes.join(', ')})` : role);
    } else {
      out.push(role);
    }
  }
  return out;
}

// Which of the sender's roles gave the access, by where the invitation came
// from. A notice (course assignment, consultant course) or a reminder is
// signed with the sender's own highest hands-on role: Program Head if they
// have it, else Dean, else VPAA.
const SENDER_ROLE = {
  faculty: 'Dean',
  programs: 'Dean',
  industry_consultants: 'Program Head',
  departments: 'VPAA',
  manual: 'VPAA',
  notice: null,
  reminder: null,
  request: null,
};

/** { name, title } for the signature, or null for the system signature. */
export async function senderFor(invitation) {
  if (!invitation.sent_by_account_id) return null;
  const account = await UserAccount.findByPk(invitation.sent_by_account_id);
  if (!account) return null;
  const pid = await periodOr(invitation.period_id);
  const person = { name: account.display_name, email: account.email };
  const bySource = SENDER_ROLE[invitation.source_entity];
  const order = bySource === null ? ['Program Head', 'Dean', 'VPAA'] : ['VPAA', 'Dean', 'Program Head'];
  const role = bySource || order.find((r) => (account.roles || []).includes(r));

  if (role === 'VPAA') return { name: account.display_name, title: 'Vice President for Academic Affairs' };

  if (role === 'Dean') {
    let dept = (await departmentsDeanedBy(pid, person.name))[0];
    const own = dept ? null : await facultyRowFor(pid, person);
    if (!dept && own && own.department_id) dept = await Department.findByPk(own.department_id);
    if (!dept) {
      // A dean not (yet) recorded against a department signs for the
      // department of the faculty member they gave access to.
      const invitee = await facultyRowFor(pid, { name: invitation.display_name, email: invitation.email });
      if (invitee && invitee.department_id) dept = await Department.findByPk(invitee.department_id);
    }
    return { name: account.display_name, title: dept ? `Dean, ${dept.name}` : 'Dean' };
  }

  if (role === 'Program Head') {
    const codes = (await programsHeadedBy(pid, person, await facultyRowFor(pid, person))).map((p) => p.code);
    return { name: account.display_name, title: codes.length ? `Program Head, ${codes.join(', ')}` : 'Program Head' };
  }

  return { name: account.display_name, title: null };
}

// --- Creating and sending ------------------------------------------------------

/**
 * A new invitation for `account`. Status is 'held' when holdReason is given,
 * 'waiting' with `defer` (nothing is sent until there is news, or Invite now),
 * 'sending' with `immediate` (the caller sends it right away — never visible
 * to the worker as 'scheduled', so it can't be sent twice), otherwise
 * 'scheduled' for send_after. With supersede, every other outstanding
 * invitation for the account is cancelled first.
 */
export async function createInvitation(account, {
  source = 'manual', emailSource = 'manual', batchId = null, periodId = null,
  sendAfter = new Date(), senderId = null, holdReason = null, supersede = false, immediate = false,
  defer = false, createdAccount = false,
} = {}) {
  if (supersede && account) await supersedeOthers(account.id, null);
  let status = 'scheduled';
  if (holdReason) status = 'held';
  else if (immediate) status = 'sending';
  else if (defer) status = WAITING;
  return AccountInvitation.create({
    user_account_id: account ? account.id : null,
    email: account.email,
    display_name: account.display_name,
    email_source: emailSource,
    source_entity: source,
    import_batch_id: batchId,
    period_id: periodId,
    sent_by_account_id: senderId,
    created_account: !!createdAccount,
    status,
    hold_reason: short(holdReason),
    send_after: holdReason || defer ? null : sendAfter,
  });
}

export async function supersedeOthers(accountId, keepId) {
  if (!accountId) return;
  await AccountInvitation.update(
    { status: 'cancelled', token_hash: null, hold_reason: 'Replaced by a newer invitation.' },
    { where: { user_account_id: accountId, status: OUTSTANDING, ...(keepId ? { id: { [Op.ne]: keepId } } : {}) } },
  );
}

const nextRetry = (attempts) => RETRY_DELAYS_MS[attempts - 1];

/**
 * Deliver one invitation now. Generates the token, stores only its hash,
 * renders the email with the account's real name, roles, courses and the
 * term's deadlines, sends it, and records the outcome:
 *   captured/sent → 'sent'   (older outstanding invitations are cancelled)
 *   skipped       → 'held'   (MAIL_MODE=off, or not on the dev allowlist)
 *   failed        → 'scheduled' again for the next retry, or 'failed' when out of retries
 * Then (unless it failed) writes what it told them into account_notices.
 * Returns { status, reason? } — the mailer's verdict.
 */
export async function sendInvitation(invitation, { subjectPrefix = '', note, state = null } = {}) {
  const account = invitation.user_account_id ? await UserAccount.findByPk(invitation.user_account_id) : null;
  if (!account || account.status !== 'Active') {
    await invitation.update({ status: 'cancelled', token_hash: null, last_error: account ? 'The account is disabled.' : 'The account no longer exists.' });
    return { status: 'failed', reason: account ? 'The account is disabled.' : 'The account no longer exists.' };
  }

  const token = newToken();
  const expires = new Date(Date.now() + INVITE_TTL_MS);
  await invitation.update({
    status: 'sending',
    email: account.email,
    display_name: account.display_name,
    token_hash: hashToken(token),
    expires_at: expires,
  });

  const periodId = await periodOr(invitation.period_id);
  let result;
  let now = state;
  try {
    if (!now) now = await currentState(account, periodId);
    const [roles, sender, deadlines] = await Promise.all([
      describeRoles(account, periodId), senderFor(invitation), deadlinesFor(periodId),
    ]);
    const mail = invitationEmail({
      name: account.display_name,
      roles,
      courses: { lead: now.lead, contributor: now.contributor, consultant: now.consultant },
      deadlines,
      link: appBaseUrl() + '/set-password?token=' + encodeURIComponent(token),
      sender,
      expiresInDays: INVITE_TTL_DAYS,
      note,
    });
    result = await sendMail({ ...mail, to: account.email, subject: subjectPrefix + mail.subject });
  } catch (err) {
    result = { status: 'failed', reason: 'Could not build the email: ' + err.message };
  }

  const attempts = (invitation.attempts || 0) + 1;
  if (result.status === 'sent' || result.status === 'captured') {
    await invitation.update({ status: 'sent', sent_at: new Date(), attempts, last_error: null, hold_reason: null });
    await supersedeOthers(account.id, invitation.id);
  } else if (result.status === 'skipped') {
    await invitation.update({
      status: 'held', token_hash: null, expires_at: null, attempts,
      hold_reason: short('Not sent: ' + (result.reason || 'skipped by the mailer')),
    });
  } else {
    const retryIn = nextRetry(attempts);
    await invitation.update({
      status: retryIn ? 'scheduled' : 'failed',
      send_after: retryIn ? new Date(Date.now() + retryIn) : invitation.send_after,
      token_hash: null,
      expires_at: null,
      attempts,
      last_error: short(result.reason || 'Unknown error'),
    });
  }
  // The invitation told them everything (or the mailer deliberately dropped
  // it): the notice worker must not repeat it.
  if (now && result.status !== 'failed' && periodId) {
    try { await recordTold(account.id, periodId, now, { result: result.status === 'skipped' ? 'Not sent: ' + (result.reason || 'skipped') : null }); }
    catch (err) { console.error('[invitations] could not record what was told:', err.message); }
  }
  return result;
}

// --- The email worker's tick ---------------------------------------------------

/**
 * Claim and send every due scheduled invitation. A claim is one atomic
 * UPDATE … WHERE status = 'scheduled', so two workers (or a worker and a
 * resend) never send the same row twice. A row stuck in 'sending' (the
 * process died mid-send) is put back after 5 minutes. 'waiting' rows are
 * never picked: they wait for news (services/notices.js) or Invite now.
 */
export async function deliverDueInvitations({ limit = 20, accountIds = null } = {}) {
  const now = new Date();
  // accountIds: tests scope the tick to their own throw-away accounts.
  const scope = accountIds ? { user_account_id: accountIds } : {};
  await AccountInvitation.update(
    { status: 'scheduled', token_hash: null, expires_at: null },
    { where: { ...scope, status: 'sending', updatedAt: { [Op.lt]: new Date(now.getTime() - 5 * 60 * 1000) } } },
  );

  const due = await AccountInvitation.findAll({
    where: { ...scope, status: 'scheduled', send_after: { [Op.lte]: now } },
    order: [['send_after', 'ASC'], ['id', 'ASC']],
    limit,
  });

  let sent = 0;
  for (const row of due) {
    const [claimed] = await AccountInvitation.update({ status: 'sending' }, { where: { id: row.id, status: 'scheduled' } });
    if (!claimed) continue;
    await row.reload();
    const result = await sendInvitation(row);
    if (result.status === 'sent' || result.status === 'captured') sent += 1;
  }
  return { due: due.length, sent };
}

/** How many reminders this account has had (reminder rows, whatever became of them). */
export const reminderCount = (accountId) =>
  AccountInvitation.count({ where: { user_account_id: accountId, source_entity: 'reminder' } });

/**
 * Reminders for people who were invited and haven't set a password: 3 days
 * after the latest invitation went out, a fresh one (new link, current roles
 * and courses, "Reminder: " subject, signed by the original sender) — at most
 * MAX_REMINDERS per account. After that the Dean / Program Head still see
 * "Invited" and can Resend.
 */
export async function sendDueReminders({ now = new Date(), limit = 20, accountIds = null } = {}) {
  const due = await AccountInvitation.findAll({
    where: {
      ...(accountIds ? { user_account_id: accountIds } : {}),
      status: 'sent',
      expires_at: { [Op.gt]: now },
      sent_at: { [Op.lte]: new Date(now.getTime() - REMINDER_AFTER_MS) },
    },
    order: [['sent_at', 'ASC'], ['id', 'ASC']],
    limit,
  });
  let sent = 0;
  for (const old of due) {
    if (!old.user_account_id) continue;
    const account = await UserAccount.findByPk(old.user_account_id);
    if (!account || account.status !== 'Active' || !account.must_change_password) continue;
    if ((await reminderCount(account.id)) >= MAX_REMINDERS) continue;
    // Claim the old row so a second worker can't remind for it too.
    const [claimed] = await AccountInvitation.update(
      { status: 'cancelled', token_hash: null, hold_reason: 'Replaced by a reminder.' },
      { where: { id: old.id, status: 'sent' } },
    );
    if (!claimed) continue;
    const fresh = await createInvitation(account, {
      source: 'reminder', emailSource: old.email_source, periodId: old.period_id,
      senderId: old.sent_by_account_id, supersede: true, immediate: true,
    });
    const r = await sendInvitation(fresh, { subjectPrefix: 'Reminder: ' });
    if (r.status === 'sent' || r.status === 'captured') sent += 1;
    else if (r.status !== 'failed') {
      // The mailer dropped it (allowlist / off): keep the old link alive.
      await old.update({ status: 'sent', token_hash: old.token_hash, hold_reason: null });
    }
  }
  return { due: due.length, sent };
}

// --- Invite now / Resend / "Send me a new link" --------------------------------

export const MAX_MANUAL_INVITES_PER_HOUR = 5;

/** True when this account already had MAX_MANUAL_INVITES_PER_HOUR hand-sent invitations in the last hour. */
export async function tooManyInvites(accountId) {
  const n = await AccountInvitation.count({
    where: {
      user_account_id: accountId,
      source_entity: ['manual', 'faculty', 'industry_consultants', 'request'],
      import_batch_id: null,
      createdAt: { [Op.gt]: new Date(Date.now() - 60 * 60 * 1000) },
      status: { [Op.ne]: WAITING },
    },
  });
  return n >= MAX_MANUAL_INVITES_PER_HOUR;
}

/**
 * Send (or resend) an invitation right now, superseding every outstanding one.
 * Refused (409) once the person has a password of their own — they use
 * Forgot password instead. Returns { status: 'sent' | 'skipped' | 'failed' |
 * 'active' | 'disabled', reason?, invitation? }.
 */
export async function inviteNow(account, { senderId = null, source = 'manual', periodId = null } = {}) {
  if (!account) return { status: 'failed', reason: 'That account no longer exists.' };
  if (account.status !== 'Active') return { status: 'disabled', reason: 'The account is disabled.' };
  if (!account.must_change_password) {
    return { status: 'active', reason: account.display_name + ' has already set a password — use Forgot password instead.' };
  }
  const invitation = await createInvitation(account, {
    source, emailSource: 'manual', senderId, periodId: await periodOr(periodId), supersede: true, immediate: true,
  });
  const result = await sendInvitation(invitation);
  const status = result.status === 'sent' || result.status === 'captured' ? 'sent' : result.status;
  const [summary] = Object.values(await invitationSummaries([account.id]));
  return { status, reason: result.reason || null, invitation: summary || null };
}

/**
 * "Send me a new link" from a dead invitation link. Sends a fresh invitation
 * ONLY when the address has an Active account that is still waiting to set a
 * password; otherwise nothing happens. The caller answers the same way in
 * every case. Returns true when something was sent.
 */
export async function requestInvitation(rawEmail) {
  const email = normalizeEmail(rawEmail);
  if (!email || !isAllowedEmail(email)) {
    // A non-UNC consultant address is accepted only when the switch is on and
    // the account has exactly that one role (checked below).
    if (!isAllowedEmailForRoles(email, ['Industry Consultant'])) return false;
  }
  const account = await UserAccount.findOne({ where: { email } });
  if (!account || account.status !== 'Active' || !account.must_change_password) return false;
  if (!isAllowedEmailForRoles(email, account.roles || [])) return false;
  const last = await AccountInvitation.findOne({
    where: { user_account_id: account.id, sent_by_account_id: { [Op.ne]: null } },
    order: [['id', 'DESC']],
    attributes: ['sent_by_account_id', 'period_id'],
  });
  const r = await inviteNow(account, {
    source: 'request', senderId: last ? last.sent_by_account_id : null, periodId: last ? last.period_id : null,
  });
  return r.status === 'sent';
}

// --- Uploads -----------------------------------------------------------------

/**
 * Faculty sheet row → account roles: every Active faculty member teaches, and
 * that's all. The Role column is information only — Program Head comes from
 * the programs upload (services/programHeadAccess.js), Dean from the
 * departments upload.
 */
export function rolesForFacultyRow(_role) {
  return ['Instructor'];
}

// Keep the account's own order (its first role is where it lands) and append
// any newly granted ones in the canonical order. Uploads add, never remove.
const mergeRoles = (current, granted) => {
  const out = [...(current || [])];
  for (const r of sortRoles(granted)) if (!out.includes(r)) out.push(r);
  return out;
};

/**
 * After an upload commits: make sure everyone it gives access to has an
 * account, and schedule one invitation each for those who still need one.
 *
 *   people: [{ name, email (as in the file, may be blank/odd), roles }]
 *   defer:  true → a new or still-uninvited account gets a 'waiting'
 *           invitation (nothing sent until they have a course, or Invite now)
 *           instead of a scheduled one. The faculty upload does this.
 *
 * The email is the file's when it's a UNC address, otherwise
 * firstname.surname@unc.edu.ph. Held instead of scheduled:
 *   - the file gives a non-UNC address (we invite the derived one, held, so a
 *     person checks it first) — unless ALLOW_EXTERNAL_CONSULTANT_EMAILS lets
 *     an Industry-Consultant-only account use it;
 *   - no email can be worked out from the name;
 *   - the email belongs to a different person (another account, or another
 *     row of the same file).
 * Skipped: disabled accounts, accounts that already have a working password
 * of their own, and accounts with an invitation already on its way. A
 * 'waiting' or 'held' invitation does not count as on its way: a later,
 * non-deferred upload supersedes it with a real one.
 *
 * Never throws: a problem here must not undo a committed upload. Returns
 * { scheduled, waiting, held, skipped, created }.
 */
export async function scheduleUploadInvitations({ entity, people, batchId = null, periodId = null, senderId = null, defer = false }) {
  const summary = { scheduled: 0, waiting: 0, held: 0, skipped: 0, created: 0 };
  const claimed = new Map(); // email → name, within this file
  const sendAfter = new Date(Date.now() + UPLOAD_SEND_DELAY_MS);
  const base = { source: entity, batchId, periodId, senderId, sendAfter, defer };

  for (const person of people || []) {
    try {
      const name = cleanName(person.name);
      if (!name) { summary.skipped += 1; continue; }
      // As given, NOT canonically sorted: the first role is where the person
      // lands, so a Program Head stays ['Program Head', 'Instructor'].
      const roles = [...new Set((person.roles || []).filter(isRole))];
      if (!roles.length) { summary.skipped += 1; continue; }

      const raw = String(person.email || '').trim();
      const fileEmail = normalizeEmail(raw);
      let email = null;
      let emailSource = 'derived';
      let holdReason = null;
      if (fileEmail && isAllowedEmailForRoles(fileEmail, roles)) {
        email = fileEmail;
        emailSource = 'file';
      } else {
        email = schoolEmail(name);
        if (raw) holdReason = `The file gives "${raw}", which isn't a UNC address. Check ${name}'s UNC email, then send.`;
      }

      if (!email) {
        await AccountInvitation.create({
          email: raw || '(none)', display_name: name, email_source: 'derived', source_entity: entity,
          import_batch_id: batchId, period_id: periodId, sent_by_account_id: senderId, status: 'held',
          hold_reason: short(`Couldn't work out a UNC email for "${name}". Add the email to the file, then upload again.`),
        });
        summary.held += 1;
        continue;
      }

      const otherInFile = claimed.get(email);
      if (otherInFile && !samePerson(otherInFile, name)) {
        await AccountInvitation.create({
          email, display_name: name, email_source: emailSource, source_entity: entity,
          import_batch_id: batchId, period_id: periodId, sent_by_account_id: senderId, status: 'held',
          hold_reason: short(`${email} is also used for ${otherInFile} in this file.`),
        });
        summary.held += 1;
        continue;
      }
      claimed.set(email, name);

      let account = await UserAccount.findOne({ where: { email } });
      if (account && !samePerson(account.display_name, name)) {
        await AccountInvitation.create({
          email, display_name: name, email_source: emailSource, source_entity: entity,
          import_batch_id: batchId, period_id: periodId, sent_by_account_id: senderId, status: 'held',
          hold_reason: short(`${email} already belongs to ${account.display_name}.`),
        });
        summary.held += 1;
        continue;
      }

      if (account) {
        if (account.status !== 'Active') { summary.skipped += 1; continue; }
        // A non-UNC address is only ever good for an Industry-Consultant-only account.
        if (!isAllowedEmail(account.email) && !isAllowedEmailForRoles(account.email, mergeRoles(account.roles, roles))) {
          await AccountInvitation.create({
            email, display_name: name, email_source: emailSource, source_entity: entity,
            import_batch_id: batchId, period_id: periodId, sent_by_account_id: senderId, status: 'held',
            hold_reason: short('This account uses a non-UNC email; give it a UNC address first.'),
          });
          summary.held += 1;
          continue;
        }
        const merged = mergeRoles(account.roles, roles);
        if (merged.length !== (account.roles || []).length) await account.update({ roles: merged });
        // Already has a password of their own: nothing to invite to.
        if (!account.must_change_password) { summary.skipped += 1; continue; }
        const onItsWay = await AccountInvitation.count({
          where: {
            user_account_id: account.id,
            [Op.or]: [
              { status: ['scheduled', 'sending'] },
              { status: 'sent', expires_at: { [Op.gt]: new Date() } },
              { status: 'accepted' },
            ],
          },
        });
        if (onItsWay) { summary.skipped += 1; continue; }
        // A deferred upload leaves an existing waiting / held invitation as it is.
        if (defer && !holdReason) {
          const parked = await AccountInvitation.count({ where: { user_account_id: account.id, status: [WAITING, 'held'] } });
          if (parked) { summary.skipped += 1; continue; }
        }
        // An earlier waiting/held/failed invitation is replaced by this one.
        await supersedeOthers(account.id, null);
      }
      const createdAccount = !account;
      if (!account) {
        account = await UserAccount.create({
          email,
          display_name: name,
          roles,
          status: 'Active',
          must_change_password: true,
          password_hash: await hashPassword(unusablePassword()),
        });
        summary.created += 1;
      }

      await createInvitation(account, { ...base, emailSource, holdReason, createdAccount });
      if (holdReason) summary.held += 1;
      else if (defer) summary.waiting += 1;
      else summary.scheduled += 1;
    } catch (err) {
      console.error('[invitations] could not prepare an invitation:', err.message);
      summary.skipped += 1;
    }
  }

  if (summary.scheduled || summary.held || summary.waiting) {
    console.log(`[invitations] ${entity} upload: ${summary.scheduled} scheduled, ${summary.waiting} waiting, ${summary.held} held, ${summary.skipped} skipped, ${summary.created} new accounts`);
  }
  return summary;
}

/**
 * The upload was undone: cancel its unsent invitations (waiting / scheduled /
 * held → cancelled), and delete the accounts it created that have no other
 * source — never signed in, never accepted an invitation, no invitation from
 * any other upload. Roles an upload ADDED to an account that already existed
 * are not recorded anywhere (there is no grants table yet), so they are not
 * taken back.
 */
export async function cancelBatchInvitations(batch) {
  if (!batch) return { cancelled: 0, removedAccounts: 0 };
  const rows = await AccountInvitation.findAll({ where: { import_batch_id: batch.id, status: [WAITING, 'scheduled', 'held'] } });
  if (!rows.length) return { cancelled: 0, removedAccounts: 0 };

  await AccountInvitation.update(
    { status: 'cancelled', token_hash: null, hold_reason: 'The upload was undone.' },
    { where: { id: rows.map((r) => r.id) } },
  );

  let removedAccounts = 0;
  // Only accounts this upload itself created (recorded on the invitation —
  // creation timestamps are second-precision and can't tell them apart).
  const created = rows.filter((r) => r.created_account && r.user_account_id).map((r) => r.user_account_id);
  for (const accountId of new Set(created)) {
    const account = await UserAccount.findByPk(accountId);
    if (!account || !account.must_change_password || account.last_login_at) continue;
    const otherSource = await AccountInvitation.count({
      where: {
        user_account_id: accountId,
        [Op.or]: [
          { import_batch_id: { [Op.ne]: batch.id } },
          { import_batch_id: null },
          { status: 'accepted' },
        ],
      },
    });
    if (otherSource) continue;
    await account.destroy();
    await db.AccountNotice.destroy({ where: { user_account_id: accountId } }).catch(() => {});
    await db.Notification.destroy({ where: { user_account_id: accountId } }).catch(() => {});
    removedAccounts += 1;
  }
  console.log(`[invitations] undo of batch ${batch.id}: ${rows.length} invitations cancelled, ${removedAccounts} unused accounts removed`);
  return { cancelled: rows.length, removedAccounts };
}

// --- Accepting -----------------------------------------------------------------

/** The live invitation behind a link token (sent, unexpired, account Active), or null. */
export async function findLiveInvitation(token) {
  if (!looksLikeToken(token)) return null;
  const invitation = await AccountInvitation.findOne({
    where: { token_hash: hashToken(token), status: 'sent', expires_at: { [Op.gt]: new Date() } },
  });
  if (!invitation || !invitation.user_account_id) return null;
  const account = await UserAccount.findByPk(invitation.user_account_id);
  if (!account || account.status !== 'Active') return null;
  return { invitation, account };
}

// --- The Invitation / Access columns ------------------------------------------

/**
 * { [accountId]: { status, sent_at, accepted_at, reason, send_after } } from
 * each account's most recent invitation. No row → no entry ("Not sent").
 * 'waiting' = created, not invited yet.
 */
export async function invitationSummaries(accountIds) {
  if (!accountIds.length) return {};
  const rows = await AccountInvitation.findAll({
    where: { user_account_id: accountIds },
    order: [['id', 'DESC']],
    attributes: ['id', 'user_account_id', 'status', 'sent_at', 'accepted_at', 'hold_reason', 'last_error', 'send_after', 'expires_at'],
  });
  const out = {};
  for (const r of rows) {
    if (out[r.user_account_id]) continue;
    const expired = r.status === 'sent' && r.expires_at && new Date(r.expires_at) <= new Date();
    out[r.user_account_id] = {
      status: expired ? 'expired' : r.status,
      sent_at: r.sent_at,
      accepted_at: r.accepted_at,
      send_after: r.send_after,
      reason: r.status === 'held' || r.status === 'cancelled' ? r.hold_reason : (r.status === 'failed' || r.status === 'scheduled' ? r.last_error : null),
    };
  }
  return out;
}

// What the Access column says for each invitation status.
export const ACCESS_LABELS = Object.freeze({
  waiting: 'Not invited yet',
  scheduled: 'Sending…',
  sending: 'Sending…',
  sent: 'Invited',
  expired: 'Expired',
  accepted: 'Active',
  failed: 'Failed',
  cancelled: 'Not invited yet',
});

/**
 * The Access cell for a person on a list page: { account_id, status, label,
 * sent_at, accepted_at, reason }. `status` is one of the invitation statuses,
 * 'active' (has a password), or 'none' (no account). Resolves the account by
 * email, else by unambiguous name.
 */
export async function accessSummaries(people) {
  const accounts = await UserAccount.findAll({ attributes: ['id', 'email', 'display_name', 'status', 'must_change_password', 'roles'] });
  const byEmail = new Map(accounts.map((a) => [a.email, a]));
  const resolve = (p) => {
    const e = normalizeEmail(p.email);
    if (e && byEmail.has(e)) return byEmail.get(e);
    const derived = schoolEmail(p.name);
    if (derived && byEmail.has(derived) && samePerson(byEmail.get(derived).display_name, p.name)) return byEmail.get(derived);
    const byName = accounts.filter((a) => samePerson(a.display_name, p.name));
    return byName.length === 1 ? byName[0] : null;
  };
  const matched = people.map((p) => ({ key: p.key, account: resolve(p) }));
  const summaries = await invitationSummaries([...new Set(matched.filter((m) => m.account).map((m) => m.account.id))]);
  const out = {};
  for (const { key, account } of matched) {
    if (!account) { out[key] = { account_id: null, status: 'none', label: 'No account' }; continue; }
    const inv = summaries[account.id] || null;
    let status;
    let label;
    let reason = inv ? inv.reason : null;
    if (account.status !== 'Active') { status = 'disabled'; label = 'Disabled'; }
    else if (!account.must_change_password) { status = 'active'; label = 'Active'; }
    else if (!inv) { status = 'waiting'; label = ACCESS_LABELS.waiting; }
    else if (inv.status === 'held') { status = 'held'; label = 'Held: ' + (inv.reason || 'needs a check'); }
    else { status = inv.status; label = ACCESS_LABELS[inv.status] || inv.status; }
    out[key] = {
      account_id: account.id, status, label, reason,
      sent_at: inv ? inv.sent_at : null, accepted_at: inv ? inv.accepted_at : null,
    };
  }
  return out;
}

/** Held invitations that never got an account (bad or colliding email). */
export async function heldWithoutAccount() {
  return AccountInvitation.findAll({
    where: { status: 'held', user_account_id: null },
    order: [['id', 'DESC']],
    attributes: ['id', 'email', 'display_name', 'hold_reason', 'source_entity', 'createdAt'],
    limit: 100,
  });
}
