/**
 * Authentication — login, lockout, protection, roles, account management,
 * the email domain rule, and the seed.
 *
 * HTTP tests run the REAL /api router on an ephemeral port against the
 * user_accounts table, using throw-away emails (auth-test-<pid>-…@unc.edu.ph)
 * that are deleted afterwards. The seed tests use a scratch table. Faculty rows
 * for the from-faculty test go into a scratch academic period that is deleted
 * (with its faculty) afterwards. Skipped when the database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import api from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import UserAccountFactory from '../models/userAccount.js';
import { hashPassword, verifyLogin, passwordProblems, MESSAGES } from '../controllers/authController.js';
import { seedUsers, DEMO_ACCOUNTS, RETIRED_DEMO_EMAILS, SeedError } from '../utils/seedUsers.js';
import { ROLES, ROLE_HOMES, isAllowedEmail } from '../utils/roles.js';

const here = path.dirname(fileURLToPath(import.meta.url));

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const PREFIX = 'auth-test-' + process.pid + '-';
const emailFor = (tag) => PREFIX + tag + '@unc.edu.ph';
const PASSWORD = 'Correct-Horse-9';

// ---------------------------------------------------------------------------
// Pure rules (no database)

test('roles: exactly the six, no HR Staff, each with a home route', () => {
  assert.deepEqual([...ROLES].sort(), [
    'Dean', 'Director of Libraries', 'Industry Consultant', 'Instructor', 'Program Head', 'VPAA',
  ]);
  assert.ok(!ROLES.includes('HR Staff'));
  ROLES.forEach((r) => assert.ok(ROLE_HOMES[r], r + ' has a home'));
});

test('email domain: exact domain only, case-insensitive', () => {
  assert.ok(isAllowedEmail('Junar.Danila@UNC.edu.ph'));
  assert.ok(isAllowedEmail('  a.b@unc.edu.ph '));
  assert.ok(!isAllowedEmail('someone@gmail.com'));
  assert.ok(!isAllowedEmail('x@unc.edu.ph.evil.com'));
  assert.ok(!isAllowedEmail('x@sub.unc.edu.ph'));
  assert.ok(!isAllowedEmail('unc.edu.ph'));
  assert.ok(!isAllowedEmail('a@b@unc.edu.ph'));
});

// ---------------------------------------------------------------------------
// HTTP: the real /api router

async function startApi() {
  const app = express();
  app.use(express.json());
  app.use('/api', api);
  app.use(errorHandler);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { server, base: 'http://127.0.0.1:' + server.address().port + '/api' };
}

/** A tiny cookie-jar client: one per signed-in user. */
function client(base) {
  let cookie = null;
  const call = async (method, p, body) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) {
      const pair = set.split(';')[0];
      cookie = pair.endsWith('=') ? null : pair;
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text, setCookie: set };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b ?? {}),
    patch: (p, b) => call('PATCH', p, b ?? {}),
    login: (email, password = PASSWORD) => call('POST', '/auth/login', { email, password }),
    get cookie() { return cookie; },
  };
}

async function makeAccount(tag, roles, extra = {}) {
  return db.UserAccount.create({
    email: emailFor(tag),
    display_name: 'Auth Test ' + tag,
    roles,
    password_hash: await hashPassword(PASSWORD),
    must_change_password: false,
    status: 'Active',
    ...extra,
  });
}

