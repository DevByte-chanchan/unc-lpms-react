/**
 * Who a notification is from, who gets one, and who may change Program Head.
 *
 * Real database, nothing real touched: throw-away accounts and a scratch CLOSED
 * term. send_after is left in the future and the tick runs with a later `now`,
 * so the running API's own email worker can't pick these rows up first. Mail
 * goes to an in-memory sink. Skipped when the database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import api from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { hashPassword } from '../controllers/authController.js';
import { setMailSinkForTests } from '../services/mailer.js';
import { markDirty, deliverDueNotices, recordTold } from '../services/notices.js';
import { setWritableTermsForTests } from '../utils/latestPeriod.js';

process.env.MAIL_MODE = 'capture';
const sent = [];
setMailSinkForTests(async (message) => { sent.push(message); return { messageId: 'sink-' + sent.length }; });

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const stamp = Date.now();
const PREFIX = 'actor-test-' + stamp + '-';
const emailFor = (tag) => PREFIX + tag + '@unc.edu.ph';
const PASSWORD = 'Correct-Horse-9';
const word = String(stamp).split('').map((d) => 'abcdefghij'[Number(d)]).join('');
const nameFor = (tag) => 'Actor' + tag + ' ' + word + 'son';

function client(base) {
  let cookie = null;
  const call = async (method, p, body) => {
    const headers = {};
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
    post: (p, b) => call('POST', p, b ?? {}),
    patch: (p, b) => call('PATCH', p, b ?? {}),
    del: (p) => call('DELETE', p),
    login: (email) => call('POST', '/auth/login', { email, password: PASSWORD }),
  };
}

test('notification actors and role guards', { skip }, async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api', api);
  app.use(errorHandler);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = 'http://127.0.0.1:' + server.address().port + '/api';

  const period = await db.AcademicPeriod.create({ label: 'Actor test ' + stamp, school_year: '1998-1999', semester: '1', status: 'Closed' });
  const pid = period.id;
  const q = '?period_id=' + pid;
  setWritableTermsForTests([pid]);

  const mk = async (tag, roles) => db.UserAccount.create({
    email: emailFor(tag), display_name: nameFor(tag), roles,
    password_hash: await hashPassword(PASSWORD), must_change_password: false, status: 'Active',
  });
  const fac = (tag) => db.Faculty.create({ name: nameFor(tag), role: 'Instructor', email: emailFor(tag), status: 'Active', period_id: pid });
  const dean = await mk('dean', ['Dean', 'Instructor']);
  const head = await mk('head', ['Program Head', 'Instructor']);
  const vpaa = await mk('vpaa', ['VPAA']);
  const other = await mk('other', ['Instructor']);
  const facHead = await fac('head');
  const facDean = await fac('dean');
  await fac('other');
  const program = await db.Program.create({ code: 'ACT' + String(stamp).slice(-6), name: 'Actor test', status: 'Active', period_id: pid, program_head: nameFor('head'), program_head_id: facHead.id });

  const asDean = client(base); await asDean.login(dean.email);
  const asHead = client(base); await asHead.login(head.email);
  const asVpaa = client(base); await asVpaa.login(vpaa.email);

  t.after(async () => {
    const accounts = await db.UserAccount.findAll({ where: { email: { [Op.like]: PREFIX + '%' } }, attributes: ['id'] });
    const ids = accounts.map((a) => a.id);
    await db.Notification.destroy({ where: { user_account_id: ids } });
    await db.AccountNotice.destroy({ where: { user_account_id: ids } });
    await db.AccountInvitation.destroy({ where: { user_account_id: ids } });
    await db.CourseAssignmentHistory.destroy({ where: { period_id: pid } });
    await db.CourseOfferingAssignment.destroy({ where: { period_id: pid } });
    await db.ImportBatch.destroy({ where: { period_id: pid } });
    await db.Program.destroy({ where: { period_id: pid } });
    await db.Faculty.destroy({ where: { period_id: pid } });
    await db.UserAccount.destroy({ where: { id: ids } });
    await period.destroy();
    setWritableTermsForTests([]);
    setMailSinkForTests(null);
    await new Promise((r) => server.close(r));
  });

  // Past the undo window, as the worker would be, for these accounts only.
  const tick = () => deliverDueNotices({
    now: new Date(Date.now() + 10 * 60 * 1000),
    accountIds: [dean.id, head.id, other.id],
  });
  const bell = (account, kind) => db.Notification.findAll({
    where: { user_account_id: account.id, period_id: pid, ...(kind ? { kind } : {}) }, order: [['id', 'ASC']],
  });
  // These courses aren't in a catalog, which alone would leave the row 'Unassigned'.
  const assign = async (who, code, leadTag) => {
    const res = await who.post('/course-offering-assignments', {
      period_id: pid, program_id: program.id, course_code: code, faculty_name: nameFor(leadTag),
    });
    await db.CourseOfferingAssignment.update({ status: 'Active' }, { where: { period_id: pid, course_code: code } });
    return res;
  };
  // Everyone already knows the roles they start with.
  for (const a of [dean, head, other]) {
    await recordTold(a.id, pid, { roles: a.roles, lead: [], contributor: [], consultant: [] });
  }

  await t.test('a Dean assigns: one notification from the Dean, with a target, and one email', async () => {
    const res = await assign(asDean, 'ACT 101', 'head');
    assert.equal(res.status, 201);
    const mark = sent.length;
    await tick();
    const rows = await bell(head, 'lead_added');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sent_by_account_id, dean.id);
    assert.deepEqual([rows[0].target_type, rows[0].target_id, rows[0].target_program_id], ['assignment', 'ACT 101', program.id]);
    assert.deepEqual(sent.slice(mark).map((m) => [].concat(m.to)), [[head.email]]);

    const list = await asHead.get('/notifications');
    const item = list.json.items.find((i) => i.kind === 'lead_added');
    assert.equal(item.from, dean.display_name);
    assert.deepEqual(item.target, { type: 'assignment', entityId: 'ACT 101', termId: pid, programId: program.id });
    assert.equal(list.json.unread, list.json.total);
  });

  await t.test('assigning yourself: no notification and no email, but it is in the history', async () => {
    const before = (await bell(head)).length;
    const mark = sent.length;
    assert.equal((await assign(asHead, 'ACT 102', 'head')).status, 201);
    await tick();
    assert.equal((await bell(head)).length, before);
    assert.equal(sent.length, mark);
    const log = await db.CourseAssignmentHistory.findOne({ where: { period_id: pid, course_code: 'ACT 102' } });
    assert.equal(log.changed_by_account_id, head.id);
    // Told now, so nothing about it surfaces later.
    await markDirty([head.id], { periodId: pid });
    await tick();
    assert.equal((await bell(head)).length, before);
  });

  await t.test('a mixed burst: only what someone else did, signed by them', async () => {
    const before = (await bell(head)).length;
    const mark = sent.length;
    await assign(asDean, 'ACT 103', 'head');
    await assign(asHead, 'ACT 104', 'head');   // the burst's latest actor is the recipient
    await tick();
    const fresh = (await bell(head)).slice(before);
    assert.deepEqual(fresh.map((n) => [n.target_id, n.sent_by_account_id]), [['ACT 103', dean.id]]);
    const mails = sent.slice(mark);
    assert.equal(mails.length, 1);
    assert.match(mails[0].text, /ACT 103/);
    assert.doesNotMatch(mails[0].text, /ACT 104/);
    assert.match(mails[0].text, new RegExp('— ' + dean.display_name));
  });

  await t.test('old rows naming the recipient as sender show no "from"', async () => {
    const own = await db.Notification.create({ user_account_id: head.id, period_id: pid, kind: 'lead_added', title: 'Old row', sent_by_account_id: head.id });
    const item = (await asHead.get('/notifications?limit=100')).json.items.find((i) => i.id === own.id);
    assert.equal(item.from, null);
    assert.equal(item.target, null);
    await own.destroy();
  });

  await t.test('a later change with no actor is not signed by the previous one', async () => {
    await assign(asDean, 'ACT 105', 'other');
    await tick();
    const row = await db.AccountNotice.findOne({ where: { user_account_id: other.id, period_id: pid } });
    assert.equal(row.sent_by_account_id, dean.id);
    await markDirty([other.id], { periodId: pid });
    await row.reload();
    assert.equal(row.sent_by_account_id, null);
    await tick();
  });

  await t.test('nobody changes their own Program Head role; the Dean and the VPAA can change others', async () => {
    // A Program Head can't reach the routes that grant it at all.
    assert.equal((await asHead.patch('/programs/' + program.id + q, { program_head: '' })).status, 403);
    assert.equal((await asHead.patch('/user-accounts/' + head.id, { roles: ['Instructor'] })).status, 403);

    // A Dean can't make themselves a head, by edit or by create.
    assert.equal((await asDean.patch('/programs/' + program.id + q, { program_head: nameFor('dean') })).status, 403);
    assert.equal((await asDean.post('/programs' + q, { code: 'X' + String(stamp).slice(-6), name: 'X', program_head: nameFor('dean'), period_id: pid })).status, 403);
    await program.reload();
    assert.equal(program.program_head_id, facHead.id, 'unchanged');

    // ... nor step down from a program they head, or delete it.
    await program.update({ program_head: nameFor('dean'), program_head_id: facDean.id });
    assert.equal((await asDean.patch('/programs/' + program.id + q, { program_head: nameFor('head') })).status, 403);
    assert.equal((await asDean.del('/programs/' + program.id + q)).status, 403);
    await program.update({ program_head: nameFor('head'), program_head_id: facHead.id });

    // The VPAA can't change their own, and can change someone else's.
    assert.equal((await asVpaa.patch('/user-accounts/' + vpaa.id, { roles: ['VPAA', 'Program Head'] })).status, 403);
    assert.equal((await asVpaa.patch('/user-accounts/' + other.id, { roles: ['Instructor', 'Program Head'] })).status, 200);
  });

  await t.test('role removed then granted: both listed in time order, each with its actor; /auth/me has the current roles', async () => {
    const asOther = client(base);
    await asOther.login(other.email);
    await db.AccountNotice.update({ dirty: false }, { where: { user_account_id: other.id } });
    await markDirty([other.id], { periodId: pid, senderId: vpaa.id });   // the grant in the test above
    await tick();
    assert.equal((await asVpaa.patch('/user-accounts/' + other.id, { roles: ['Instructor'] })).status, 200);
    await markDirty([other.id], { periodId: pid, senderId: vpaa.id });   // the route queues the active term; this test watches its own
    await tick();
    await db.UserAccount.update({ roles: ['Instructor', 'Program Head'] }, { where: { id: other.id } });
    await markDirty([other.id], { periodId: pid, senderId: dean.id });
    await tick();

    const items = (await asOther.get('/notifications?limit=100')).json.items.filter((i) => i.target && i.target.type === 'role');
    // Newest first.
    assert.deepEqual(items.slice(0, 3).map((i) => [i.kind, i.from]), [
      ['role_added', dean.display_name],
      ['role_removed', vpaa.display_name],
      ['role_added', vpaa.display_name],
    ]);
    const me = await asOther.get('/auth/me');
    assert.ok(me.json.user.roles.includes('Program Head'), 'the current role, not the latest notification');
  });

  await t.test('read and read-all answer with the server count', async () => {
    const list = await asHead.get('/notifications?limit=100');
    const first = list.json.items.find((i) => !i.read_at);
    assert.ok(first);
    const read = await asHead.post('/notifications/' + first.id + '/read');
    assert.equal(read.json.unread, list.json.unread - 1);
    const all = await asHead.post('/notifications/read-all');
    assert.equal(all.json.unread, 0);
    assert.equal((await asHead.get('/notifications/unread-count')).json.unread, 0);
  });
});
