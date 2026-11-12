/**
 * Which accounts does a Dean see on User Accounts?   npm run accounts:check -- <dean email>
 *
 * Prints the Dean's Faculty uploads, the faculty rows they cover, and the
 * accounts that land on the page (same rules as the page: services/deanAccountScope.js).
 */
import dotenv from 'dotenv';
import db from '../models/index.js';
import { normalizeEmail } from '../utils/roles.js';
import { accountScopeFor } from '../services/deanAccountScope.js';

dotenv.config();
const { UserAccount, ImportBatch } = db;
const email = normalizeEmail(process.argv[2]);

async function main() {
  if (!email) { console.log('Usage: npm run accounts:check -- dean.email@unc.edu.ph'); return; }
  const user = await UserAccount.findOne({ where: { email } });
  if (!user) { console.log('No account for ' + email + '.'); return; }
  console.log(`Account   ${user.email} · ${user.display_name} · roles: ${(user.roles || []).join(', ')}`);
  const batches = await ImportBatch.findAll({ where: { entity: 'faculty' }, attributes: ['id', 'period_id', 'status', 'created_by_account_id', 'filename'], order: [['id', 'DESC']], limit: 10 });
  console.log('Faculty uploads (latest 10):');
  for (const b of batches) console.log(`  #${b.id} term ${b.period_id} ${b.status} by ${b.created_by_account_id === user.id ? 'THIS DEAN' : (b.created_by_account_id ?? 'unknown')} ${b.filename || ''}`);
  const scope = await accountScopeFor(user);
  if (scope.all) { console.log('Not a Dean: would see every account.'); return; }
  const accounts = scope.accountIds.size ? await UserAccount.findAll({ where: { id: [...scope.accountIds] }, attributes: ['email', 'display_name', 'roles'], order: [['display_name', 'ASC']] }) : [];
  console.log(`On the page: ${accounts.length} account(s)`);
  for (const a of accounts) console.log(`  ${a.display_name} <${a.email}> ${(a.roles || []).join(', ')}`);
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; }).finally(() => db.sequelize && db.sequelize.close());