test('auth over HTTP', { skip }, async (t) => {
  await db.UserAccount.sync();
  const { server, base } = await startApi();
  const cleanup = async () => {
    await db.UserAccount.destroy({ where: { email: { [Op.like]: PREFIX + '%' } } });
  };
  await cleanup();
  t.after(async () => {
    await cleanup();
    await new Promise((r) => server.close(r));
  });

  const vpaa = await makeAccount('vpaa', ['VPAA']);
  const head = await makeAccount('head', ['Program Head', 'Instructor']);

  await t.test('public: /health and /auth/login work without a cookie', async () => {
    const c = client(base);
    assert.equal((await c.get('/health')).status, 200);
    assert.equal((await c.login(emailFor('nobody'), 'x')).status, 401);   // reached the handler
  });

  await t.test('everything else is 401 without a cookie', async () => {
    const c = client(base);
    const routes = [
      ['GET', '/auth/me'], ['POST', '/auth/logout'], ['POST', '/auth/change-password'],
      ['GET', '/academic-periods'], ['GET', '/departments'], ['GET', '/faculty'], ['GET', '/programs'],
      ['GET', '/courses'], ['GET', '/industry-consultants'], ['GET', '/course-offering-assignments'],
      ['GET', '/archive'], ['GET', '/imports/latest'], ['GET', '/university-statements/current'],
      ['GET', '/department-statements/all'], ['GET', '/user-accounts'], ['POST', '/faculty/upload'],
      ['POST', '/user-accounts'], ['PATCH', '/departments/1'],
    ];
    for (const [method, p] of routes) {
      const r = method === 'GET' ? await c.get(p) : method === 'POST' ? await c.post(p) : await c.patch(p);
      assert.equal(r.status, 401, method + ' ' + p);
    }
  });

  await t.test('login: right password → 200 + httpOnly cookie; wrong password and unknown email → same 401', async () => {
    const c = client(base);
    const ok = await c.login(vpaa.email);
    assert.equal(ok.status, 200);
    assert.match(ok.setCookie, /^lpms_session=/);
    assert.match(ok.setCookie, /HttpOnly/i);
    assert.match(ok.setCookie, /SameSite=Lax/i);
    assert.equal(ok.json.user.email, vpaa.email);
    assert.deepEqual(ok.json.user.roles, ['VPAA']);

    const wrong = await client(base).login(head.email, 'not-it-at-all');
    const unknown = await client(base).login(emailFor('ghost'), PASSWORD);
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.json, unknown.json);
    assert.equal(wrong.json.message, MESSAGES.badLogin);
    await db.UserAccount.update({ failed_attempts: 0 }, { where: { id: head.id } });

    const meRes = await c.get('/auth/me');
    assert.equal(meRes.status, 200);
    assert.deepEqual(Object.keys(meRes.json.user).sort(),
      ['consultantId', 'display_name', 'email', 'facultyId', 'id', 'must_change_password', 'roles']);
  });

  await t.test('the email is matched case-insensitively and trimmed', async () => {
    assert.equal((await client(base).login('  ' + vpaa.email.toUpperCase() + ' ')).status, 200);
  });

  await t.test('domain: a non-UNC email → 400 with the domain message, and no lockout count', async () => {
    const r = await client(base).login('someone@gmail.com', 'whatever');
    assert.equal(r.status, 400);
    assert.equal(r.json.message, 'Use your @unc.edu.ph email address.');
    const acct = await makeAccount('dom', ['Instructor']);
    for (let i = 0; i < 6; i += 1) await client(base).login(acct.email.replace('@unc.edu.ph', '@gmail.com'), 'x');
    await acct.reload();
    assert.equal(acct.failed_attempts, 0);
    assert.equal((await client(base).login(acct.email)).status, 200);
  });

  await t.test('lockout: 5 failures lock; the 6th attempt is 423 even with the right password; works after the lock passes', async () => {
    const acct = await makeAccount('lock', ['Instructor']);
    const statuses = [];
    for (let i = 0; i < 5; i += 1) statuses.push((await client(base).login(acct.email, 'wrong-' + i)).status);
    assert.deepEqual(statuses, [401, 401, 401, 401, 423]);
    const sixth = await client(base).login(acct.email, 'wrong-again');
    assert.equal(sixth.status, 423);
    assert.equal(sixth.json.message, 'Too many attempts. Try again in 15 minutes.');
    assert.equal((await client(base).login(acct.email)).status, 423);

    await acct.reload();
    assert.ok(new Date(acct.locked_until) > new Date());
    await acct.update({ locked_until: new Date(Date.now() - 1000) });
    assert.equal((await client(base).login(acct.email)).status, 200);
    await acct.reload();
    assert.equal(acct.failed_attempts, 0);
    assert.equal(acct.locked_until, null);
  });

  await t.test('a successful login resets the failure count', async () => {
    const acct = await makeAccount('reset', ['Instructor']);
    for (let i = 0; i < 3; i += 1) await client(base).login(acct.email, 'nope-' + i);
    assert.equal((await client(base).login(acct.email)).status, 200);
    await acct.reload();
    assert.equal(acct.failed_attempts, 0);
  });

  await t.test('disabled: an account disabled after login gets 401 on its next request, and cannot log in', async () => {
    const acct = await makeAccount('dis', ['Instructor']);
    const c = client(base);
    assert.equal((await c.login(acct.email)).status, 200);
    assert.equal((await c.get('/auth/me')).status, 200);
    await acct.update({ status: 'Disabled' });
    assert.equal((await c.get('/auth/me')).status, 401);
    const again = await client(base).login(acct.email);
    assert.equal(again.status, 401);
    assert.equal(again.json.message, MESSAGES.badLogin);
  });

  await t.test('roles: a Program Head calling a Dean-only write gets 403; reads are open', async () => {
    const c = client(base);
    await c.login(head.email);
    const w = await c.post('/faculty', { name: 'X', role: 'Instructor' });
    assert.equal(w.status, 403);
    assert.equal(w.json.message, "You don't have access to this.");
    assert.equal((await c.post('/department-statements', {})).status, 403);
    assert.equal((await c.patch('/departments/1', {})).status, 403);
    assert.equal((await c.get('/user-accounts')).status, 403);
    assert.equal((await c.get('/academic-periods')).status, 200);
  });

  await t.test('forced change: must_change_password blocks nothing server-side; /auth/me reports it; change clears it', async () => {
    const acct = await makeAccount('force', ['Instructor'], { must_change_password: true });
    const c = client(base);
    const li = await c.login(acct.email);
    assert.equal(li.json.user.must_change_password, true);
    assert.equal((await c.get('/academic-periods')).status, 200);
    assert.equal((await c.get('/auth/me')).json.user.must_change_password, true);

    assert.equal((await c.post('/auth/change-password', { current_password: 'wrong', new_password: 'Brand-New-123' })).status, 400);
    assert.equal((await c.post('/auth/change-password', { current_password: PASSWORD, new_password: 'short' })).status, 400);
    assert.equal((await c.post('/auth/change-password', { current_password: PASSWORD, new_password: acct.email })).status, 400);
    assert.equal((await c.post('/auth/change-password', { current_password: PASSWORD, new_password: PASSWORD })).status, 400);
    const ok = await c.post('/auth/change-password', { current_password: PASSWORD, new_password: 'Brand-New-123' });
    assert.equal(ok.status, 200);
    assert.match(ok.setCookie, /^lpms_session=/);
    assert.equal(ok.json.user.must_change_password, false);
    assert.equal((await client(base).login(acct.email, 'Brand-New-123')).status, 200);
    assert.equal((await client(base).login(acct.email, PASSWORD)).status, 401);
  });

  await t.test('logout clears the cookie', async () => {
    const c = client(base);
    await c.login(vpaa.email);
    const out = await c.post('/auth/logout');
    assert.equal(out.status, 204);
    assert.equal(c.cookie, null);
    assert.equal((await c.get('/auth/me')).status, 401);
  });

  await t.test('user accounts: create / domain / roles / patch / reset — never the hash', async () => {
    const admin = client(base);
    await admin.login(vpaa.email);
    const bodies = [];

    const list = await admin.get('/user-accounts');
    assert.equal(list.status, 200);
    bodies.push(list.text);

    for (const bad of ['x@unc.edu.ph.evil.com', 'x@sub.unc.edu.ph', 'x@gmail.com']) {
      const r = await admin.post('/user-accounts', { email: bad, display_name: 'Bad', roles: ['Instructor'] });
      assert.equal(r.status, 400, bad);
      assert.equal(r.json.message, 'Use your @unc.edu.ph email address.');
    }
    assert.equal((await admin.post('/user-accounts', { email: emailFor('hr'), display_name: 'HR', roles: ['HR Staff'] })).status, 400);
    assert.equal((await admin.post('/user-accounts', { email: emailFor('none'), display_name: 'None', roles: [] })).status, 400);

    const made = await admin.post('/user-accounts', { email: emailFor('new'), display_name: 'New Person', roles: ['Dean'] });
    assert.equal(made.status, 201);
    bodies.push(made.text);
    assert.ok(made.json.temp_password.length >= 8);
    assert.equal(made.json.account.must_change_password, true);
    assert.equal((await admin.post('/user-accounts', { email: emailFor('new'), display_name: 'Again', roles: ['Dean'] })).status, 409);

    const newbie = client(base);
    const first = await newbie.login(emailFor('new'), made.json.temp_password);
    assert.equal(first.status, 200);
    bodies.push(first.text, (await newbie.get('/auth/me')).text);
    assert.equal(first.json.user.must_change_password, true);

    const id = made.json.account.id;
    assert.equal((await admin.patch('/user-accounts/' + id, { email: 'y@unc.edu.ph.evil.com' })).status, 400);
    assert.equal((await admin.patch('/user-accounts/' + id, { roles: ['HR Staff'] })).status, 400);
    const patched = await admin.patch('/user-accounts/' + id, { roles: ['Dean', 'Instructor'], display_name: 'New P.' });
    assert.equal(patched.status, 200);
    assert.deepEqual(patched.json.roles, ['Instructor', 'Dean']);
    bodies.push(patched.text);

    const reset = await admin.post('/user-accounts/' + id + '/reset-password');
    assert.equal(reset.status, 200);
    bodies.push(reset.text);
    assert.notEqual(reset.json.temp_password, made.json.temp_password);
    assert.equal((await client(base).login(emailFor('new'), made.json.temp_password)).status, 401);
    assert.equal((await client(base).login(emailFor('new'), reset.json.temp_password)).status, 200);

    // An admin can't lock themselves out.
    assert.equal((await admin.patch('/user-accounts/' + vpaa.id, { roles: ['Dean'] })).status, 400);
    assert.equal((await admin.patch('/user-accounts/' + vpaa.id, { status: 'Disabled' })).status, 400);

    bodies.forEach((b) => {
      assert.ok(!/password_hash/.test(b), 'no password_hash in a response');
      assert.ok(!/\$2[aby]\$/.test(b), 'no bcrypt hash in a response');
    });
  });

  await t.test('from-faculty: creates for Active faculty with UNC emails; skips the rest with reasons', async () => {
    const period = await db.AcademicPeriod.create({
      label: 'Auth test ' + process.pid, school_year: '1999-2000', semester: '1', status: 'Closed',
    });
    t.after(async () => {
      await db.Faculty.destroy({ where: { period_id: period.id } });
      await period.destroy();
    });
    const F = (name, role, email, status = 'Active') => db.Faculty.create({ name, role, email, status, period_id: period.id });
    await F('Head Person', 'Program Head', emailFor('fhead'));
    await F('Dean Person', 'Dean', emailFor('fdean'));
    await F('Plain Person', 'Professor', emailFor('fplain'));
    await F('Gmail Person', 'Instructor', 'gmail.person@gmail.com');
    await F('No Email', 'Instructor', null);
    await F('Has Account', 'Instructor', vpaa.email.toUpperCase());
    await F('Gone Person', 'Instructor', emailFor('fgone'), 'Inactive');

    const admin = client(base);
    await admin.login(vpaa.email);
    const r = await admin.post('/user-accounts/from-faculty', { period_id: period.id });
    assert.equal(r.status, 201);
    assert.ok(!/password_hash/.test(r.text));
    const byEmail = Object.fromEntries(r.json.created.map((c) => [c.email, c]));
    assert.deepEqual(Object.keys(byEmail).sort(), [emailFor('fdean'), emailFor('fhead'), emailFor('fplain')].sort());
    assert.deepEqual(byEmail[emailFor('fhead')].roles, ['Program Head', 'Instructor']);
    assert.deepEqual(byEmail[emailFor('fdean')].roles, ['Dean']);
    assert.deepEqual(byEmail[emailFor('fplain')].roles, ['Instructor']);
    r.json.created.forEach((c) => assert.ok(c.temp_password.length >= 8));

    const reasons = Object.fromEntries(r.json.skipped.map((s) => [s.name, s.reason]));
    assert.match(reasons['Gmail Person'], /not a UNC address/);
    assert.match(reasons['No Email'], /No email/);
    assert.match(reasons['Has Account'], /Already has an account/);
    assert.ok(!('Gone Person' in reasons));

    // Running it again creates nothing.
    const again = await admin.post('/user-accounts/from-faculty', { period_id: period.id });
    assert.equal(again.status, 200);
    assert.equal(again.json.created.length, 0);

    // A created account links to its faculty row by email for that period.
    const fac = client(base);
    await fac.login(emailFor('fhead'), byEmail[emailFor('fhead')].temp_password);
    const me = await fac.get('/auth/me?period_id=' + period.id);
    const row = await db.Faculty.findOne({ where: { period_id: period.id, name: 'Head Person' } });
    assert.equal(me.json.user.facultyId, row.id);
  });
});

