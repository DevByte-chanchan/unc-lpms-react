/**
 * Industry Consultant access: a Program Head adding someone (by hand or upload)
 * invites a new person, gives an existing account the role and hands them to
 * the notice worker (one email listing their courses — notices.test.js), and
 * does nothing twice. Removing them takes only that role away.
 *
 * Runs against the real tables inside a scratch academic period, with
 * throw-away accounts (ica-test-<pid>-…@unc.edu.ph) deleted afterwards.
 * Nothing is emailed from the grant itself. Skipped when the database isn't
 * reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import { grantConsultantAccess, revokeConsultantAccess, accessMessage } from '../services/consultantAccess.js';
import { describeRoles } from '../services/invitations.js';
import { myCourses } from '../controllers/industryConsultantController.js';
import { isAllowedEmailForRoles } from '../utils/roles.js';

process.env.MAIL_MODE = 'capture';

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const PREFIX = 'ica-test-' + process.pid + '-';
const emailFor = (tag) => PREFIX + tag + '@unc.edu.ph';
// Names unique to this run, letters only (names are matched by words).
const tagName = (first) => first + ' Ica' + String(process.pid).split('').map((d) => 'abcdefghij'[d]).join('');

test('access messages', () => {
  assert.match(accessMessage('Kristine San Lorenzo', { status: 'role_added' }), /^Kristine San Lorenzo was given the Industry Consultant role\./);
  assert.match(accessMessage('X', { status: 'invited', email: 'x@unc.edu.ph' }), /invitation to x@unc\.edu\.ph/);
  assert.equal(accessMessage('X', { status: 'held', reason: 'Check it.' }), 'Held — Check it.');
});

test('outside emails: only with the switch on, and only for an Industry-Consultant-only account', () => {
  const was = process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS;
  try {
    process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS = 'false';
    assert.equal(isAllowedEmailForRoles('a@unc.edu.ph', ['Instructor']), true);
    assert.equal(isAllowedEmailForRoles('a@gmail.com', ['Industry Consultant']), false);
    process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS = 'true';
    assert.equal(isAllowedEmailForRoles('a@gmail.com', ['Industry Consultant']), true);
    assert.equal(isAllowedEmailForRoles('a@gmail.com', ['Industry Consultant', 'Instructor']), false);
    assert.equal(isAllowedEmailForRoles('not-an-email', ['Industry Consultant']), false);
    assert.equal(isAllowedEmailForRoles('a@unc.edu.ph', ['Dean']), true);
  } finally {
    if (was === undefined) delete process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS;
    else process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS = was;
  }
});

test('consultant access', { skip }, async (t) => {
  const period = await db.AcademicPeriod.create({
    label: 'ICA test ' + process.pid, school_year: '1997-1998', semester: '1', status: 'Closed',
  });
  t.after(async () => {
    const ids = (await db.UserAccount.findAll({ where: { email: { [Op.like]: PREFIX + '%' } }, attributes: ['id'] })).map((a) => a.id);
    if (ids.length) {
      await db.AccountNotice.destroy({ where: { user_account_id: ids } });
      await db.Notification.destroy({ where: { user_account_id: ids } });
    }
    await sequelize.query('DELETE FROM account_invitations WHERE email LIKE :p', { replacements: { p: PREFIX + '%' } });
    await sequelize.query('DELETE FROM user_accounts WHERE email LIKE :p', { replacements: { p: PREFIX + '%' } });
    await db.IndustryConsultant.destroy({ where: { period_id: period.id } });
    await db.Program.destroy({ where: { period_id: period.id } });
    await db.Course.destroy({ where: { period_id: period.id } });
    await db.Faculty.destroy({ where: { period_id: period.id } });
    await period.destroy();
  });

  const account = (tag) => db.UserAccount.findOne({ where: { email: emailFor(tag) } });
  const notice = async (tag) => db.AccountNotice.findOne({ where: { user_account_id: (await account(tag)).id, period_id: period.id } });
  const makeAccount = (tag, name, roles, extra = {}) => db.UserAccount.create({
    email: emailFor(tag), display_name: name, roles, password_hash: 'x', status: 'Active', must_change_password: false, ...extra,
  });

  // The Program Head who adds people (signs the emails).
  const headName = tagName('Head');
  const head = await makeAccount('head', headName, ['Program Head', 'Instructor']);
  const headFac = await db.Faculty.create({ name: headName, role: 'Instructor', email: emailFor('head'), status: 'Active', period_id: period.id });
  await db.Program.create({ code: 'ICA' + process.pid, name: 'Test', program_head: headName, program_head_id: headFac.id, status: 'Active', period_id: period.id });
  const add = (name, tag, opts = {}) => db.IndustryConsultant.create({ name, period_id: period.id })
    .then(() => grantConsultantAccess({ name, email: emailFor(tag), periodId: period.id, senderId: head.id, ...opts }));

  const krisName = tagName('Kris');
  await makeAccount('kris', krisName, ['Program Head', 'Instructor']);

  await t.test('existing account (password set): role appended, handed to the notice worker', async () => {
    const r = await add(krisName, 'kris');
    assert.equal(r.status, 'role_added');
    assert.equal(r.notified, true);
    assert.deepEqual((await account('kris')).roles, ['Program Head', 'Instructor', 'Industry Consultant']);
    const n = await notice('kris');
    assert.equal(n.dirty, true);
    assert.equal(n.sent_by_account_id, head.id, 'the Program Head signs it');
    assert.ok(new Date(n.send_after) > new Date(), 'after the undo window');
  });

  await t.test('already a consultant: the role is not added twice (courses may still have changed)', async () => {
    const r = await grantConsultantAccess({ name: krisName, email: emailFor('kris'), periodId: period.id, senderId: head.id });
    assert.deepEqual(r, { status: 'already', email: emailFor('kris') });
    assert.deepEqual((await account('kris')).roles, ['Program Head', 'Instructor', 'Industry Consultant']);
  });

  await t.test('new person: account with Industry Consultant, invitation signed for the consultant list', async () => {
    const r = await add(tagName('Newbie'), 'new');
    assert.equal(r.status, 'invited');
    const a = await account('new');
    assert.deepEqual(a.roles, ['Industry Consultant']);
    assert.equal(a.must_change_password, true);
    const inv = await db.AccountInvitation.findOne({ where: { user_account_id: a.id } });
    assert.equal(inv.status, 'scheduled');
    assert.equal(inv.source_entity, 'industry_consultants');
    assert.equal(inv.sent_by_account_id, head.id);
    assert.deepEqual(await describeRoles(a, period.id), ['Industry Consultant']);
  });

  await t.test('invitation still waiting (faculty upload, no course yet): role added, the invitation is released', async () => {
    const name = tagName('Waiting');
    const a = await makeAccount('wait', name, ['Instructor'], { must_change_password: true });
    await db.AccountInvitation.create({ user_account_id: a.id, email: a.email, display_name: name, status: 'waiting', source_entity: 'faculty', email_source: 'file' });
    const r = await add(name, 'wait');
    assert.deepEqual(r, { status: 'role_added', email: emailFor('wait'), notified: true });
    assert.deepEqual((await account('wait')).roles, ['Instructor', 'Industry Consultant']);
    const inv = await db.AccountInvitation.findOne({ where: { user_account_id: a.id } });
    assert.equal(inv.status, 'scheduled', 'waiting → scheduled: this is what invites them');
  });

  await t.test('disabled account: nothing, reported', async () => {
    const name = tagName('Gone');
    await makeAccount('gone', name, ['Instructor'], { status: 'Disabled' });
    const r = await add(name, 'gone');
    assert.equal(r.status, 'disabled');
    assert.deepEqual((await account('gone')).roles, ['Instructor']);
  });

  await t.test('non-UNC email (switch off): held with the reason', async () => {
    const name = tagName('Gmail');
    const was = process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS;
    process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS = 'false';
    try {
      await db.IndustryConsultant.create({ name, period_id: period.id });
      const r = await grantConsultantAccess({ name, email: 'someone@gmail.com', periodId: period.id, senderId: head.id });
      assert.equal(r.status, 'held');
      assert.match(r.reason, /isn't a UNC address/);
    } finally {
      if (was === undefined) delete process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS; else process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS = was;
      await sequelize.query('DELETE FROM account_invitations WHERE display_name = :n', { replacements: { n: name } });
      await sequelize.query('DELETE FROM user_accounts WHERE display_name = :n', { replacements: { n: name } });
    }
  });

  await t.test('non-UNC email (switch on): a consultant-only account on that address, invited', async () => {
    const name = tagName('Outside');
    const email = PREFIX + 'outside@example.com';
    const was = process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS;
    process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS = 'true';
    try {
      await db.IndustryConsultant.create({ name, period_id: period.id });
      const r = await grantConsultantAccess({ name, email, periodId: period.id, senderId: head.id });
      assert.equal(r.status, 'invited');
      const a = await db.UserAccount.findOne({ where: { email } });
      assert.deepEqual(a.roles, ['Industry Consultant']);
      assert.equal((await db.AccountInvitation.findOne({ where: { user_account_id: a.id } })).status, 'scheduled');
    } finally {
      if (was === undefined) delete process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS; else process.env.ALLOW_EXTERNAL_CONSULTANT_EMAILS = was;
      await sequelize.query('DELETE FROM account_invitations WHERE email = :e', { replacements: { e: email } });
      await sequelize.query('DELETE FROM user_accounts WHERE email = :e', { replacements: { e: email } });
    }
  });

  await t.test('my courses: the signed-in consultant sees their assigned courses', async () => {
    const course = await db.Course.create({ course_no: 'BIT313L', course_title: 'Human Computer Interaction', year_lvl: 'THIRD YEAR', period_id: period.id });
    const row = await db.IndustryConsultant.findOne({ where: { period_id: period.id, name: krisName } });
    await db.ConsultantCourse.create({ consultant_id: row.id, course_id: course.course_id, course_code: 'BIT313L' });

    const call = async (user) => {
      let body;
      await myCourses({ user, query: { period_id: String(period.id) } }, { json: (b) => { body = b; } }, (err) => { throw err; });
      return body;
    };
    assert.deepEqual(await call(await account('kris')), [{ code: 'BIT313L', title: 'Human Computer Interaction', year_level: 'THIRD YEAR' }]);
    assert.deepEqual(await call(await account('new')), [], 'no courses assigned yet');
  });

  await t.test('removal: only the Industry Consultant role goes, and they are told', async () => {
    assert.deepEqual(await revokeConsultantAccess({ name: krisName, periodId: period.id }), { status: 'still_consultant' });
    await db.IndustryConsultant.destroy({ where: { period_id: period.id, name: krisName } });
    await db.AccountNotice.update({ dirty: false }, { where: { user_account_id: (await account('kris')).id } });
    const r = await revokeConsultantAccess({ name: krisName, periodId: period.id, senderId: head.id });
    assert.equal(r.status, 'removed');
    const k = await account('kris');
    assert.deepEqual(k.roles, ['Program Head', 'Instructor']);
    assert.equal(k.status, 'Active');
    assert.equal((await notice('kris')).dirty, true);
  });

  await t.test('removal: when it was the only role, the account is disabled', async () => {
    const name = tagName('Newbie');
    await db.IndustryConsultant.destroy({ where: { period_id: period.id, name } });
    const r = await revokeConsultantAccess({ name, periodId: period.id });
    assert.equal(r.status, 'disabled');
    const a = await account('new');
    assert.equal(a.status, 'Disabled');
    assert.deepEqual(a.roles, ['Industry Consultant']);
  });
});
