/**
 * Invite now / Resend for Deans (Department List, VPAA) and Industry
 * Consultants (Program Head): the email goes out, the Access cell says
 * "Invitation sent", the 6th try in an hour is refused, a non-UNC Dean Email
 * is held, and each route is closed to the other role.
 *
 * Real tables, a scratch term made writable for the test, throw-away accounts
 * (inv-test-<pid>-…@unc.edu.ph). Mail goes to the mailer's test sink
 * (MAIL_MODE=capture): nothing leaves the machine. Skipped when the database
 * isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import api from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { hashPassword } from '../controllers/authController.js';
import { setMailSinkForTests } from '../services/mailer.js';
import { setWritableTermsForTests } from '../utils/latestPeriod.js';

process.env.MAIL_MODE = 'capture';

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const PREFIX = 'inv-test-' + process.pid + '-';
const PASSWORD = 'Correct-Horse-9';
// Names unique to this run, letters only (names are matched by words).
const SUFFIX = String(process.pid).split('').map((d) => 'abcdefghij'[d]).join('');
const nameFor = (first) => first + ' Invt' + SUFFIX;
const emailFor = (first) => PREFIX + first.toLowerCase() + '@unc.edu.ph';

function client(base) {
  let cookie = null;
  const call = async (method, p, body) => {
    const headers = { connection: 'close' };
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0]; cookie = pair.endsWith('=') ? null : pair; }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json };
  };
  return {
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b),
    patch: (p, b) => call('PATCH', p, b),
    login: (email) => call('POST', '/auth/login', { email, password: PASSWORD }),
  };
}

test('Invite now / Resend: Deans and Industry Consultants', { skip }, async (t) => {
  const sent = [];
  setMailSinkForTests(async (m) => { sent.push(m); return { messageId: 'sink-' + sent.length }; });
  const inbox = (email) => sent.filter((m) => (Array.isArray(m.to) ? m.to : [m.to]).map((s) => String(s).toLowerCase()).includes(email));

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', api);
  app.use(errorHandler);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = 'http://127.0.0.1:' + server.address().port + '/api';

  const period = await db.AcademicPeriod.create({ label: 'INV test ' + process.pid, school_year: '1998-1999', semester: '1', status: 'Closed' });
  setWritableTermsForTests([period.id]);
  const cleanup = async () => {
    const accounts = await db.UserAccount.findAll({ where: { email: { [Op.like]: PREFIX + '%' } }, attributes: ['id'] });
    const ids = accounts.map((a) => a.id);
    await db.AccountInvitation.destroy({ where: { [Op.or]: [{ user_account_id: ids }, { period_id: period.id }] } });
    await db.Department.destroy({ where: { period_id: period.id } });
    await db.IndustryConsultant.destroy({ where: { period_id: period.id } });
    await db.UserAccount.destroy({ where: { id: ids } });
    await db.AcademicPeriod.destroy({ where: { id: period.id } });
  };
  t.after(async () => {
    await cleanup();
    setWritableTermsForTests([]);
    setMailSinkForTests(null);
    await new Promise((r) => server.close(r));
  });

  const account = async (first, roles, extra = {}) => db.UserAccount.create({
    email: emailFor(first), display_name: nameFor(first), roles,
    password_hash: await hashPassword(PASSWORD), must_change_password: false, status: 'Active', ...extra,
  });
  const vpaa = await account('Vpaa', ['VPAA']);
  const head = await account('Head', ['Program Head', 'Instructor']);
  const asVpaa = client(base); assert.equal((await asVpaa.login(vpaa.email)).status, 200);
  const asHead = client(base); assert.equal((await asHead.login(head.email)).status, 200);

  // A Dean with a UNC Dean Email and no account yet; one with a Gmail address.
  const deanEmail = emailFor('Dean');
  const dept = await db.Department.create({ name: 'Invite Test School ' + SUFFIX, code: 'IT' + process.pid % 10000, dean: nameFor('Dean'), dean_email: deanEmail, status: 'Active', period_id: period.id });
  const gmail = await db.Department.create({ name: 'Invite Test Gmail ' + SUFFIX, code: 'IG' + process.pid % 10000, dean: nameFor('Gmail'), dean_email: 'someone@gmail.com', status: 'Active', period_id: period.id });

  const deptRow = async (id) => (await asVpaa.get('/departments?period_id=' + period.id)).json.find((d) => d.id === id);

  await t.test('Department List: Access column, Invite now, "Invitation sent"', async () => {
    const before = await deptRow(dept.id);
    assert.equal(before.dean_email, deanEmail);
    assert.equal(before.access.status, 'none', 'no account before the first invite');
    const r = await asVpaa.post('/departments/' + dept.id + '/invite-dean');
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.match(r.json.message, /Invitation sent to /);
    assert.equal(inbox(deanEmail).length, 1, 'one email to the Dean');
    const created = await db.UserAccount.findOne({ where: { email: deanEmail } });
    assert.ok(created && created.roles.includes('Dean'), 'account made with the Dean role');
    const after = await deptRow(dept.id);
    assert.equal(after.access.status, 'sent');
    assert.equal(after.access.label, 'Invitation sent');
  });

  await t.test('Dean: Resend up to 5 an hour, the 6th is refused', async () => {
    for (let i = 2; i <= 5; i += 1) {
      const r = await asVpaa.post('/departments/' + dept.id + '/invite-dean');
      assert.equal(r.status, 200, 'try ' + i + ': ' + JSON.stringify(r.json));
    }
    assert.equal(inbox(deanEmail).length, 5);
    const sixth = await asVpaa.post('/departments/' + dept.id + '/invite-dean');
    assert.equal(sixth.status, 429);
    assert.match(sixth.json.message, /At most 5 invitations an hour/);
    assert.equal(inbox(deanEmail).length, 5, 'nothing sent on the 6th');
  });

  await t.test('Dean with no UNC email: Held, nothing sent', async () => {
    const mark = sent.length;
    const r = await asVpaa.post('/departments/' + gmail.id + '/invite-dean');
    assert.equal(r.status, 400);
    assert.match(r.json.message, /^Held: /);
    assert.equal(sent.length, mark);
  });

  await t.test('Dean route is VPAA only; the term rule applies', async () => {
    assert.equal((await asHead.post('/departments/' + dept.id + '/invite-dean')).status, 403);
    setWritableTermsForTests([]);
    try {
      assert.equal((await asVpaa.post('/departments/' + dept.id + '/invite-dean')).status, 403, 'a past term is read-only');
    } finally {
      setWritableTermsForTests([period.id]);
    }
  });

  await t.test('Industry Consultant: Invite now sends; VPAA gets 403', async () => {
    const ic = await account('Consult', ['Industry Consultant'], { must_change_password: true });
    const row = await db.IndustryConsultant.create({ name: nameFor('Consult'), period_id: period.id, status: 'Active' });
    assert.equal((await asVpaa.post('/industry-consultants/' + row.id + '/invite')).status, 403);
    const r = await asHead.post('/industry-consultants/' + row.id + '/invite');
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(inbox(ic.email).length, 1);
    const list = (await asHead.get('/industry-consultants?period_id=' + period.id)).json;
    const mine = (Array.isArray(list) ? list : list.rows || []).find((c) => c.id === row.id);
    assert.equal(mine.access.label, 'Invitation sent');
  });
});