// ---------------------------------------------------------------------------
// Seed, on a scratch table

const SEED_ENV = {
  NODE_ENV: 'development',
  ADMIN_EMAIL: 'seed.admin@unc.edu.ph',
  ADMIN_PASSWORD: 'Admin-Pass-1',
};

const FINAL_DEMO = {
  'monica.norton@unc.edu.ph':   ['Monica Norton',   ['Instructor'],                 'Instructor@2026',  '/'],
  'olivia.vance@unc.edu.ph':    ['Olivia Vance',    ['Program Head', 'Instructor'], 'ProgramHead@2026', '/role/program-head/course-offerings?page=Course%20Offerings'],
  'maria.santos@unc.edu.ph':    ['Maria Santos',    ['Director of Libraries'],      'Library@2026',     '/role/director-of-libraries/approval-course-table'],
  'roberto.cruz@unc.edu.ph':    ['Roberto Cruz',    ['Industry Consultant'],        'Consultant@2026',  '/role/industry-consultant/approval-course-table'],
  'sophia.sterling@unc.edu.ph': ['Sophia Sterling', ['Dean'],                       'Dean@2026',        '/role/dean?page=Faculty'],
  'carlos.garcia@unc.edu.ph':   ['Carlos Garcia',   ['VPAA'],                       'Vpaa@2026',        '/role/ovpaa'],
};

