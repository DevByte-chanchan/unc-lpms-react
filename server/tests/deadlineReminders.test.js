/**
 * Exam-date reminders: for a fixed "today", the right kinds are due and the
 * right people are picked (Leads of Active rows, one email each listing all
 * their courses, bell only without a password); running twice sends once;
 * DEADLINE_REMINDERS=off sends nothing.
 *
 * Real tables in a scratch term with throw-away accounts (ddl-test-<pid>-…),
 * removed afterwards. Mail goes to the mailer's test sink. Skipped when the
 * database isn't reachable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import db from '../models/index.js';
import { setMailSinkForTests } from '../services/mailer.js';
import { todayAt, dueKinds, remindersOn, sendDeadlineReminders, dueText } from '../services/deadlineReminders.js';

process.env.MAIL_MODE = 'capture';

let reachable = true;
try { await sequelize.authenticate(); } catch { reachable = false; }
const skip = !reachable && 'database not reachable';

// 2026-09-18 08:00 in Manila.
const NOW = new Date('2026-09-18T00:00:00Z');

test('todayAt: the day at UNC (Asia/Manila), not UTC', () => {
  assert.equal(todayAt(new Date('2026-11-11T17:30:00Z')), '2026-11-12');
  assert.equal(todayAt(NOW), '2026-09-18');
});

test('dueKinds: 7 days and 1 day before the midterm and final', () => {
  const period = { midterm_exam: '2026-09-25', final_exam: '2026-09-19', prelim_exam: '2026-09-19' };
  assert.deepEqual(dueKinds(period, '2026-09-18').map((k) => [k.kind, k.due_date, k.daysLeft]), [
    ['midterm_7d', '2026-09-25', 7], ['final_1d', '2026-09-19', 1],
  ]);
  assert.deepEqual(dueKinds(period, '2026-09-17'), [], '8 days and 2 days: nothing');
  assert.deepEqual(dueKinds({ midterm_exam: null, final_exam: null }, '2026-09-18'), []);
  assert.equal(dueText('2026-09-25'), 'Sep 25, 2026');
});

test('remindersOn: DEADLINE_REMINDERS, default on', () => {
  assert.equal(remindersOn({}), true);
  assert.equal(remindersOn({ DEADLINE_REMINDERS: 'on' }), true);
  assert.equal(remindersOn({ DEADLINE_REMINDERS: 'OFF' }), false);
});

test('sendDeadlineReminders: who, how many, and never twice', { skip }, async (t) => {
  const PREFIX = 'ddl-test-' + process.pid + '-';
  const SUFFIX = String(process.pid).split('').map((d) => 'abcdefghij'[d]).join('');
  const sent = [];
  setMailSinkForTests(async (m) => { sent.push(m); return { messageId: 'sink-' + sent.length }; });
  const savedSwitch = process.env.DEADLINE_REMINDERS;

  const period = await db.AcademicPeriod.create({
    label: 'DDL test ' + process.pid, school_year: '1998-1999', semester: '1', status: 'Closed',
    midterm_exam: '2026-09-25', final_exam: '2026-09-19',
  });
  t.after(async () => {
    const accounts = await db.UserAccount.findAll({ where: { email: { [Op.like]: PREFIX + '%' } }, attributes: ['id'] });
    const ids = accounts.map((a) => a.id);
    await db.DeadlineReminder.destroy({ where: { period_id: period.id } });
    await db.Notification.destroy({ where: { user_account_id: ids } });
    await db.CourseOfferingAssignment.destroy({ where: { period_id: period.id } });
    await db.Faculty.destroy({ where: { period_id: period.id } });
    await db.UserAccount.destroy({ where: { id: ids } });
    await period.destroy();
    setMailSinkForTests(null);
    if (savedSwitch === undefined) delete process.env.DEADLINE_REMINDERS; else process.env.DEADLINE_REMINDERS = savedSwitch;
  });

  const person = async (first, { password = true } = {}) => {
    const name = first + ' Ddl' + SUFFIX;
    const email = PREFIX + first.toLowerCase() + '@unc.edu.ph';
    const account = await db.UserAccount.create({ email, display_name: name, roles: ['Instructor'], password_hash: 'x', status: 'Active', must_change_password: !password });
    const faculty = await db.Faculty.create({ name, email, role: 'Instructor', status: 'Active', period_id: period.id });
    return { account, faculty, name };
  };
  const ana = await person('Ana');                      // leads two Active courses
  const ben = await person('Ben', { password: false }); // leads one, no password yet
  const cy = await person('Cy');                        // leads an Archived course only
  const di = await person('Di');                        // a Contributor only
  const row = (code, lead, extra = {}) => db.CourseOfferingAssignment.create({
    course_code: code, course_name: 'Course ' + code, faculty_name: lead.name, faculty_id: lead.faculty.id,
    status: 'Active', period_id: period.id, ...extra,
  });
  await row('DDL101', ana, { contributors: [{ faculty_id: di.faculty.id, faculty_name: di.name }] });
  await row('DDL102', ana);
  await row('DDL103', ben);
  await row('DDL104', cy, { status: 'Archived' });
  const ids = [ana, ben, cy, di].map((p) => p.account.id);
  const mailTo = (p) => sent.filter((m) => [].concat(m.to).includes(p.account.email));

  process.env.DEADLINE_REMINDERS = 'off';
  const off = await sendDeadlineReminders({ now: NOW, periodId: period.id, accountIds: ids });
  assert.equal(off.off, true);
  assert.equal(sent.length, 0);

  delete process.env.DEADLINE_REMINDERS; // default: on
  const first = await sendDeadlineReminders({ now: NOW, periodId: period.id, accountIds: ids });
  assert.deepEqual(first.due, ['midterm_7d', 'final_1d']);
  assert.equal(first.sent, 2, 'Ana: midterm and final, one email each');
  assert.equal(first.bell, 2, 'Ben: bell only, twice');
  assert.equal(first.failed, 0);

  const anaMail = mailTo(ana);
  assert.equal(anaMail.length, 2);
  assert.match(anaMail[0].subject, /Learning Plan \/ TOS before the (midterm|final) exam/);
  const midterm = anaMail.find((m) => /midterm/.test(m.subject));
  assert.match(midterm.text, /in 7 days, on Sep 25, 2026/);
  assert.match(midterm.text, /- DDL101 — Course DDL101\n- DDL102 — Course DDL102/, 'both courses in one email');
  assert.match(anaMail.find((m) => /final/.test(m.subject)).text, /tomorrow, on Sep 19, 2026/);
  assert.equal(mailTo(ben).length, 0, 'no password yet: no email');
  assert.equal(mailTo(cy).length, 0, 'Archived row: not reminded');
  assert.equal(mailTo(di).length, 0, 'Contributors are not reminded');

  const bells = await db.Notification.findAll({ where: { user_account_id: [ana.account.id, ben.account.id], kind: 'deadline_reminder' } });
  assert.equal(bells.length, 4);
  assert.ok(bells.some((b) => b.title === 'Learning Plan / TOS due before the midterm exam on Sep 25, 2026'));
  assert.equal(bells.filter((b) => b.user_account_id === ana.account.id && b.emailed_at).length, 2);

  // Running again (same day, a restart, a second process): nothing new.
  const again = await sendDeadlineReminders({ now: NOW, periodId: period.id, accountIds: ids });
  assert.equal(again.sent + again.bell, 0);
  assert.equal(again.already, 4);
  assert.equal(sent.length, 2);
  assert.equal(await db.DeadlineReminder.count({ where: { period_id: period.id } }), 4);

  // The next day: 6 days / today — nothing due.
  const nextDay = await sendDeadlineReminders({ now: new Date('2026-09-19T00:00:00Z'), periodId: period.id, accountIds: ids });
  assert.deepEqual(nextDay.due, []);
});
