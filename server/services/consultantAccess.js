/**
 * Industry Consultant access comes from the consultant list only (upload or a
 * Program Head adding someone by hand) — never from the faculty Role column.
 *
 *   grantConsultantAccess({ name, email, periodId, senderId })   after an add / upload row
 *   revokeConsultantAccess({ name, periodId, senderId })         after a delete / a re-upload drops them
 *   consultantAccountFor(name)                                   the account behind a consultant row
 *
 * industry_consultants has no email column: the email is used for the account
 * and the invitation only, resolved exactly as uploads do (the given address if
 * it's acceptable, else firstname.surname@unc.edu.ph, held for a person to
 * check). With ALLOW_EXTERNAL_CONSULTANT_EMAILS=true a non-UNC address is
 * accepted for an account whose only role is Industry Consultant.
 *
 * Nothing is emailed from here. Granting the role marks the account dirty:
 * the notice worker (services/notices.js) tells them — together with the
 * courses assigned in the same burst — after the undo window, by update
 * email or by their invitation. A 'waiting' invitation becomes scheduled.
 */
import db from '../models/index.js';
import { scheduleUploadInvitations } from './invitations.js';
import { releaseWaitingInvitation } from './programHeadAccess.js';
import { markDirty } from './notices.js';
import { isAllowedEmail, isAllowedEmailForRoles, normalizeEmail, EXTERNAL_EMAIL_MESSAGE } from '../utils/roles.js';
import { schoolEmail, samePerson } from '../utils/schoolEmail.js';

const { UserAccount, AccountInvitation, IndustryConsultant } = db;

export const ROLE = 'Industry Consultant';
const cleanName = (s) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, 100);

/** What uploads would invite: the given address when the rule allows it, else the derived one. */
const resolveEmail = (name, raw) => {
  const given = normalizeEmail(raw);
  return given && isAllowedEmailForRoles(given, [ROLE]) ? given : schoolEmail(name);
};

const latestHoldReason = async (email) => {
  const row = await AccountInvitation.findOne({ where: { email, status: 'held' }, order: [['id', 'DESC']] });
  return row ? row.hold_reason : null;
};

// The upload path: creates the account when needed, holds what needs checking.
async function invite({ name, raw, email, periodId, senderId, batchId }) {
  const s = await scheduleUploadInvitations({
    entity: 'industry_consultants',
    people: [{ name, email: raw, roles: [ROLE] }],
    batchId, periodId, senderId,
  });
  if (s.scheduled) return { status: 'invited', email };
  if (s.held) return { status: 'held', email, reason: (email && await latestHoldReason(email)) || 'Held for a person to check.' };
  return { status: 'already', email };
}

/** The account behind a consultant name: derived email (same person), else an unambiguous name. */
export async function consultantAccountFor(name) {
  name = cleanName(name);
  const derived = schoolEmail(name);
  let account = derived ? await UserAccount.findOne({ where: { email: derived } }) : null;
  if (account && !samePerson(account.display_name, name)) account = null;
  if (!account) {
    const byName = (await UserAccount.findAll()).filter((a) => samePerson(a.display_name, name));
    account = byName.length === 1 ? byName[0] : null;
  }
  return account;
}

/**
 * @returns { status: 'invited' | 'role_added' | 'already' | 'held' | 'disabled', email, reason?, notified? }
 *          notified: true when the notice worker will tell them.
 */
export async function grantConsultantAccess({
  name, email: raw = '', periodId = null, senderId = null, batchId = null,
}) {
  name = cleanName(name);
  raw = String(raw || '').trim();
  const email = resolveEmail(name, raw);
  const args = { name, raw, email, periodId, senderId, batchId };

  // No usable email, or an unacceptable one in the file: held, as uploads do.
  if (!email || (raw && !isAllowedEmailForRoles(normalizeEmail(raw), [ROLE]))) return invite(args);

  let account = await UserAccount.findOne({ where: { email } });
  // An outside address given for someone who already has a UNC account: use that account.
  if (!account && !isAllowedEmail(email)) account = await consultantAccountFor(name);
  // No account, or the email belongs to someone else (held with the reason).
  if (!account || !samePerson(account.display_name, name)) return invite(args);

  if (account.status !== 'Active') return { status: 'disabled', email: account.email, reason: 'The account is disabled.' };
  if ((account.roles || []).includes(ROLE)) {
    // Courses may still have changed for them (the caller links them next).
    await markDirty([account.id], { periodId, senderId });
    return { status: 'already', email: account.email };
  }
  // A non-UNC account can hold Industry Consultant only — this adds a second role to it.
  if (!isAllowedEmailForRoles(account.email, [...(account.roles || []), ROLE])) {
    return { status: 'held', email: account.email, reason: EXTERNAL_EMAIL_MESSAGE };
  }

  await account.update({ roles: [...(account.roles || []), ROLE] });
  await releaseWaitingInvitation(account.id, { senderId });
  await markDirty([account.id], { periodId, senderId });
  return { status: 'role_added', email: account.email, notified: true };
}

/**
 * The person is no longer a consultant in the period: take the Industry
 * Consultant role away, keep the account and every other role. If it was their
 * only role, the account is disabled instead (an account needs a role). Either
 * way they are marked dirty, so a "no longer the consultant for …" goes out
 * only if they really had courses.
 * @returns { status: 'removed' | 'disabled' | 'still_consultant' | 'no_account' | 'no_role', email? }
 */
export async function revokeConsultantAccess({ name, periodId, senderId = null }) {
  name = cleanName(name);
  if (periodId) {
    const rows = await IndustryConsultant.findAll({ where: { period_id: periodId }, attributes: ['name'] });
    if (rows.some((r) => samePerson(r.name, name))) {
      // Still on the list — but their courses may have changed.
      const still = await consultantAccountFor(name);
      if (still) await markDirty([still.id], { periodId, senderId });
      return { status: 'still_consultant' };
    }
  }
  const account = await consultantAccountFor(name);
  if (!account) return { status: 'no_account' };
  const roles = account.roles || [];
  if (!roles.includes(ROLE)) return { status: 'no_role', email: account.email };
  const rest = roles.filter((r) => r !== ROLE);
  if (!rest.length) {
    await account.update({ status: 'Disabled' });
    await markDirty([account.id], { periodId, senderId });
    return { status: 'disabled', email: account.email };
  }
  await account.update({ roles: rest });
  await markDirty([account.id], { periodId, senderId });
  return { status: 'removed', email: account.email };
}

/** The success line the Add Consultant form shows. */
export function accessMessage(name, result) {
  if (!result) return null;
  switch (result.status) {
    case 'invited':    return `An invitation to ${result.email} goes out in about 40 seconds.`;
    case 'role_added': return `${name} was given the Industry Consultant role. They'll get one email listing their courses.`;
    case 'already':    return `${name} already has the Industry Consultant role.`;
    case 'held':       return `Held — ${result.reason}`;
    case 'disabled':   return `${name}'s account is disabled, so no access was given.`;
    default:           return null;
  }
}