let scratchN = 0;
async function scratchModel(t) {
  scratchN += 1;
  const Model = UserAccountFactory(sequelize, DataTypes, {
    modelName: 'UserAccountSeedTest' + scratchN,
    tableName: 'user_accounts_test_' + process.pid + '_' + scratchN,
  });
  await Model.sync({ force: true });
  t.after(async () => { await Model.drop(); });
  return Model;
}

const rawRow = (Model, email) => Model.scope('withHash').findOne({ where: { email }, raw: true });

test('demo list: the six final accounts, each with its own password that passes the rules', () => {
  assert.deepEqual(DEMO_ACCOUNTS.map((d) => d.email).sort(), Object.keys(FINAL_DEMO).sort());
  for (const d of DEMO_ACCOUNTS) {
    const [name, roles, password] = FINAL_DEMO[d.email];
    assert.equal(d.display_name, name);
    assert.deepEqual([...d.roles], roles);
    assert.equal(d.password, password);
    assert.deepEqual(passwordProblems(d.password, { email: d.email }), [], d.email);
  }
  assert.equal(new Set(DEMO_ACCOUNTS.map((d) => d.password)).size, DEMO_ACCOUNTS.length, 'no shared passwords');
  assert.deepEqual([...RETIRED_DEMO_EMAILS], ['junar.danila@unc.edu.ph', 'agnes.reyes@unc.edu.ph']);
});

