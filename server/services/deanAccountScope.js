/**
 * Which accounts a Dean manages on User Accounts: the faculty THEY brought in.
 *
 * An account is the Dean's when either
 *   1. one of its invitations came from a Faculty upload the Dean made
 *      (import_batches.created_by_account_id, or the invitation's sender), or
 *   2. it matches a faculty row in a term the Dean uploaded into (or the
 *      active term), the same way the Faculty page's Access column matches
 *      (email, school email, or name) — limited to the Dean's department when
 *      it's known. People who already had an account or an invitation get no
 *      new invitation from a re-upload, so (1) alone would miss them.
 * The Dean's own account is never in the list.
 *
 * A VPAA with no Dean role sees everyone (the API is still theirs; the page
 * is the Dean's).
 */
import { Op } from 'sequelize';
import db from '../models/index.js';
import { hasRole } from '../utils/roles.js';
import { samePerson } from '../utils/schoolEmail.js';
import { getActiveTermId } from '../utils/latestPeriod.js';
import { normalizeEmail } from '../utils/roles.js';
import { accessSummaries } from './invitations.js';

const { ImportBatch, AccountInvitation, Department, Faculty, UserAccount } = db;

/** { all: true } for a VPAA-only caller; else { accountIds, emails, batchIds, userId }. */
export async function accountScopeFor(user) {
  if (!hasRole(user, 'Dean')) return { all: true };

  // 1. The Dean's own Faculty uploads (not undone) and the terms they went into.
  const batches = ImportBatch
    ? await ImportBatch.findAll({ where: { entity: 'faculty', created_by_account_id: user.id }, attributes: ['id', 'period_id', 'status'] })
    : [];
  const batchIds = batches.map((b) => b.id);
  const periods = new Set(batches.filter((b) => b.status !== 'undone' && b.period_id != null).map((b) => b.period_id));
  const active = await getActiveTermId();
  if (active) periods.add(active);

  // 2. Invitations the Dean's uploads (or the Dean) made.
  const or = [{ sent_by_account_id: user.id }];
  if (batchIds.length) or.push({ import_batch_id: batchIds });
  const invitations = await AccountInvitation.findAll({ where: { source_entity: 'faculty', [Op.or]: or }, attributes: ['user_account_id', 'email'] });
  const accountIds = new Set(invitations.map((i) => i.user_account_id).filter((id) => id != null));
  const emails = new Set(invitations.map((i) => normalizeEmail(i.email)).filter(Boolean));

  // 3. The faculty rows of those terms — the list on the Dean's Faculty page.
  //    When the Dean's department is known, only its faculty (and rows with no
  //    department); otherwise the whole list.
  if (periods.size && Faculty) {
    const rows = await Faculty.findAll({ where: { period_id: [...periods] }, attributes: ['id', 'name', 'email', 'role', 'department_id', 'period_id'] });
    const mine = new Set();
    if (Department) {
      const departments = await Department.findAll({ where: { period_id: [...periods] }, attributes: ['id', 'dean'] });
      departments.filter((d) => d.dean && samePerson(d.dean, user.display_name)).forEach((d) => mine.add(d.id));
    }
    // The Dean's own faculty row names their department too.
    rows.filter((r) => r.department_id != null && (normalizeEmail(r.email) === normalizeEmail(user.email) || samePerson(r.name, user.display_name)))
      .forEach((r) => mine.add(r.department_id));
    const people = rows
      .filter((r) => !mine.size || r.department_id == null || mine.has(r.department_id))
      .map((r) => ({ key: r.id, name: r.name, email: r.email }));
    const access = await accessSummaries(people);
    Object.values(access).forEach((a) => { if (a.account_id != null) accountIds.add(a.account_id); });
    people.forEach((p) => { const e = normalizeEmail(p.email); if (e) emails.add(e); });
  }

  if (emails.size) {
    const byEmail = await UserAccount.findAll({ where: { email: [...emails] }, attributes: ['id'] });
    byEmail.forEach((a) => accountIds.add(a.id));
  }
  accountIds.delete(user.id);
  return { all: false, accountIds, emails, batchIds, userId: user.id };
}

export const inScope = (scope, accountId) => scope.all || scope.accountIds.has(Number(accountId));
