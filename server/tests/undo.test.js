/**
 * Undo — who may undo a batch, and what undoing does to the invitations the
 * upload scheduled.
 *
 * Runs against the real database with throw-away accounts (undo-test-<pid>-…)
 * and batch rows under a fake period id, all deleted afterwards. Nothing here
 * restores a snapshot of real data: the permission checks use EXPIRED batches,
 * so an allowed caller is answered 410 (past the permission check) rather than
 * actually rolling anything back. Skipped when the database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import api from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { hashPassword } from '../controllers/authController.js';
import { scheduleUploadInvitations, cancelBatchInvitations, UPLOAD_SEND_DELAY_MS } from '../services/invitations.js';
import { UNDO_WINDOW_MS } from '../utils/importUndo.js';

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const PREFIX = 'undo-test-' + process.pid + '-';
const emailFor = (tag) => PREFIX + tag + '@unc.edu.ph';
const PASSWORD = 'Correct-Horse-9';
// A period id no real term will have; import_batches has no FK on it.
const FAKE_PERIOD = 900000 + (process.pid % 90000);

async function startApi() {
  const app = express();
  app.use(express.json());
  app.use('/api', api);
  app.use(errorHandler);
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  return { server, base: 'http://127.0.0.1:' + server.address().port + '/api' };
}

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
    login: (email) => call('POST', '/auth/login', { email, password: PASSWORD }),
  };
}

const makeAccount = async (tag, roles) => db.UserAccount.create({
  email: emailFor(tag),
  display_name: 'Undo Test ' + tag,
  roles,
  password_hash: await hashPassword(PASSWORD),
  must_change_password: false,
  status: 'Active',
});

const makeBatch = async (creator, { ageMs = 0 } = {}) => {
  const batch = await db.ImportBatch.create({
    entity: 'faculty', action: 'upload', filename: 'undo-test.xlsx', period_id: FAKE_PERIOD,
    snapshot: '{}', status: 'complete', created_by_account_id: creator ? creator.id : null,
  });
  if (ageMs) {
    await sequelize.query('UPDATE import_batches SET created_at = :at WHERE import_batch_id = :id', {
      replacements: { at: new Date(Date.now() - ageMs), id: batch.id }, type: QueryTypes.UPDATE,
    });
    await batch.reload();
  }
  return batch;
};

test('undo', { skip }, async (t) => {
  const { server, base } = await startApi();
  const cleanup = async () => {
    const accounts = await db.UserAccount.findAll({ where: { email: { [Op.like]: PREFIX + '%' } }, attributes: ['id'] });
    await db.AccountInvitation.destroy({
      where: { [Op.or]: [{ email: { [Op.like]: PREFIX + '%' } }, { user_account_id: accounts.map((a) => a.id) }] },
    });
    await db.UserAccount.destroy({ where: { email: { [Op.like]: PREFIX + '%' } } });
    await db.ImportBatch.destroy({ where: { period_id: FAKE_PERIOD } });
  };
  await cleanup();
  t.after(async () => {
    await cleanup();
    await new Promise((r) => server.close(r));
  });

  const dean = await makeAccount('dean', ['Dean', 'Instructor']);
  const head = await makeAccount('head', ['Program Head', 'Instructor']);
  const vpaa = await makeAccount('vpaa', ['VPAA']);
  const asDean = client(base); await asDean.login(dean.email);
  const asHead = client(base); await asHead.login(head.email);
  const asVpaa = client(base); await asVpaa.login(vpaa.email);

  await t.test("a Program Head can't undo a Dean's upload (403); the Dean and the VPAA can", async () => {
    const expired = await makeBatch(dean, { ageMs: UNDO_WINDOW_MS + 60 * 1000 });
    assert.equal((await asHead.post('/imports/' + expired.id + '/undo')).status, 403);
    // Past the permission check: the only thing stopping them is the closed window.
    assert.equal((await asDean.post('/imports/' + expired.id + '/undo')).status, 410);
    assert.equal((await asVpaa.post('/imports/' + expired.id + '/undo')).status, 410);
  });

  await t.test('a batch from before creators were recorded: VPAA only', async () => {
    const legacy = await makeBatch(null, { ageMs: UNDO_WINDOW_MS + 60 * 1000 });
    assert.equal((await asDean.post('/imports/' + legacy.id + '/undo')).status, 403);
    assert.equal((await asVpaa.post('/imports/' + legacy.id + '/undo')).status, 410);
  });

  await t.test('the Undo button (/imports/latest) only offers a batch you may undo', async () => {
    const fresh = await makeBatch(dean);
    const q = '/imports/latest?entity=faculty&period_id=' + FAKE_PERIOD;
    const mine = await asDean.get(q);
    assert.equal(mine.status, 200);
    assert.equal(mine.json.batch.id, fresh.id);
    assert.ok(mine.json.batch.ms_remaining > 0 && mine.json.batch.ms_remaining <= UNDO_WINDOW_MS);
    assert.equal((await asHead.get(q)).json.batch, null);
    assert.equal((await asVpaa.get(q)).json.batch.id, fresh.id);
  });

  await t.test('upload faculty → undo within 30 s → the invitation is cancelled and nothing is sent', async () => {
    const batch = await makeBatch(dean);
    const kristine = emailFor('kristine');
    const scheduled = await scheduleUploadInvitations({
      entity: 'faculty',
      people: [{ name: 'Kristine San Lorenzo', email: kristine, roles: ['Program Head', 'Instructor'] }],
      batchId: batch.id,
      periodId: null,
      senderId: dean.id,
    });
    assert.equal(scheduled.scheduled, 1);
    assert.equal(scheduled.created, 1);

    let inv = await db.AccountInvitation.findOne({ where: { email: kristine } });
    assert.equal(inv.status, 'scheduled');
    // It waits out the undo window, so the worker can't send it yet.
    assert.equal(UPLOAD_SEND_DELAY_MS, UNDO_WINDOW_MS + 10 * 1000);
    assert.ok(new Date(inv.send_after).getTime() - Date.now() > UNDO_WINDOW_MS - 5000);
    assert.ok(await db.UserAccount.findOne({ where: { email: kristine } }));

    const result = await cancelBatchInvitations(batch);
    assert.deepEqual(result, { cancelled: 1, removedAccounts: 1 });

    inv = await db.AccountInvitation.findByPk(inv.id);
    assert.equal(inv.status, 'cancelled');
    assert.equal(inv.sent_at, null);
    assert.equal(inv.token_hash, null);
    // Nothing left for the worker: it only ever claims 'scheduled' rows.
    assert.equal(await db.AccountInvitation.count({ where: { email: kristine, status: 'scheduled' } }), 0);
    // The account the upload created, unused, is gone with it.
    assert.equal(await db.UserAccount.findOne({ where: { email: kristine } }), null);
  });

  await t.test("undo keeps accounts that existed before the upload", async () => {
    const existing = await makeAccount('existing', ['Instructor']);
    await existing.update({ must_change_password: true });
    const batch = await makeBatch(dean);
    await scheduleUploadInvitations({
      entity: 'faculty',
      people: [{ name: existing.display_name, email: existing.email, roles: ['Instructor'] }],
      batchId: batch.id,
      senderId: dean.id,
    });
    const result = await cancelBatchInvitations(batch);
    assert.equal(result.cancelled, 1);
    assert.equal(result.removedAccounts, 0);
    assert.ok(await db.UserAccount.findByPk(existing.id));
  });
});