test('seed: fresh dev database — admin + the six, each signs in with its own password only', { skip }, async (t) => {
  const Model = await scratchModel(t);

  await assert.rejects(seedUsers({ Model, env: { ...SEED_ENV, ADMIN_EMAIL: 'admin@gmail.com' } }), SeedError);
  await assert.rejects(seedUsers({ Model, env: { ...SEED_ENV, ADMIN_EMAIL: 'admin@unc.edu.ph.evil.com' } }), SeedError);
  assert.equal(await Model.count(), 0, 'a refused seed creates nothing');

  const first = await seedUsers({ Model, env: { ...SEED_ENV, DEV_SEED_PASSWORD: 'Old-Shared-1' } });
  assert.deepEqual(first.created.map((c) => c.email).sort(), ['seed.admin@unc.edu.ph', ...Object.keys(FINAL_DEMO)].sort());
  assert.ok(first.notes.some((n) => /DEV_SEED_PASSWORD is no longer used/.test(n)));

  const second = await seedUsers({ Model, env: SEED_ENV });
  assert.equal(second.created.length, 0);
  assert.equal(await Model.count(), 7);

  const emails = Object.keys(FINAL_DEMO);
  for (const [i, email] of emails.entries()) {
    const [name, roles, password, home] = FINAL_DEMO[email];
    const r = await verifyLogin(Model, email, password);
    assert.equal(r.status, 200, email);
    assert.equal(r.account.display_name, name);
    assert.deepEqual(r.account.roles, roles);
    assert.equal(r.account.must_change_password, false);
    assert.equal(ROLE_HOMES[r.account.roles[0]], home);
    // Another account's password doesn't work, nor does the old shared one.
    const other = FINAL_DEMO[emails[(i + 1) % emails.length]][2];
    assert.equal((await verifyLogin(Model, email, other)).status, 401, email + ' with another password');
    assert.equal((await verifyLogin(Model, email, 'Old-Shared-1')).status, 401);
    await Model.update({ failed_attempts: 0 }, { where: { email } });
  }
  const admin = await verifyLogin(Model, 'seed.admin@unc.edu.ph', 'Admin-Pass-1');
  assert.equal(admin.status, 200);
  assert.deepEqual(admin.account.roles, ['VPAA']);
  assert.equal(admin.account.must_change_password, true);
});

