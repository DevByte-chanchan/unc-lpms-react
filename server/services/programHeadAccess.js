/**
 * Program Head access comes from the programs list — never from the faculty
 * sheet's Role column, which is information only.
 *
 *   headsOf(periodId)                          who heads what, from the Program rows
 *   syncProgramHeadRoles({ periodId, before })  after a programs upload / add / edit
 *
 * For each program head that resolves to a faculty row of the period:
 *   - account exists, lacks the role → 'Program Head' appended (order kept),
 *     then markDirty: the notice worker tells them after the undo window
 *     (an update email if they have a password, their invitation if not). A
 *     'waiting' invitation (faculty upload, no course yet) becomes a scheduled
 *     one, so the Program Head role is what gets them invited.
 *   - no account yet → account + invitation via scheduleUploadInvitations
 *     (entity 'programs', signed by the uploading Dean). That supersedes a
 *     waiting invitation too.
 * Someone who headed a program before the change and heads none after it loses
 * 'Program Head' (and keeps every other role) and is marked dirty, so they get
 * "You no longer have the Program Head role". There is no grants table, so a
 * role the VPAA gave by hand can't be told apart; only people who were heads
 * BEFORE this change are ever considered.
 *
 * Nothing is emailed from here: every person-facing email goes through the
 * worker (services/notices.js, services/invitations.js), so it survives a
 * restart and combines with everything else that changed.
 */
import db from '../models/index.js';
import { scheduleUploadInvitations, UPLOAD_SEND_DELAY_MS, WAITING } from './invitations.js';
import { markDirty } from './notices.js';
import { isAllowedEmail, normalizeEmail } from '../utils/roles.js';
import { schoolEmail, samePerson } from '../utils/schoolEmail.js';

const { Program, Faculty, UserAccount, AccountInvitation } = db;

const ROLE = 'Program Head';
const HIDDEN = new Set(['Unlisted', 'Archived']);

export const unmatchedHeadMessage = (name) =>
  `Program Head '${name}' isn't in this term's faculty list. Upload the faculty list first, or fix the name.`;

/**
 * { byFaculty: Map(facultyId → [code]), unmatched: [name] } for the period.
 * A head with a name but no program_head_id isn't in the faculty list.
 */
export async function headsOf(periodId) {
  const byFaculty = new Map();
  const unmatched = [];
  if (!periodId) return { byFaculty, unmatched };
  const rows = await Program.findAll({
    where: { period_id: periodId },
    attributes: ['code', 'program_head', 'program_head_id', 'status'],
    order: [['code', 'ASC']],
  });
  for (const p of rows) {
    if (HIDDEN.has(p.status) || !p.program_head) continue;
    if (p.program_head_id == null) {
      if (!unmatched.includes(p.program_head)) unmatched.push(p.program_head);
      continue;
    }
    if (!byFaculty.has(p.program_head_id)) byFaculty.set(p.program_head_id, []);
    byFaculty.get(p.program_head_id).push(p.code);
  }
  return { byFaculty, unmatched };
}

/** The account a faculty row belongs to: by its email, else by name (only when unambiguous). */
export async function accountFor(fac) {
  const fileEmail = normalizeEmail(fac.email);
  const email = fileEmail && isAllowedEmail(fileEmail) ? fileEmail : schoolEmail(fac.name);
  if (email) {
    const byEmail = await UserAccount.findOne({ where: { email } });
    if (byEmail) return byEmail;
  }
  const byName = (await UserAccount.findAll()).filter((a) => samePerson(a.display_name, fac.name));
  return byName.length === 1 ? byName[0] : null;
}

/** Program codes the account heads in the period, by its faculty row. */
async function codesHeadedBy(account, periodId) {
  const { byFaculty } = await headsOf(periodId);
  const facs = await Faculty.findAll({ where: { period_id: periodId }, attributes: ['id', 'name', 'email'] });
  const mine = facs.filter((f) => normalizeEmail(f.email) === account.email || samePerson(f.name, account.display_name));
  return mine.flatMap((f) => byFaculty.get(f.id) || []);
}

/**
 * A 'waiting' invitation (created by a deferred faculty upload) becomes a
 * real scheduled one: the news that just arrived is what invites them.
 * Returns how many rows changed.
 */
export async function releaseWaitingInvitation(accountId, { senderId = null } = {}) {
  const [n] = await AccountInvitation.update(
    { status: 'scheduled', send_after: new Date(Date.now() + UPLOAD_SEND_DELAY_MS), ...(senderId ? { sent_by_account_id: senderId } : {}) },
    { where: { user_account_id: accountId, status: WAITING } },
  );
  return n;
}

/**
 * Bring the Program Head role in line with the period's programs.
 *
 * @param before   faculty ids that headed a program in the period before the
 *                 change (from headsOf, taken before the write)
 * @returns { granted: [email], invited, revoked: [email], unmatched: [message], notified: [email] }
 *          `notified` = the accounts handed to the notice worker.
 */
export async function syncProgramHeadRoles({ periodId, before = [], batchId = null, senderId = null }) {
  const out = { granted: [], invited: null, revoked: [], unmatched: [], notified: [] };
  if (!periodId) return out;
  const { byFaculty, unmatched } = await headsOf(periodId);
  out.unmatched = unmatched.map(unmatchedHeadMessage);

  const faculty = await Faculty.findAll({ where: { period_id: periodId }, attributes: ['id', 'name', 'email', 'status'] });
  const facById = new Map(faculty.map((f) => [f.id, f]));

  const toInvite = [];
  const dirty = [];
  for (const facultyId of byFaculty.keys()) {
    const fac = facById.get(facultyId);
    if (!fac) continue;
    const account = await accountFor(fac);
    if (!account) {
      toInvite.push({ name: fac.name, email: fac.email, roles: [ROLE, 'Instructor'] });
      continue;
    }
    if (account.status !== 'Active' || (account.roles || []).includes(ROLE)) continue;
    await account.update({ roles: [...(account.roles || []), ROLE] });
    out.granted.push(account.email);
    await releaseWaitingInvitation(account.id, { senderId });
    dirty.push(account);
  }

  if (toInvite.length) {
    out.invited = await scheduleUploadInvitations({ entity: 'programs', people: toInvite, batchId, periodId, senderId });
  }

  // Heads before, not heads now.
  for (const facultyId of before) {
    if (byFaculty.has(facultyId)) continue;
    const fac = facById.get(facultyId);
    if (!fac) continue;
    const account = await accountFor(fac);
    if (!account || !(account.roles || []).includes(ROLE)) continue;
    if ((await codesHeadedBy(account, periodId)).length) continue;   // still heads another program
    await account.update({ roles: account.roles.filter((r) => r !== ROLE) });
    out.revoked.push(account.email);
    dirty.push(account);
  }

  if (dirty.length) {
    await markDirty(dirty.map((a) => a.id), { periodId, senderId });
    out.notified = dirty.map((a) => a.email);
  }

  if (out.granted.length || out.revoked.length) {
    console.log(`[program-head] period ${periodId}: granted ${out.granted.length}, revoked ${out.revoked.length}, handed to the notice worker ${dirty.length}`);
  }
  return out;
}
