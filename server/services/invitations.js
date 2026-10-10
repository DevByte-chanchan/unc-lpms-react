/**
 * Account invitations: "you've been given access — set your password".
 *
 *   createInvitation(account, opts)            a new row (scheduled or held)
 *   sendInvitation(invitation, opts)           token → email → sent / held / failed (+ retry)
 *   scheduleUploadInvitations({ … })           after a faculty / department / consultant upload
 *   deliverDueInvitations()                    the email worker's tick
 *   findLiveInvitation(token)                  for the set-password page
 *   invitationSummaries(accountIds)            the User Accounts "Invitation" column
 *
 * The email is signed by whoever gave the access (sent_by_account_id), read
 * back from the row at send time — the worker sends long after the upload's
 * request is gone.
 */
import { Op } from 'sequelize';
import db from '../models/index.js';
import { sendMail } from './mailer.js';
import { invitationEmail } from '../templates/invitationEmail.js';
import { hashPassword } from '../controllers/authController.js';
import { getActiveTermId } from '../utils/latestPeriod.js';
import { isAllowedEmail, isRole, normalizeEmail, sortRoles } from '../utils/roles.js';
import { schoolEmail, samePerson } from '../utils/schoolEmail.js';
import { newToken, hashToken, looksLikeToken, unusablePassword } from '../utils/tokens.js';

const { AccountInvitation, UserAccount, Faculty, Department, Program } = db;

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_TTL_DAYS = 7;
// After a failed send: retry in 1, 5 and 30 minutes, then give up.
export const RETRY_DELAYS_MS = [60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000];
// Upload invitations are due straight away: uploads are final (there is no
// undo window to wait out), so the worker sends them on its next poll.
export const UPLOAD_SEND_DELAY_MS = 0;

// Not yet accepted, not dead: a newer invitation supersedes these.
const OUTSTANDING = ['held', 'scheduled', 'sent', 'failed'];

export const appBaseUrl = () => String(process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');

const short = (s, n = 255) => (s == null ? null : String(s).slice(0, n));
const cleanName = (s) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 100);

// --- Who's who in a period ---------------------------------------------------

const periodOr = async (periodId) => Number(periodId) || await getActiveTermId();