/** An old database: the previous demo set (shared password) plus a non-demo account. */
async function oldDatabase(Model) {
  const oldHash = await hashPassword('LpmsDemo2026');
  const mk = (email, display_name, roles, extra = {}) => Model.create({
    email, display_name, roles, password_hash: oldHash, must_change_password: false, status: 'Active', ...extra,
  });
  await mk('monica.norton@unc.edu.ph', 'Monica N.', ['Instructor'], { failed_attempts: 5, locked_until: new Date(Date.now() + 600000) });
  await mk('maria.santos@unc.edu.ph', 'Maria Santos', ['Director of Libraries'], { status: 'Disabled' });
  await mk('roberto.cruz@unc.edu.ph', 'Roberto Cruz', ['Industry Consultant']);
  await mk('carlos.garcia@unc.edu.ph', 'Carlos Garcia', ['VPAA'], { must_change_password: true });
  await mk('junar.danila@unc.edu.ph', 'Junar Danila', ['Program Head', 'Instructor']);                      // never signed in
  await mk('agnes.reyes@unc.edu.ph', 'Agnes Reyes', ['Dean'], { last_login_at: new Date('2026-10-01') });  // has signed in
  await mk('someone.else@unc.edu.ph', 'Someone Else', ['Instructor', 'Dean']);                              // not a demo account
  await Model.create({
    email: SEED_ENV.ADMIN_EMAIL, display_name: 'The Admin', roles: ['VPAA'],
    password_hash: await hashPassword('Admin-Changed-9'), must_change_password: false, status: 'Active',
  });
}

test('seed: old database, plain seed — retired and existing accounts are left exactly as they were', { skip }, async (t) => {
  const Model = await scratchModel(t);
  await oldDatabase(Model);
  const before = await Model.scope('withHash').findAll({ raw: true, order: [['id', 'ASC']] });

  const res = await seedUsers({ Model, env: SEED_ENV });
  assert.deepEqual(res.created.map((c) => c.email).sort(), ['olivia.vance@unc.edu.ph', 'sophia.sterling@unc.edu.ph']);
  assert.equal(res.demo.length, 0);

  const after = await Model.scope('withHash').findAll({ raw: true, order: [['id', 'ASC']] });
  assert.deepEqual(after.slice(0, before.length), before, 'every pre-existing row unchanged');
});

