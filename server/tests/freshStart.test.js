/**
 * npm run db:fresh — the production guard, the table plan built from the
 * models, and the wipe + re-seed itself.
 *
 * The wipe runs against SCRATCH tables (fresh-test-<pid>-…), never the real
 * ones, so running the suite doesn't empty your development database. The
 * "next upload" test uses the real user_accounts / account_invitations tables
 * with a throw-away email that is deleted afterwards. Database tests are
 * skipped when the database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import UserAccountFactory from '../models/userAccount.js';
import UniversityStatementFactory from '../models/universityStatement.js';
import DepartmentStatementFactory from '../models/departmentStatement.js';
import { freshStart, planTables, assertNotProduction, FreshStartError } from '../utils/freshStart.js';
import { DEMO_ACCOUNTS } from '../utils/seedUsers.js';
import { scheduleUploadInvitations } from '../services/invitations.js';

const here = path.dirname(fileURLToPath(import.meta.url));

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const ENV = {
  NODE_ENV: 'development',
  ADMIN_EMAIL: 'fresh.admin@unc.edu.ph',
  ADMIN_PASSWORD: 'Admin-Pass-1',
};
const UPLOADED_PEOPLE = ['kristine.sanlorenzo@unc.edu.ph', 'edrian.lait@unc.edu.ph'];

// ---------------------------------------------------------------------------
// Guard and plan (no database)

test('production: refuses, before touching anything', () => {
  assert.throws(() => assertNotProduction({ NODE_ENV: 'production' }), FreshStartError);
  assert.doesNotThrow(() => assertNotProduction({ NODE_ENV: 'development' }));
  assert.doesNotThrow(() => assertNotProduction({}));
});

test('production: npm run db:fresh exits non-zero with a clear message', () => {
  const r = spawnSync(process.execPath, [path.join(here, '..', 'scripts', 'purge.js')], {
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /NODE_ENV=production/);
});

test('plan: every model table is wiped, SequelizeMeta never, VMGO only without --keep-vmgo', () => {
  const { sequelize: _s, ...models } = db;
  const { wipe, keep } = planTables(models);
  for (const t of [
    'academic_periods', 'departments', 'faculty', 'programs', 'courses', 'prerequisites',
    'program_course_offerings', 'course_offering_assignments', 'industry_consultants',
    'consultant_courses', 'import_batches', 'account_invitations', 'password_resets',
    'user_accounts', 'university_statements', 'department_statements',
  ]) assert.ok(wipe.includes(t), t);
  assert.equal(wipe.length, Object.keys(models).length, 'one table per model');
  assert.deepEqual(keep, []);
  assert.ok(!wipe.includes('SequelizeMeta'));

  const vmgo = planTables(models, { keepVmgo: true });
  assert.deepEqual(vmgo.keep.sort(), ['department_statements', 'university_statements']);
  assert.ok(!vmgo.wipe.includes('university_statements'));

  const extra = planTables(models, { extra: ['course_offerings', 'SequelizeMeta'] });
  assert.ok(extra.wipe.includes('course_offerings'));
  assert.ok(!extra.wipe.includes('SequelizeMeta'));
});

// ---------------------------------------------------------------------------
// The wipe, on scratch tables

let scratchN = 0;
async function scratchModels(t) {
  scratchN += 1;
  const tag = 'fresh_test_' + process.pid + '_' + scratchN;
  const models = {
    AcademicPeriod: sequelize.define('FreshPeriod' + scratchN, { name: DataTypes.STRING }, { tableName: tag + '_periods' }),
    Department: sequelize.define('FreshDept' + scratchN, { code: DataTypes.STRING }, { tableName: tag + '_departments' }),
    UniversityStatement: UniversityStatementFactory(sequelize, DataTypes, { modelName: 'FreshUni' + scratchN, tableName: tag + '_uni' }),
    DepartmentStatement: DepartmentStatementFactory(sequelize, DataTypes, { modelName: 'FreshDeptSt' + scratchN, tableName: tag + '_deptst' }),
    UserAccount: UserAccountFactory(sequelize, DataTypes, { modelName: 'FreshUser' + scratchN, tableName: tag + '_users' }),
  };
  for (const m of Object.values(models)) await m.sync({ force: true });
  t.after(async () => { for (const m of Object.values(models)) await m.drop().catch(() => {}); });

  // Something in every table, including the two uploaded people's accounts.
  await models.AcademicPeriod.create({ name: '1st Sem 2026' });
  await models.Department.bulkCreate([{ code: 'SCIS' }, { code: 'SEA' }]);
  await models.UniversityStatement.create({ vision: 'V', mission: 'M', core_values: [], graduate_attributes: [] });
  await models.DepartmentStatement.create({ department_code: 'SCIS', department_name: 'SCIS', vision: 'V', mission: 'M' });
  for (const email of UPLOADED_PEOPLE) {
    await models.UserAccount.create({ email, display_name: email.split('@')[0], roles: ['Dean'], password_hash: 'x', status: 'Active' });
  }
  return models;
}

const scratchUploads = async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fresh-uploads-'));
  await fs.writeFile(path.join(dir, '.gitkeep'), '');
  await fs.writeFile(path.join(dir, 'old-upload.xlsx'), 'x');
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
};

test('fresh start: data tables empty, only admin + six demo logins, no uploaded people', { skip }, async (t) => {
  const models = await scratchModels(t);
  const uploadsDir = await scratchUploads(t);

  const r = await freshStart({ sequelize, models, env: ENV, uploadsDir });

  assert.equal(await models.AcademicPeriod.count(), 0);
  assert.equal(await models.Department.count(), 0);
  assert.equal(await models.UniversityStatement.count(), 0);
  assert.equal(await models.DepartmentStatement.count(), 0);

  const emails = (await models.UserAccount.findAll()).map((a) => a.email).sort();
  assert.deepEqual(emails, [ENV.ADMIN_EMAIL, ...DEMO_ACCOUNTS.map((d) => d.email)].sort());
  for (const email of UPLOADED_PEOPLE) assert.ok(!emails.includes(email), email + ' must have no account');

  // Row counts before the wipe are reported; ids restart at 1.
  const before = Object.fromEntries(r.wiped.map((w) => [w.table, w.rows]));
  assert.equal(before[models.Department.getTableName()], 2);
  assert.equal(before[models.UserAccount.getTableName()], 2);
  assert.equal((await models.Department.create({ code: 'X' })).id, 1);

  assert.deepEqual(r.removedUploads, ['old-upload.xlsx']);
  assert.deepEqual(await fs.readdir(uploadsDir), ['.gitkeep']);
});

test('fresh start --keep-vmgo: the two statements tables survive', { skip }, async (t) => {
  const models = await scratchModels(t);
  const r = await freshStart({ sequelize, models, env: ENV, keepVmgo: true });
  assert.equal(await models.UniversityStatement.count(), 1);
  assert.equal(await models.DepartmentStatement.count(), 1);
  assert.equal(await models.Department.count(), 0);
  assert.equal(r.kept.length, 2);
});

test('fresh start: production refuses and wipes nothing', { skip }, async (t) => {
  const models = await scratchModels(t);
  await assert.rejects(freshStart({ sequelize, models, env: { ...ENV, NODE_ENV: 'production' } }), FreshStartError);
  assert.equal(await models.Department.count(), 2);
  assert.equal(await models.UserAccount.count(), 2);
});

// ---------------------------------------------------------------------------
// The next upload, from nothing

test('next upload: a departments upload creates the Dean\'s account and schedules the invitation', { skip }, async (t) => {
  const email = 'fresh-test-' + process.pid + '@unc.edu.ph';
  const cleanup = async () => {
    await db.AccountInvitation.destroy({ where: { email } });
    await db.UserAccount.destroy({ where: { email } });
  };
  await cleanup();
  t.after(cleanup);

  const summary = await scheduleUploadInvitations({
    entity: 'departments',
    people: [{ name: 'Fresh Test', email, roles: ['Dean'] }],
  });
  assert.deepEqual(summary, { scheduled: 1, waiting: 0, held: 0, skipped: 0, created: 1 });

  const account = await db.UserAccount.findOne({ where: { email } });
  assert.ok(account);
  assert.deepEqual(account.roles, ['Dean']);
  assert.equal(account.must_change_password, true);

  const inv = await db.AccountInvitation.findOne({ where: { user_account_id: account.id } });
  assert.equal(inv.status, 'scheduled');
  assert.equal(inv.source_entity, 'departments');
  assert.ok(inv.send_after > new Date(), 'sent after the undo window, not at once');
});
