/**
 * Where roles come from: the faculty sheet gives Instructor only, the programs
 * list gives Program Head, the departments list gives Dean.
 *
 * Runs against the real tables inside a scratch academic period, with
 * throw-away accounts (pha-test-<pid>-…@unc.edu.ph); everything is deleted
 * afterwards. Nothing is emailed from the sync itself: granting a role hands
 * the account to the notice worker (services/notices.js), which is covered in
 * notices.test.js. Skipped when the database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import { rolesForFacultyRow, scheduleUploadInvitations, describeRoles } from '../services/invitations.js';
import { syncProgramHeadRoles, headsOf, unmatchedHeadMessage } from '../services/programHeadAccess.js';
import { updateEmail } from '../templates/updateEmail.js';

process.env.MAIL_MODE = 'capture';

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const PREFIX = 'pha-test-' + process.pid + '-';
const emailFor = (tag) => PREFIX + tag + '@unc.edu.ph';

// ---------------------------------------------------------------------------
// No database

test('faculty Role column grants Instructor only — never Program Head or Dean', () => {
  assert.deepEqual(rolesForFacultyRow('Program Head'), ['Instructor']);
  assert.deepEqual(rolesForFacultyRow('Dean'), ['Instructor']);
  assert.deepEqual(rolesForFacultyRow('Associate Professor'), ['Instructor']);
  assert.deepEqual(rolesForFacultyRow(undefined), ['Instructor']);
});

test('update email for a new role: subject, role line, sign-in link, uploader signature, no token', () => {
  const m = updateEmail({
    name: 'Kristine San Lorenzo',
    rolesAdded: ['Program Head (BSIT)'],
    link: 'http://localhost:5173/login',
    sender: { name: 'Edrian Lait', title: 'Dean, School of Computer & Information Sciences' },
  });
  assert.equal(m.subject, 'Your LPMS access has changed');
  assert.match(m.text, /Edrian Lait has given you the Program Head \(BSIT\) role\./);
  assert.match(m.text, /Sign in: http:\/\/localhost:5173\/login/);
  assert.match(m.text, /— Edrian Lait\nDean, School of Computer & Information Sciences/);
  assert.match(m.html, /<strong[^>]*>Program Head \(BSIT\)<\/strong>/);
  assert.doesNotMatch(m.text + m.html, /token=/);
});

test('unmatched head message', () => {
  assert.equal(unmatchedHeadMessage('Kristine San Lorenzo'),
    "Program Head 'Kristine San Lorenzo' isn't in this term's faculty list. Upload the faculty list first, or fix the name.");
});

// ---------------------------------------------------------------------------
// The flow, in a scratch period

test('programs list → Program Head', { skip }, async (t) => {
  const period = await db.AcademicPeriod.create({
    label: 'PHA test ' + process.pid, school_year: '1998-1999', semester: '1', status: 'Closed',
  });
  const cleanup = async () => {
    const ids = (await db.UserAccount.findAll({ where: { email: { [db.sequelize.Sequelize.Op.like]: PREFIX + '%' } }, attributes: ['id'] })).map((a) => a.id);
    if (ids.length) {
      await db.AccountNotice.destroy({ where: { user_account_id: ids } });
      await db.Notification.destroy({ where: { user_account_id: ids } });
    }
    await sequelize.query('DELETE FROM account_invitations WHERE email LIKE :p', { replacements: { p: PREFIX + '%' } });
    await sequelize.query('DELETE FROM user_accounts WHERE email LIKE :p', { replacements: { p: PREFIX + '%' } });
    await db.Program.destroy({ where: { period_id: period.id } });
    await db.Faculty.destroy({ where: { period_id: period.id } });
  };
  t.after(async () => { await cleanup(); await period.destroy(); });

  const kris = await db.Faculty.create({ name: 'Kris Phatest', role: 'Program Head', email: emailFor('kris'), status: 'Active', period_id: period.id });
  const dean = await db.Faculty.create({ name: 'Dean Phatest', role: 'Dean', email: emailFor('dean'), status: 'Active', period_id: period.id });
  const other = await db.Faculty.create({ name: 'Other Phatest', role: 'Instructor', email: emailFor('other'), status: 'Active', period_id: period.id });
  const account = (tag) => db.UserAccount.findOne({ where: { email: emailFor(tag) } });
  const invitation = async (tag, status) => db.AccountInvitation.findOne({ where: { user_account_id: (await account(tag)).id, status } });
  const notice = async (tag) => db.AccountNotice.findOne({ where: { user_account_id: (await account(tag)).id, period_id: period.id } });

  await t.test('faculty upload only: Instructor, whatever the Role column says; invitations wait', async () => {
    const s = await scheduleUploadInvitations({
      entity: 'faculty',
      periodId: period.id,
      defer: true,
      people: [kris, dean, other].map((f) => ({ name: f.name, email: f.email, roles: rolesForFacultyRow(f.role) })),
    });
    assert.deepEqual(s, { scheduled: 0, waiting: 3, held: 0, skipped: 0, created: 3 });
    assert.deepEqual((await account('kris')).roles, ['Instructor']);
    assert.deepEqual((await account('dean')).roles, ['Instructor'], 'a faculty row with Role "Dean" is not a Dean');
    assert.deepEqual(await describeRoles(await account('kris'), period.id), ['Instructor']);
    assert.ok(await invitation('kris', 'waiting'), 'not invited yet');
    // The Role column itself is still saved (information only).
    assert.equal((await db.Faculty.findByPk(kris.id)).role, 'Program Head');
  });

  let bsit;
  await t.test('programs upload, invitation waiting: role added, the invitation is released and will list it', async () => {
    bsit = await db.Program.create({ code: 'PHA' + process.pid, name: 'Test Program', program_head: kris.name, program_head_id: kris.id, status: 'Active', period_id: period.id });
    const r = await syncProgramHeadRoles({ periodId: period.id, before: [] });
    assert.deepEqual(r.granted, [emailFor('kris')]);
    assert.deepEqual(r.notified, [emailFor('kris')], 'handed to the notice worker');
    assert.equal(r.invited, null);
    const k = await account('kris');
    assert.deepEqual(k.roles, ['Instructor', 'Program Head'], 'appended, not reordered');
    assert.deepEqual(await describeRoles(k, period.id), ['Instructor', 'Program Head (' + bsit.code + ')']);
    assert.equal(await db.AccountInvitation.count({ where: { user_account_id: k.id } }), 1, 'still one invitation');
    const inv = await invitation('kris', 'scheduled');
    assert.ok(inv, 'waiting → scheduled');
    assert.ok(new Date(inv.send_after) > new Date(), 'after the undo window');
    assert.equal((await notice('kris')).dirty, true);
  });

  await t.test('same programs again: nothing changes, nothing is queued', async () => {
    const r = await syncProgramHeadRoles({ periodId: period.id, before: [kris.id] });
    assert.deepEqual(r, { granted: [], invited: null, revoked: [], unmatched: [], notified: [] });
  });

  await t.test('invitation already sent: the role is added and the notice worker is told (no setTimeout)', async () => {
    const k = await account('kris');
    await db.AccountInvitation.update({ status: 'sent' }, { where: { user_account_id: k.id } });
    await k.update({ roles: ['Instructor'] });
    await db.AccountNotice.update({ dirty: false }, { where: { user_account_id: k.id } });
    const r = await syncProgramHeadRoles({ periodId: period.id, before: [kris.id] });
    assert.deepEqual(r.granted, [emailFor('kris')]);
    assert.deepEqual(r.notified, [emailFor('kris')]);
    assert.deepEqual((await account('kris')).roles, ['Instructor', 'Program Head']);
    assert.equal((await notice('kris')).dirty, true);

    const again = await syncProgramHeadRoles({ periodId: period.id, before: [kris.id] });
    assert.deepEqual(again.notified, [], 're-upload queues nothing');
  });

  await t.test('head not in the faculty list: reported, no account created', async () => {
    await db.Program.create({ code: 'PHX' + process.pid, name: 'Orphan', program_head: 'Nobody Phatest', program_head_id: null, status: 'Active', period_id: period.id });
    const r = await syncProgramHeadRoles({ periodId: period.id, before: [kris.id] });
    assert.deepEqual(r.unmatched, [unmatchedHeadMessage('Nobody Phatest')]);
    assert.equal(await db.UserAccount.count({ where: { display_name: 'Nobody Phatest' } }), 0);
  });

  await t.test('head with no account yet (programs before faculty is accepted): account + invitation, signed for programs', async () => {
    const late = await db.Faculty.create({ name: 'Late Phatest', role: 'Instructor', email: emailFor('late'), status: 'Active', period_id: period.id });
    await db.Program.create({ code: 'PHL' + process.pid, name: 'Late', program_head: late.name, program_head_id: late.id, status: 'Active', period_id: period.id });
    const r = await syncProgramHeadRoles({ periodId: period.id, before: [kris.id] });
    assert.deepEqual(r.invited, { scheduled: 1, waiting: 0, held: 0, skipped: 0, created: 1 });
    const a = await account('late');
    assert.deepEqual(a.roles, ['Program Head', 'Instructor']);
    const inv = await db.AccountInvitation.findOne({ where: { user_account_id: a.id } });
    assert.equal(inv.source_entity, 'programs');
    assert.equal(inv.status, 'scheduled');
  });

  await t.test('head replaced: the new head gains Program Head, the old one keeps only Instructor and is told', async () => {
    const before = [...(await headsOf(period.id)).byFaculty.keys()];
    await bsit.update({ program_head: other.name, program_head_id: other.id });
    const r = await syncProgramHeadRoles({ periodId: period.id, before });
    assert.deepEqual(r.granted, [emailFor('other')]);
    assert.deepEqual(r.revoked, [emailFor('kris')]);
    assert.ok(r.notified.includes(emailFor('kris')));
    assert.deepEqual((await account('kris')).roles, ['Instructor']);
    assert.deepEqual((await account('other')).roles, ['Instructor', 'Program Head']);
    assert.ok(await invitation('other', 'scheduled'), "the new head's waiting invitation is released");
  });

  await t.test('departments list → Dean', async () => {
    await scheduleUploadInvitations({
      entity: 'departments', periodId: period.id,
      people: [{ name: dean.name, email: dean.email, roles: ['Dean'] }],
    });
    assert.deepEqual((await account('dean')).roles, ['Instructor', 'Dean']);
    assert.ok(await invitation('dean', 'scheduled'), 'a non-deferred upload supersedes the waiting invitation');
  });
});