test('seed: old database, resetDemo — demo accounts reset, retired ones deleted or disabled, nothing else touched', { skip }, async (t) => {
  const Model = await scratchModel(t);
  await oldDatabase(Model);
  const otherBefore = await rawRow(Model, 'someone.else@unc.edu.ph');
  const adminBefore = await rawRow(Model, SEED_ENV.ADMIN_EMAIL);

  const res = await seedUsers({ Model, env: SEED_ENV, resetDemo: true });
  const action = Object.fromEntries(res.demo.map((r) => [r.email, r.action]));
  assert.deepEqual(action, {
    'monica.norton@unc.edu.ph': 'updated',
    'olivia.vance@unc.edu.ph': 'created',
    'maria.santos@unc.edu.ph': 'updated',
    'roberto.cruz@unc.edu.ph': 'updated',
    'sophia.sterling@unc.edu.ph': 'created',
    'carlos.garcia@unc.edu.ph': 'updated',
    'junar.danila@unc.edu.ph': 'deleted',
    'agnes.reyes@unc.edu.ph': 'disabled',
  });
  res.demo.filter((r) => !['deleted', 'disabled'].includes(r.action))
    .forEach((r) => assert.equal(r.password, FINAL_DEMO[r.email][2]));

  // Retired: the never-used one is gone; the used one is kept but can't sign in.
  assert.equal(await Model.findOne({ where: { email: 'junar.danila@unc.edu.ph' } }), null);
  const agnes = await Model.findOne({ where: { email: 'agnes.reyes@unc.edu.ph' } });
  assert.equal(agnes.status, 'Disabled');
  assert.equal((await verifyLogin(Model, 'agnes.reyes@unc.edu.ph', 'LpmsDemo2026')).status, 401);

  // Every demo account: final name/roles, its own password, unlocked, Active, no forced change.
  for (const [email, [name, roles, password]] of Object.entries(FINAL_DEMO)) {
    const row = await rawRow(Model, email);
    assert.equal(row.display_name, name);
    assert.deepEqual(row.roles, roles);
    assert.equal(row.status, 'Active');
    assert.ok(!row.must_change_password);
    assert.equal(row.failed_attempts, 0);
    assert.equal(row.locked_until, null);
    assert.equal((await verifyLogin(Model, email, 'LpmsDemo2026')).status, 401, email + ' old password');
    assert.equal((await verifyLogin(Model, email, password)).status, 200, email + ' new password');
  }

  // The non-demo account and the admin: unchanged, hash and all.
  assert.deepEqual(await rawRow(Model, 'someone.else@unc.edu.ph'), otherBefore);
  assert.deepEqual(await rawRow(Model, SEED_ENV.ADMIN_EMAIL), adminBefore);

  // Running it again: the six 'updated', the kept retired one disabled again, nothing created.
  const again = await seedUsers({ Model, env: SEED_ENV, resetDemo: true });
  assert.deepEqual(again.demo.map((r) => r.action).sort(), ['disabled', ...Array(6).fill('updated')].sort());
});

test('seed: production — resetDemo refuses, the plain seed creates only the admin', { skip }, async (t) => {
  const Model = await scratchModel(t);
  const prodEnv = { ...SEED_ENV, NODE_ENV: 'production' };
  await assert.rejects(seedUsers({ Model, env: prodEnv, resetDemo: true }), /development only/);
  assert.equal(await Model.count(), 0);
  const prod = await seedUsers({ Model, env: prodEnv });
  assert.deepEqual(prod.created.map((c) => c.email), ['seed.admin@unc.edu.ph']);
  assert.equal(prod.demo.length, 0);
});

test('seed: the result never carries a hash', { skip }, async (t) => {
  const Model = await scratchModel(t);
  await oldDatabase(Model);
  const out = JSON.stringify([
    await seedUsers({ Model, env: SEED_ENV }),
    await seedUsers({ Model, env: SEED_ENV, resetDemo: true }),
  ]);
  assert.ok(!/password_hash/.test(out));
  assert.ok(!/\$2[aby]\$\d\d\$/.test(out));
});

test('seed CLI fails fast with a non-UNC ADMIN_EMAIL', { skip }, () => {
  const r = spawnSync(process.execPath, [path.join(here, '..', 'scripts', 'seedUsers.js')], {
    cwd: path.join(here, '..'),
    env: { ...process.env, ADMIN_EMAIL: 'admin@gmail.com', ADMIN_PASSWORD: 'whatever-123' },
    encoding: 'utf8',
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ADMIN_EMAIL must be set to a UNC address/);
});

test.after(async () => { if (reachable) await sequelize.close(); });
