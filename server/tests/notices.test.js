/**
 * Notices: one combined email per person per burst of changes, nothing while
 * Undo is possible, nothing when nothing changed, an invitation only when
 * there is something to do, the bell, reminders, and the new-link page.
 *
 * Runs against the real tables inside a scratch academic period with
 * throw-away accounts (ntc-test-<pid>-…@unc.edu.ph), all deleted afterwards.
 * Mail is counted through the mailer's test sink (MAIL_MODE=capture, no
 * Mailpit needed). Skipped when the database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import { setMailSinkForTests } from '../services/mailer.js';
import {
  scheduleUploadInvitations, cancelBatchInvitations, deliverDueInvitations, sendDueReminders,
  inviteNow, requestInvitation, findLiveInvitation, accessSummaries, reminderCount, ACCESS_LABELS,
} from '../services/invitations.js';
import {
  currentState, markDirty, accountsInvolved, diff, isEmpty, deliverDueNotices, recordTold,
  baselineNotices, deadlineNotifications, facultyLeft, notificationsFor,
} from '../services/notices.js';
import { syncProgramHeadRoles } from '../services/programHeadAccess.js';
import { grantConsultantAccess } from '../services/consultantAccess.js';
import { listNotifications, getUnreadCount, markRead, markAllRead } from '../controllers/notificationController.js';
import { updateEmail } from '../templates/updateEmail.js';
import { invitationEmail } from '../templates/invitationEmail.js';
import { hashPassword } from '../controllers/authController.js';

process.env.MAIL_MODE = 'capture';

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

const PREFIX = 'ntc-test-' + process.pid + '-';
const emailFor = (tag) => PREFIX + tag + '@unc.edu.ph';
// Names unique to this run, letters only (names are matched by words).
const tagName = (first) => first + ' Ntc' + String(process.pid).split('').map((d) => 'abcdefghij'[d]).join('');
const FAKE_BATCH = 900000 + (process.pid % 90000);
const PAST = new Date(Date.now() - 60 * 1000);
const DAY = 24 * 60 * 60 * 1000;

// --- The mail sink ------------------------------------------------------------

const sent = [];
setMailSinkForTests(async (message) => { sent.push({ ...message, at: new Date() }); return { messageId: 'sink-' + sent.length }; });
const to = (m) => (Array.isArray(m.to) ? m.to : [m.to]).map((s) => String(s).toLowerCase());
const inbox = (email) => sent.filter((m) => to(m).includes(String(email).toLowerCase()));
const since = (mark) => sent.slice(mark);
const tokenIn = (m) => { const x = String(m.text).match(/set-password\?token=([A-Za-z0-9_%-]+)/); return x ? decodeURIComponent(x[1]) : null; };

// Deliver everything that is due, as the worker would after the undo window.
// Scoped to this run's accounts, so the development database's own pending
// rows are never touched.
async function flush() {
  const accountIds = await testAccountIds();
  await db.AccountNotice.update({ send_after: PAST }, { where: { dirty: true, user_account_id: { [Op.in]: accountIds } } });
  await db.AccountInvitation.update({ send_after: PAST }, { where: { status: 'scheduled', email: { [Op.like]: PREFIX + '%' } } });
  const inv = await deliverDueInvitations({ limit: 100, accountIds });
  const ntc = await deliverDueNotices({ limit: 100, accountIds });
  return { inv, ntc };
}
const remind = async () => sendDueReminders({ accountIds: await testAccountIds() });
const testAccountIds = async () => (await db.UserAccount.findAll({ where: { email: { [Op.like]: PREFIX + '%' } }, attributes: ['id'] })).map((a) => a.id);

// A fake Express req/res pair for the notification controller.
const call = async (handler, user, { params = {}, query = {} } = {}) => {
  let status = 200; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  await handler({ user, params, query }, res, (err) => { throw err; });
  return { status, body };
};

// ---------------------------------------------------------------------------
// No database

test('diff: what is news', () => {
  const told = { roles: ['Instructor'], lead: ['BIT215L'], contributor: ['BIT412L'], consultant: [] };
  assert.ok(isEmpty(diff(told, told)), 'same state → nothing');
  assert.ok(isEmpty(diff(null, { roles: ['Instructor'], lead: [], contributor: [], consultant: [] })), 'Instructor alone is never news');
  const d = diff(told, { roles: ['Instructor', 'Program Head'], lead: ['BIT412L', 'BIT111L'], contributor: ['BIT215L', 'BIT313L'], consultant: ['BIT313L'] });
  assert.deepEqual(d.rolesAdded, ['Program Head']);
  assert.deepEqual(d.leadAdded, ['BIT412L', 'BIT111L'], 'Contributor → Lead is reported');
  assert.deepEqual(d.contributorAdded, ['BIT313L'], 'Lead → Contributor on the same course is not');
  assert.deepEqual(d.consultantAdded, ['BIT313L']);
  assert.deepEqual(d.removed, []);
  const gone = diff(told, { roles: [], lead: [], contributor: [], consultant: [] });
  assert.deepEqual(gone.removed, ['BIT215L', 'BIT412L']);
  assert.deepEqual(gone.rolesRemoved, [], 'losing Instructor is not news on its own');
});

test('notifications: one per item, with the course name and term', () => {
  const d = diff({ roles: [], lead: [], contributor: [], consultant: [] }, { roles: ['Program Head'], lead: ['BIT111L'], contributor: ['BIT313L'], consultant: [] });
  const items = notificationsFor(d, { state: { names: { BIT111L: 'Introduction to Computing' } }, period: { label: '1st Semester SY 2026–2027' }, roleLabels: { 'Program Head': 'Program Head (BSIT)' } });
  assert.deepEqual(items.map((i) => i.kind), ['role_added', 'lead_added', 'contributor_added']);
  assert.equal(items[0].title, "You're now a Program Head (BSIT)");
  assert.equal(items[1].title, "You're the Lead Faculty for BIT111L");
  assert.equal(items[1].body, 'Introduction to Computing · 1st Semester SY 2026–2027');
  assert.equal(items[1].link, '/');
});

test('update email: subject follows the content, only non-empty lines, no token', () => {
  const m = updateEmail({
    name: 'Kristine San Lorenzo', termLabel: '1st Semester SY 2026–2027',
    lead: [{ code: 'BIT215L', name: 'Web Systems' }], contributor: [{ code: 'BIT412L', name: 'Capstone' }],
    deadlines: { midterm: '2026-12-15', finals: '2027-04-30' }, link: 'http://localhost:5173/login',
    sender: { name: 'Kristine San Lorenzo', title: 'Program Head, BSIT' },
  });
  assert.equal(m.subject, 'Your LPMS courses for 1st Semester SY 2026–2027');
  assert.match(m.text, /Kristine San Lorenzo has assigned you as Lead Faculty for: BIT215L — Web Systems\./);
  assert.match(m.text, /added you as a Contributor to: BIT412L — Capstone\./);
  assert.match(m.text, /Midterm deadline: 15 Dec 2026 · Finals deadline: 30 Apr 2027/);
  assert.match(m.text, /Sign in: http:\/\/localhost:5173\/login/);
  assert.match(m.text, /— Kristine San Lorenzo\nProgram Head, BSIT/);
  assert.doesNotMatch(m.text + m.html, /token=/);
  assert.doesNotMatch(m.text, /Industry Consultant|removed from|no longer/);
  const roleOnly = updateEmail({ name: 'A', rolesRemoved: ['Program Head'], link: 'x' });
  assert.equal(roleOnly.subject, 'Your LPMS access has changed');
  assert.match(roleOnly.text, /You no longer have the Program Head role\./);
});

test('invitation email: the course lines and deadlines, omitted when empty', () => {
  const m = invitationEmail({
    name: 'Monica Norton', roles: ['Instructor'], link: 'http://x/set-password?token=abc',
    courses: { lead: ['BIT111L'], contributor: ['BIT313L'], consultant: [] },
    deadlines: { midterm: '2026-12-15', finals: null },
  });
  assert.match(m.text, /You lead: BIT111L\nYou contribute to: BIT313L\nMidterm deadline: 15 Dec 2026/);
  assert.doesNotMatch(m.text, /You consult on|Finals deadline/);
  assert.match(m.html, /You lead: <strong[^>]*>BIT111L<\/strong>/);
  const plain = invitationEmail({ name: 'A', roles: ['Dean (SCIS)'], link: 'http://x' });
  assert.doesNotMatch(plain.text, /You lead|deadline/);
});

// ---------------------------------------------------------------------------
// The flow, in a scratch period

test('notices flow', { skip }, async (t) => {
  const period = await db.AcademicPeriod.create({
    label: 'NTC test ' + process.pid, school_year: '1996-1997', semester: '1', status: 'Closed',
  });
  const pid = period.id;
  t.after(async () => {
    const ids = await testAccountIds();
    await db.Notification.destroy({ where: { user_account_id: ids } });
    await db.AccountNotice.destroy({ where: { user_account_id: ids } });
    await db.AccountNotice.destroy({ where: { period_id: pid } });
    await sequelize.query('DELETE FROM account_invitations WHERE email LIKE :p', { replacements: { p: PREFIX + '%' } });
    await sequelize.query('DELETE FROM user_accounts WHERE email LIKE :p', { replacements: { p: PREFIX + '%' } });
    await db.CourseOfferingAssignment.destroy({ where: { period_id: pid } });
    await db.IndustryConsultant.destroy({ where: { period_id: pid } });
    await db.Program.destroy({ where: { period_id: pid } });
    await db.Course.destroy({ where: { period_id: pid } });
    await db.Faculty.destroy({ where: { period_id: pid } });
    await period.destroy();
    setMailSinkForTests(null);
  });

  const account = (tag) => db.UserAccount.findOne({ where: { email: emailFor(tag) } });
  const names = { dean: tagName('Dean'), kris: tagName('Kris'), monica: tagName('Monica'), alex: tagName('Alex'), bea: tagName('Bea') };
  const dean = await db.UserAccount.create({
    email: emailFor('dean'), display_name: names.dean, roles: ['Dean'], password_hash: await hashPassword('Dean-Pass-1'), status: 'Active', must_change_password: false,
  });
  const fac = {};
  for (const tag of ['kris', 'monica', 'alex', 'bea']) {
    fac[tag] = await db.Faculty.create({ name: names[tag], role: 'Instructor', email: emailFor(tag), status: 'Active', period_id: pid });
  }
  const courses = {};
  for (const [no, title] of [['BIT111L', 'Introduction to Computing'], ['BIT215L', 'Web Systems'], ['BIT313L', 'Human Computer Interaction'], ['BIT314L', 'Software Engineering'], ['BIT412L', 'Capstone']]) {
    courses[no] = await db.Course.create({ course_no: no, course_title: title, year_lvl: 'FIRST YEAR', period_id: pid });
  }
  const assign = (code, leadTag, contributorTags = [], status = 'Active') => db.CourseOfferingAssignment.create({
    course_code: code, course_name: courses[code] ? courses[code].course_title : null, course_id: courses[code] ? courses[code].course_id : null,
    faculty_name: leadTag ? names[leadTag] : null, faculty_id: leadTag ? fac[leadTag].id : null,
    contributors: contributorTags.map((c) => ({ faculty_id: fac[c].id, faculty_name: names[c] })),
    status, period_id: pid,
  });
  const facultyUpload = () => scheduleUploadInvitations({
    entity: 'faculty', periodId: pid, batchId: FAKE_BATCH, senderId: dean.id, defer: true,
    people: ['kris', 'monica', 'alex'].map((tag) => ({ name: names[tag], email: emailFor(tag), roles: ['Instructor'] })),
  });

  await t.test('2. faculty upload: accounts, "Not invited yet", 0 emails; undo removes them', async () => {
    const mark = sent.length;
    const s = await facultyUpload();
    assert.deepEqual(s, { scheduled: 0, waiting: 3, held: 0, skipped: 0, created: 3 });
    await flush();
    assert.equal(since(mark).length, 0, 'nothing is sent');
    const access = await accessSummaries([{ key: 'k', name: names.kris, email: emailFor('kris') }]);
    assert.equal(access.k.status, 'waiting');
    assert.equal(access.k.label, 'Not invited yet');
    assert.equal(ACCESS_LABELS.waiting, 'Not invited yet');

    const undone = await cancelBatchInvitations({ id: FAKE_BATCH });
    assert.equal(undone.cancelled, 3);
    assert.equal(undone.removedAccounts, 3);
    assert.equal(await account('kris'), null, 'her account is gone');
    assert.equal(since(mark).length, 0);
    // Upload again for the rest of the flow.
    await facultyUpload();
  });

  await t.test('3. programs upload: ONE invitation to the head, listing Program Head + Instructor; a re-upload sends nothing', async () => {
    const mark = sent.length;
    await db.Program.create({ code: 'NTC' + process.pid, name: 'Test Program', program_head: names.kris, program_head_id: fac.kris.id, status: 'Active', period_id: pid });
    const r = await syncProgramHeadRoles({ periodId: pid, before: [], senderId: dean.id });
    assert.deepEqual(r.granted, [emailFor('kris')]);
    const inv = await db.AccountInvitation.findOne({ where: { user_account_id: (await account('kris')).id, status: 'scheduled' } });
    assert.ok(inv, 'the waiting invitation became a scheduled one');
    assert.ok(new Date(inv.send_after) > new Date(), 'after the undo window');
    await flush();
    const mine = since(mark);
    assert.equal(mine.length, 1);
    assert.deepEqual(to(mine[0]), [emailFor('kris')]);
    assert.match(mine[0].subject, /account/);
    assert.match(mine[0].text, /as: Instructor, Program Head \(NTC\d+\)\./);
    assert.match(mine[0].text, new RegExp(names.dean + ' has given you access'));

    await syncProgramHeadRoles({ periodId: pid, before: [fac.kris.id], senderId: dean.id });
    await flush();
    assert.equal(since(mark).length, 1, 're-upload: still one email');
    assert.equal((await db.AccountNotice.findOne({ where: { user_account_id: (await account('kris')).id, period_id: pid } })).dirty, false);
  });

  await t.test('4. course assignment upload: one email per person, update or invitation', async () => {
    const kris = await account('kris');
    await kris.update({ must_change_password: false });   // she set her password
    await assign('BIT215L', 'kris', ['monica']);
    await assign('BIT412L', 'monica', ['kris']);
    await assign('BIT111L', 'monica');
    await assign('BIT313L', 'alex', ['monica']);
    const involved = await accountsInvolved(pid);
    assert.ok(involved.includes(kris.id) && involved.includes((await account('monica')).id) && involved.includes((await account('alex')).id));

    const mark = sent.length;
    await markDirty(involved, { periodId: pid, senderId: kris.id });
    const row = await db.AccountNotice.findOne({ where: { user_account_id: kris.id, period_id: pid } });
    assert.equal(row.dirty, true);
    assert.ok(new Date(row.send_after) > new Date(), 'waits out the undo window');
    assert.equal(since(mark).length, 0, 'nothing yet');

    const { ntc } = await flush();
    const mine = since(mark);
    assert.equal(mine.length, 3, 'three people, three emails');
    assert.equal(ntc.emailed, 1);
    assert.equal(ntc.invited, 2);
    const k = inbox(emailFor('kris')).slice(-1)[0];
    assert.match(k.subject, /^Your LPMS courses for NTC test/);
    assert.match(k.text, /Lead Faculty for: BIT215L — Web Systems\./);
    assert.match(k.text, /Contributor to: BIT412L — Capstone\./);
    assert.match(k.text, new RegExp('— ' + names.kris + '\\nProgram Head, NTC'));
    const m = inbox(emailFor('monica')).slice(-1)[0];
    assert.match(m.subject, /account/, "Monica's email IS her invitation");
    assert.match(m.text, /You lead: BIT111L, BIT412L\nYou contribute to: BIT215L, BIT313L/);
    assert.ok(tokenIn(m), 'with a working link');
    assert.ok(await findLiveInvitation(tokenIn(m)));
    for (const tag of ['kris', 'monica', 'alex']) assert.equal(since(mark).filter((x) => to(x).includes(emailFor(tag))).length, 1, tag + ' got exactly one');
    assert.equal(await db.Notification.count({ where: { user_account_id: kris.id, kind: ['lead_added', 'contributor_added'] } }), 2, 'the bell has both');
  });

  await t.test('5. undo within the window: 0 emails', async () => {
    const mark = sent.length;
    const extra = await assign('BIT314L', 'kris');
    await markDirty(await accountsInvolved(pid), { periodId: pid, senderId: dean.id });
    await extra.destroy();   // the undo puts the list back
    await markDirty(await accountsInvolved(pid), { periodId: pid, senderId: dean.id });
    await flush();
    assert.equal(since(mark).length, 0);
  });

  await t.test('6. change a Lead from A to B', async () => {
    await db.UserAccount.create({ email: emailFor('bea'), display_name: names.bea, roles: ['Instructor'], password_hash: 'x', status: 'Active', must_change_password: false });
    const bea = await account('bea');
    const kris = await account('kris');
    const mark = sent.length;
    // BIT111L: monica → bea (monica is off the course); BIT215L: kris → alex, kris stays as a contributor.
    await db.CourseOfferingAssignment.update({ faculty_name: names.bea, faculty_id: fac.bea.id }, { where: { period_id: pid, course_code: 'BIT111L' } });
    await db.CourseOfferingAssignment.update({ faculty_name: names.alex, faculty_id: fac.alex.id, contributors: [{ faculty_id: fac.kris.id, faculty_name: names.kris }] }, { where: { period_id: pid, course_code: 'BIT215L' } });
    await markDirty([bea.id, kris.id, (await account('monica')).id, (await account('alex')).id], { periodId: pid, senderId: kris.id });
    await flush();
    assert.equal(inbox(emailFor('bea')).length, 1, 'B gets one email');
    assert.match(inbox(emailFor('bea'))[0].text, /Lead Faculty for: BIT111L/);
    assert.equal(since(mark).filter((x) => to(x).includes(emailFor('kris'))).length, 0, 'A, still a contributor there, gets nothing');
    assert.equal(since(mark).filter((x) => to(x).includes(emailFor('monica'))).length, 0, 'invited, not signed in: no extra email');
    const monica = await account('monica');
    assert.equal(await db.Notification.count({ where: { user_account_id: monica.id, kind: 'course_removed', title: { [Op.like]: '%BIT111L%' } } }), 1, '… but the bell says she was removed');
  });

  await t.test('7. re-upload the same list / revalidate: 0 emails', async () => {
    const mark = sent.length;
    await markDirty(await accountsInvolved(pid), { periodId: pid, senderId: dean.id });
    await flush();
    assert.equal(since(mark).length, 0);
  });

  await t.test('8. consultant: one email listing both courses assigned within the window', async () => {
    const kris = await account('kris');
    const mark = sent.length;
    const row = await db.IndustryConsultant.create({ name: names.kris, period_id: pid, status: 'Active' });
    await db.ConsultantCourse.create({ consultant_id: row.id, course_id: courses.BIT313L.course_id, course_code: 'BIT313L' });
    const r = await grantConsultantAccess({ name: names.kris, email: emailFor('kris'), periodId: pid, senderId: dean.id });
    assert.equal(r.status, 'role_added');
    assert.equal(r.notified, true);
    assert.deepEqual((await account('kris')).roles, ['Instructor', 'Program Head', 'Industry Consultant']);
    await db.ConsultantCourse.create({ consultant_id: row.id, course_id: courses.BIT314L.course_id, course_code: 'BIT314L' });
    await markDirty([kris.id], { periodId: pid, senderId: dean.id });
    await flush();
    const mine = since(mark).filter((x) => to(x).includes(emailFor('kris')));
    assert.equal(mine.length, 1);
    assert.match(mine[0].text, /given you the Industry Consultant role/);
    assert.match(mine[0].text, /Industry Consultant for: BIT313L — Human Computer Interaction, BIT314L — Software Engineering\./);
    const state = await currentState(await account('kris'), pid);
    assert.deepEqual(state.consultant, ['BIT313L', 'BIT314L']);
  });

  await t.test('9. Invite now: right away for "Not invited yet"; 409-style refusal for an active account', async () => {
    const late = await db.UserAccount.create({ email: emailFor('late'), display_name: tagName('Late'), roles: ['Instructor'], password_hash: 'x', status: 'Active', must_change_password: true });
    await db.AccountInvitation.create({ user_account_id: late.id, email: late.email, display_name: late.display_name, status: 'waiting', source_entity: 'faculty', email_source: 'file' });
    const mark = sent.length;
    const r = await inviteNow(late, { senderId: dean.id, source: 'faculty', periodId: pid });
    assert.equal(r.status, 'sent');
    assert.equal(r.invitation.status, 'sent', 'Access now says Invited');
    assert.equal(since(mark).length, 1);
    const active = await inviteNow(await account('kris'), { senderId: dean.id });
    assert.equal(active.status, 'active');
    assert.match(active.reason, /Forgot password/);
    assert.equal(since(mark).length, 1);
  });

  await t.test('10. faculty set Inactive: Instructor goes, one "removed from" email when they had courses', async () => {
    const kris = await account('kris');
    // Give her a course to lose first.
    await assign('BIT314L-K', 'kris');
    await markDirty([kris.id], { periodId: pid, senderId: dean.id });
    await flush();
    const mark = sent.length;
    await fac.kris.update({ status: 'Inactive' });
    const r = await facultyLeft({ faculty: fac.kris, periodId: pid, senderId: dean.id, activeTermId: pid });
    assert.deepEqual(r.roles, ['Program Head', 'Industry Consultant']);
    assert.equal(r.disabled, false);
    assert.deepEqual((await account('kris')).roles, ['Program Head', 'Industry Consultant']);
    // The page's revalidation mirrors the faculty status onto the rows she leads.
    await db.CourseOfferingAssignment.update({ status: 'Inactive' }, { where: { period_id: pid, faculty_id: fac.kris.id } });
    await flush();
    const mine = since(mark).filter((x) => to(x).includes(emailFor('kris')));
    assert.equal(mine.length, 1);
    assert.match(mine[0].text, /removed from: BIT314L-K\./);   // the course she led; the ones she contributes to stay
    assert.doesNotMatch(mine[0].text, /BIT215L|BIT412L/);
    // An Instructor-only person with nothing else is disabled.
    const solo = await db.UserAccount.create({ email: emailFor('solo'), display_name: tagName('Solo'), roles: ['Instructor'], password_hash: 'x', status: 'Active', must_change_password: true });
    const soloFac = await db.Faculty.create({ name: solo.display_name, role: 'Instructor', email: solo.email, status: 'Emeritus', period_id: pid });
    const s = await facultyLeft({ faculty: soloFac, periodId: pid, activeTermId: pid });
    assert.equal(s.disabled, true);
    assert.equal((await db.UserAccount.findByPk(solo.id)).status, 'Disabled');
    assert.equal(kris.id, r.account_id);
  });

  await t.test('11. restart: the pending notice lives in the database and goes out once', async () => {
    const bea = await account('bea');
    const mark = sent.length;
    await assign('BIT314L', 'bea');
    await markDirty([bea.id], { periodId: pid, senderId: dean.id });
    const pending = await db.AccountNotice.findOne({ where: { user_account_id: bea.id, period_id: pid } });
    assert.equal(pending.dirty, true);
    assert.ok(pending.send_after, 'nothing is held in memory');
    await flush();
    await flush();
    assert.equal(since(mark).length, 1);
  });

  await t.test('12. bell, signed in: two more courses → 2 unread, 1 email listing both; read / read-all', async () => {
    const bea = await account('bea');
    await db.Notification.destroy({ where: { user_account_id: bea.id } });
    const mark = sent.length;
    await assign('BIT412L-X', 'bea');
    await db.CourseOfferingAssignment.update({ contributors: [{ faculty_id: fac.bea.id, faculty_name: names.bea }] }, { where: { period_id: pid, course_code: 'BIT313L' } });
    await markDirty([bea.id], { periodId: pid, senderId: dean.id });
    await flush();
    assert.equal(since(mark).length, 1);
    assert.match(since(mark)[0].text, /BIT412L-X/);
    assert.match(since(mark)[0].text, /Contributor to: BIT313L/);
    let r = await call(getUnreadCount, bea);
    assert.equal(r.body.unread, 2);
    r = await call(listNotifications, bea);
    assert.equal(r.body.items.length, 2);
    assert.equal(r.body.items[0].from, names.dean);
    assert.ok(r.body.items.every((i) => i.emailed_at), 'marked as included in the email');
    const first = r.body.items[0];
    r = await call(markRead, bea, { params: { id: first.id } });
    assert.equal(r.status, 200);
    assert.equal(r.body.unread, 1);
    r = await call(markAllRead, bea);
    assert.equal(r.body.unread, 0);
  });

  await t.test('13. bell, not signed in: a new course after the invitation → 0 emails, waiting in the bell', async () => {
    const monica = await account('monica');
    const mark = sent.length;
    await assign('BIT314L-M', 'monica');
    await markDirty([monica.id], { periodId: pid, senderId: dean.id });
    const { ntc } = await flush();
    assert.equal(since(mark).length, 0);
    assert.equal(ntc.waitingInBell, 1);
    assert.equal(await db.Notification.count({ where: { user_account_id: monica.id, kind: 'lead_added', title: { [Op.like]: '%BIT314L-M%' } } }), 1);
  });

  await t.test('14. reminders: day 3 and day 6, each a fresh working link; no third', async () => {
    const monica = await account('monica');
    const live = () => db.AccountInvitation.findOne({ where: { user_account_id: monica.id, status: 'sent' } });
    const oldToken = tokenIn(inbox(emailFor('monica')).slice(-1)[0]);
    assert.ok(await findLiveInvitation(oldToken));

    await (await live()).update({ sent_at: new Date(Date.now() - 3 * DAY) });
    let mark = sent.length;
    assert.equal((await remind()).sent, 1);
    let m = since(mark);
    assert.equal(m.length, 1);
    assert.match(m[0].subject, /^Reminder: /);
    assert.match(m[0].text, /You lead: BIT111L|You lead: .*BIT314L-M/);
    assert.ok(await findLiveInvitation(tokenIn(m[0])), 'the new link works');
    assert.equal(await findLiveInvitation(oldToken), null, 'the old one is superseded');
    assert.equal((await remind()).sent, 0, 'not twice on the same day');

    await (await live()).update({ sent_at: new Date(Date.now() - 3 * DAY) });
    mark = sent.length;
    assert.equal((await remind()).sent, 1);
    assert.match(since(mark)[0].subject, /^Reminder: /);
    assert.equal(await reminderCount(monica.id), 2);

    await (await live()).update({ sent_at: new Date(Date.now() - 3 * DAY) });
    mark = sent.length;
    assert.equal((await remind()).sent, 0, 'no third reminder');
    assert.equal(since(mark).length, 0);
    assert.ok(await live(), 'the Dean still sees Invited and can Resend');
  });

  await t.test('15. old link: "Send me a new link" — sent only to a waiting account, same answer otherwise', async () => {
    let mark = sent.length;
    assert.equal(await requestInvitation(emailFor('monica')), true);
    assert.equal(since(mark).length, 1);
    assert.ok(await findLiveInvitation(tokenIn(since(mark)[0])));
    mark = sent.length;
    assert.equal(await requestInvitation(emailFor('nobody')), false);
    assert.equal(await requestInvitation(emailFor('bea')), false, 'signed in: Forgot password, not this');
    assert.equal(since(mark).length, 0);
  });

  await t.test('16. deadline 7 days away: one notification per Lead / Contributor, none on a second run', async () => {
    const soon = new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10);
    await period.update({ midterm_deadline: soon });
    const first = await deadlineNotifications({ periodId: pid });
    assert.ok(first.created >= 2, 'bea and monica at least');
    const again = await deadlineNotifications({ periodId: pid });
    assert.equal(again.created, 0);
    const bea = await account('bea');
    const rows = await db.Notification.findAll({ where: { user_account_id: bea.id, kind: 'deadline' } });
    assert.equal(rows.length, 1);
    assert.match(rows[0].title, /Midterm deadline in 7 days/);
  });

  await t.test('17. privacy: another user\'s notification is a 404', async () => {
    const bea = await account('bea');
    const monica = await account('monica');
    const theirs = await db.Notification.findOne({ where: { user_account_id: monica.id } });
    const r = await call(markRead, bea, { params: { id: theirs.id } });
    assert.equal(r.status, 404);
    const list = await call(listNotifications, bea);
    assert.ok(list.body.items.every((i) => i.id !== theirs.id));
  });

  await t.test('baseline: existing data counts as told, so a deploy emails nobody', async () => {
    await db.AccountNotice.destroy({ where: { period_id: pid } });
    const n = await baselineNotices({ periodId: pid });
    assert.ok(n >= 3);
    const mark = sent.length;
    await markDirty(await accountsInvolved(pid), { periodId: pid });
    await flush();
    assert.equal(since(mark).length, 0);
    assert.equal(await baselineNotices({ periodId: pid }), 0, 'only once');
  });

  await t.test('recordTold: an invitation that listed everything leaves nothing new', async () => {
    const bea = await account('bea');
    const state = await currentState(bea, pid);
    await recordTold(bea.id, pid, state);
    const row = await db.AccountNotice.findOne({ where: { user_account_id: bea.id, period_id: pid } });
    assert.ok(isEmpty(diff({ roles: row.told_roles, lead: row.told_lead, contributor: row.told_contributor, consultant: row.told_consultant }, state)));
  });
});
