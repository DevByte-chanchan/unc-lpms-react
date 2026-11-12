/**
 * Which accounts a Dean manages on User Accounts: the faculty THEY brought in.
 *
 * An account is the Dean's when either
 *   1. one of its invitations came from a Faculty upload the Dean made
 *      (import_batches.created_by_account_id, or the invitation's sender), or
 *   2. it belongs to a faculty member of the department the Dean heads in the
 *      active term (departments.dean names them) — this covers uploads made
 *      before uploads recorded who made them.
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

const { ImportBatch, AccountInvitation, Department, Faculty, UserAccount } = db;

/** { all: true } for a VPAA-only caller; else { accountIds, emails, batchIds }. */
export async function accountScopeFor(user) {
  if (!hasRole(user, 'Dean')) return { all: true };

  const batches = ImportBatch
    ? await ImportBatch.findAll({ where: { entity: 'faculty', created_by_account_id: user.id }, attributes: ['id'] })
    : [];
  const batchIds = batches.map((b) => b.id);

  const invitationWhere = { source_entity: 'faculty', [Op.or]: [{ sent_by_account_id: user.id }] };
  if (batchIds.length) invitationWhere[Op.or].push({ import_batch_id: batchIds });
  const invitations = await AccountInvitation.findAll({ where: invitationWhere, attributes: ['user_account_id', 'email'] });

  const accountIds = new Set(invitations.map((i) => i.user_account_id).filter((id) => id != null));
  const emails = new Set(invitations.map((i) => normalizeEmail(i.email)).filter(Boolean));

  // The department(s) this Dean heads in the active term → its faculty.
  const periodId = await getActiveTermId();
  if (periodId && Department && Faculty) {
    const departments = await Department.findAll({ where: { period_id: periodId }, attributes: ['id', 'dean'] });
    const mine = departments.filter((d) => d.dean && samePerson(d.dean, user.display_name)).map((d) => d.id);
    if (mine.length) {
      const faculty = await Faculty.findAll({ where: { period_id: periodId, department_id: mine }, attributes: ['email'] });
      faculty.forEach((f) => { const e = normalizeEmail(f.email); if (e) emails.add(e); });
    }
  }

  if (emails.size) {
    const byEmail = await UserAccount.findAll({ where: { email: [...emails] }, attributes: ['id'] });
    byEmail.forEach((a) => accountIds.add(a.id));
  }
  accountIds.delete(user.id);
  return { all: false, accountIds, emails, batchIds, userId: user.id };
}

export const inScope = (scope, accountId) => scope.all || scope.accountIds.has(Number(accountId));
