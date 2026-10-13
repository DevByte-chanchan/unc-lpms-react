/**
 * npm run db:fresh                    (Docker: docker exec ca-api npm run db:fresh)
 * npm run db:fresh -- --keep-vmgo     keep the University / Department VMGO statements
 *   (npm run db:purge is the same command.)
 *
 * Development only — refuses to run with NODE_ENV=production.
 *
 * Returns LPMS to a brand-new state:
 *   1. TRUNCATEs every data table (built from the models, see utils/freshStart.js):
 *      uploads, academic terms, import batches, invitations, password resets and
 *      user accounts. SequelizeMeta is left alone; nothing is dropped.
 *   2. Empties ./uploads/ (keeps .gitkeep). sample-uploads/ is never touched.
 *   3. Seeds the admin and the six demo logins again (utils/seedUsers.js).
 *      People who got their account from an upload (e.g. the Deans and
 *      Program Heads) have none until the next upload invites them.
 *
 * There is no confirmation prompt. The API can stay up: signed-in browsers get
 * a 401 on their next request and land on the sign-in page.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from '../models/index.js';
import { freshStart, extraTables, planTables, assertNotProduction, FreshStartError } from '../utils/freshStart.js';
import { SeedError, DEMO_ACCOUNTS } from '../utils/seedUsers.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
const keepVmgo = process.argv.includes('--keep-vmgo');

const { sequelize, ...models } = db;

try {
  assertNotProduction(process.env);
  await sequelize.authenticate();

  const known = planTables(models).wipe;
  const extra = await extraTables(sequelize, known);
  const { wiped, kept, removedUploads, seeded } = await freshStart({
    sequelize, models, env: process.env, keepVmgo, extra, uploadsDir: UPLOADS_DIR,
  });

  const width = Math.max(...wiped.map((w) => w.table.length));
  console.log('[fresh] wiped (rows before):');
  wiped.forEach((w) => console.log('  ' + w.table.padEnd(width) + '  ' + w.rows));
  if (kept.length) console.log('[fresh] kept (--keep-vmgo): ' + kept.join(', '));
  console.log('[fresh] uploads/: ' + (removedUploads.length ? removedUploads.length + ' file(s) removed' : 'already empty'));

  seeded.notes.forEach((n) => console.log('[fresh] note: ' + n));
  console.log('[fresh] accounts recreated:');
  for (const c of seeded.created) {
    const demo = DEMO_ACCOUNTS.find((d) => d.email === c.email);
    const pw = demo ? demo.password : 'ADMIN_PASSWORD from .env (must change on first sign-in)';
    console.log('  ' + c.email.padEnd(28) + '  ' + c.roles.join(' + ').padEnd(25) + '  ' + pw);
  }
  console.log('Fresh start done. Next: sign in as carlos.garcia@unc.edu.ph, create a term, then upload departments.');
} catch (err) {
  const known = err instanceof FreshStartError || err instanceof SeedError;
  console.error('[fresh] ' + (known ? err.message : (err && err.stack) || err));
  process.exitCode = 1;
} finally {
  await sequelize.close().catch(() => {});
}