async function facultyRowFor(periodId, { name, email }) {
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

// Which of the sender's roles gave the access, by where the invitation came from.
const SENDER_ROLE = {
  faculty: 'Dean',
  industry_consultants: 'Program Head',
  departments: 'VPAA',
  manual: 'VPAA',
};

/** { name, title } for the signature, or null for the system signature. */
export async function senderFor(invitation) {
  if (!invitation.sent_by_account_id) return null;
  const account = await UserAccount.findByPk(invitation.sent_by_account_id);
  if (!account) return null;
  const pid = await periodOr(invitation.period_id);
  const person = { name: account.display_name, email: account.email };
  const role = SENDER_ROLE[invitation.source_entity]
    || ['VPAA', 'Dean', 'Program Head'].find((r) => (account.roles || []).includes(r));

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
 * 'sending' with `immediate` (the caller sends it right away — never visible
 * to the worker as 'scheduled', so it can't be sent twice), otherwise
 * 'scheduled' for send_after. With supersede, every other outstanding
 * invitation for the account is cancelled first.
 */
export async function createInvitation(account, {
  source = 'manual', emailSource = 'manual', batchId = null, periodId = null,
  sendAfter = new Date(), senderId = null, holdReason = null, supersede = false, immediate = false,
} = {}) {
  if (supersede && account) await supersedeOthers(account.id, null);
  let status = 'scheduled';
  if (holdReason) status = 'held';
  else if (immediate) status = 'sending';
  return AccountInvitation.create({
    user_account_id: account ? account.id : null,
    email: account.email,
    display_name: account.display_name,
    email_source: emailSource,
    source_entity: source,
    import_batch_id: batchId,
    period_id: periodId,
    sent_by_account_id: senderId,
    status,
    hold_reason: short(holdReason),
    send_after: holdReason ? null : sendAfter,
  });
}

async function supersedeOthers(accountId, keepId) {
  if (!accountId) return;
  await AccountInvitation.update(
    { status: 'cancelled', token_hash: null, hold_reason: 'Replaced by a newer invitation.' },
    { where: { user_account_id: accountId, status: OUTSTANDING, ...(keepId ? { id: { [Op.ne]: keepId } } : {}) } },
  );
}

const nextRetry = (attempts) => RETRY_DELAYS_MS[attempts - 1];

/**
 * Deliver one invitation now. Generates the token, stores only its hash,
 * renders the email with the account's real name and roles, sends it, and
 * records the outcome:
 *   captured/sent → 'sent'   (older outstanding invitations are cancelled)
 *   skipped       → 'held'   (MAIL_MODE=off, or not on the dev allowlist)
 *   failed        → 'scheduled' again for the next retry, or 'failed' when out of retries
 * Returns { status, reason? } — the mailer's verdict.
 */
export async function sendInvitation(invitation, { subjectPrefix = '', note } = {}) {
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

  let result;
  try {
    const [roles, sender] = await Promise.all([describeRoles(account, invitation.period_id), senderFor(invitation)]);
    const mail = invitationEmail({
      name: account.display_name,
      roles,
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
  return result;
}

// --- The email worker's tick ---------------------------------------------------

/**
 * Claim and send every due scheduled invitation. A claim is one atomic
 * UPDATE … WHERE status = 'scheduled', so two workers (or a worker and a
 * resend) never send the same row twice. A row stuck in 'sending' (the
 * process died mid-send) is put back after 5 minutes.
 */
export async function deliverDueInvitations({ limit = 20 } = {}) {
  const now = new Date();
  await AccountInvitation.update(
    { status: 'scheduled', token_hash: null, expires_at: null },
    { where: { status: 'sending', updatedAt: { [Op.lt]: new Date(now.getTime() - 5 * 60 * 1000) } } },
  );

  const due = await AccountInvitation.findAll({
    where: { status: 'scheduled', send_after: { [Op.lte]: now } },
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

// --- Uploads -----------------------------------------------------------------

/** Faculty sheet role → account roles: every Active faculty member teaches. */
export function rolesForFacultyRow(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r === 'dean') return ['Dean', 'Instructor'];
  if (r === 'program head') return ['Program Head', 'Instructor'];
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
 *
 * The email is the file's when it's a UNC address, otherwise
 * firstname.surname@unc.edu.ph. Held instead of scheduled:
 *   - the file gives a non-UNC address (we invite the derived one, held, so a
 *     person checks it first);
 *   - no email can be worked out from the name;
 *   - the email belongs to a different person (another account, or another
 *     row of the same file).
 * Skipped: disabled accounts, accounts that already have a working password
 * of their own, and accounts with an invitation already on its way.
 *
 * Never throws: a problem here must not undo a committed upload. Returns
 * { scheduled, held, skipped, created }.
 */
export async function scheduleUploadInvitations({ entity, people, batchId = null, periodId = null, senderId = null }) {
  const summary = { scheduled: 0, held: 0, skipped: 0, created: 0 };
  const claimed = new Map(); // email → name, within this file
  const sendAfter = new Date(Date.now() + UPLOAD_SEND_DELAY_MS);
  const base = { source: entity, batchId, periodId, senderId, sendAfter };

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
      if (fileEmail && isAllowedEmail(fileEmail)) {
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
        // An earlier held/failed invitation is replaced by this one.
        await supersedeOthers(account.id, null);
      } else {
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

      await createInvitation(account, { ...base, emailSource, holdReason });
      if (holdReason) summary.held += 1; else summary.scheduled += 1;
    } catch (err) {
      console.error('[invitations] could not prepare an invitation:', err.message);
      summary.skipped += 1;
    }
  }

  if (summary.scheduled || summary.held) {
    console.log(`[invitations] ${entity} upload: ${summary.scheduled} scheduled, ${summary.held} held, ${summary.skipped} skipped, ${summary.created} new accounts`);
  }
  return summary;
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

// --- The User Accounts column -------------------------------------------------

/**
 * { [accountId]: { status, sent_at, accepted_at, reason, send_after } } from
 * each account's most recent invitation. No row → no entry ("Not sent").
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

/** Held invitations that never got an account (bad or colliding email). */
export async function heldWithoutAccount() {
  return AccountInvitation.findAll({
    where: { status: 'held', user_account_id: null },
    order: [['id', 'DESC']],
    attributes: ['id', 'email', 'display_name', 'hold_reason', 'source_entity', 'createdAt'],
    limit: 100,
  });
}
