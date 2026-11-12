/**
 * Exam-date reminders: 7 days and 1 day before the current term's midterm and
 * final exams (academic_periods.midterm_exam / final_exam), every Lead Faculty
 * of an Active assignment gets ONE bell line and ONE email listing all their
 * courses: "submit your Learning Plan / TOS for <courses> before <date>".
 *
 * Run by the email worker once an hour (cheap when nothing is due). Never
 * twice: the reminder's deadline_reminders row is inserted BEFORE anything is
 * sent, and its UNIQUE (account, term, kind, due_date) key refuses a second
 * claim — another run, another API process or a restart. A send that FAILS
 * gives its claim back, so the next hour tries again.
 *
 *   DEADLINE_REMINDERS=on|off   default on. MAIL_DEV_ALLOWLIST / MAIL_MODE
 *                               still apply (services/mailer.js).
 *
 * No submission data in this module (that is the Learning Plan Approval
 * system's), so everyone leading an Active course is reminded. Someone who
 * hasn't set a password yet gets the bell line only; their invitation and its
 * reminders are already in their inbox.
 */
import { UniqueConstraintError } from 'sequelize';
import db from '../models/index.js';
import { sendMail } from './mailer.js';
import { accountForPerson } from './notices.js';
import { appBaseUrl } from './invitations.js';
import { getActiveTermId } from '../utils/latestPeriod.js';
import { ROLE_HOMES } from '../utils/roles.js';
import { displayName } from '../utils/nameCase.js';
import { deadlineReminderEmail } from '../templates/deadlineReminderEmail.js';

const { AcademicPeriod, CourseOfferingAssignment, Faculty, UserAccount, Notification, DeadlineReminder } = db;

export const REMINDER_DAYS = [7, 1];
export const EXAMS = [
  { key: 'midterm', field: 'midterm_exam', label: 'midterm exam' },
  { key: 'final', field: 'final_exam', label: 'final exam' },
];
export const REMINDER_TIMEZONE = 'Asia/Manila';
const LINK = ROLE_HOMES.Instructor;

/** DEADLINE_REMINDERS: anything but "off" (any case) is on; unset is on. */
export const remindersOn = (env = process.env) => String(env.DEADLINE_REMINDERS ?? 'on').trim().toLowerCase() !== 'off';

/** The calendar day of `now` at UNC, "YYYY-MM-DD". */
export function todayAt(now = new Date(), timeZone = REMINDER_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const dayNumber = (ymd) => Math.round(Date.parse(String(ymd).slice(0, 10) + 'T00:00:00Z') / 86400000);

/** "Oct 5, 2026" */
export const dueText = (ymd) => new Date(String(ymd).slice(0, 10) + 'T00:00:00Z')
  .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** The reminders due on `today` for this term: [{ kind, exam, label, due_date, daysLeft }]. */
export function dueKinds(period, today) {
  const out = [];
  if (!period) return out;
  for (const exam of EXAMS) {
    const date = period[exam.field];
    if (!date) continue;
    const daysLeft = dayNumber(date) - dayNumber(today);
    if (REMINDER_DAYS.includes(daysLeft)) {
      out.push({ kind: exam.key + '_' + daysLeft + 'd', exam: exam.key, label: exam.label, due_date: String(date).slice(0, 10), daysLeft });
    }
  }
  return out;
}

/**
 * Who to remind, from the term's rows: each Active row's Lead → their account.
 * Pure. Returns [{ account, courses: [{ code, name }] }], one per account.
 */
export function pickRecipients(rows, facultyRows, accounts) {
  const facultyById = new Map((facultyRows || []).map((f) => [Number(f.id), f]));
  const byAccount = new Map();
  for (const r of rows || []) {
    if (r.status !== 'Active' || !String(r.faculty_name || '').trim()) continue;
    const person = facultyById.get(Number(r.faculty_id)) || { name: r.faculty_name, email: null };
    const account = accountForPerson(accounts, person);
    if (!account || account.status !== 'Active') continue;
    if (!byAccount.has(account.id)) byAccount.set(account.id, { account, courses: [] });
    const entry = byAccount.get(account.id);
    if (!entry.courses.some((c) => c.code === r.course_code)) entry.courses.push({ code: r.course_code, name: r.course_name || null });
  }
  for (const e of byAccount.values()) e.courses.sort((a, b) => a.code.localeCompare(b.code));
  return [...byAccount.values()];
}

const short = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);

/**
 * Send what is due now. `periodId` defaults to the current term; `accountIds`
 * limits it (tests). Returns { off?, today, due: [kinds], sent, bell, skipped, failed, already }.
 */
export async function sendDeadlineReminders({ now = new Date(), periodId = null, accountIds = null } = {}) {
  const today = todayAt(now);
  const out = { today, due: [], sent: 0, bell: 0, skipped: 0, failed: 0, already: 0 };
  if (!remindersOn()) return { ...out, off: true };

  const pid = periodId || await getActiveTermId();
  if (!pid) return out;
  const period = await AcademicPeriod.findByPk(pid);
  const kinds = dueKinds(period, today);
  out.due = kinds.map((k) => k.kind);
  if (!kinds.length) return out;

  const rows = await CourseOfferingAssignment.findAll({ where: { period_id: pid, status: 'Active' }, raw: true });
  const facultyIds = [...new Set(rows.map((r) => r.faculty_id).filter(Boolean))];
  const [facultyRows, accounts] = await Promise.all([
    facultyIds.length ? Faculty.findAll({ where: { id: facultyIds }, attributes: ['id', 'name', 'email'], raw: true }) : [],
    UserAccount.findAll({ attributes: ['id', 'email', 'display_name', 'status', 'roles', 'must_change_password'] }),
  ]);
  let recipients = pickRecipients(rows, facultyRows, accounts);
  if (accountIds) recipients = recipients.filter((r) => accountIds.includes(r.account.id));

  for (const k of kinds) {
    for (const { account, courses } of recipients) {
      // Claim first: the UNIQUE key makes this the only send, ever.
      let claim;
      try {
        claim = await DeadlineReminder.create({ user_account_id: account.id, period_id: pid, kind: k.kind, due_date: k.due_date, courses, status: 'sending' });
      } catch (err) {
        if (err instanceof UniqueConstraintError) { out.already += 1; continue; }
        throw err;
      }
      const due = dueText(k.due_date);
      const codes = courses.map((c) => c.code).join(', ');
      let bellLine = null;
      try {
        bellLine = await Notification.create({
          user_account_id: account.id, period_id: pid, kind: 'deadline_reminder',
          title: short(`Learning Plan / TOS due before the ${k.label} on ${due}`, 150),
          body: short(`Submit your Learning Plan / TOS for ${codes} before ${due}.`, 255),
          link: LINK, target_type: 'role', target_id: 'Instructor',
        });
        if (account.must_change_password) {
          await claim.update({ status: 'bell', result: 'No password yet: in the bell only.' });
          out.bell += 1;
          continue;
        }
        const mail = deadlineReminderEmail({
          name: displayName(account.display_name), termLabel: period.label || '', examLabel: k.label,
          dueText: due, daysLeft: k.daysLeft, courses, link: appBaseUrl() + '/login',
        });
        const result = await sendMail({ ...mail, to: account.email });
        if (result.status === 'sent' || result.status === 'captured') {
          await claim.update({ status: 'sent', result: null });
          await bellLine.update({ emailed_at: now });
          out.sent += 1;
        } else if (result.status === 'skipped') {
          await claim.update({ status: 'skipped', result: short('Not emailed: ' + (result.reason || 'skipped'), 255) });
          out.skipped += 1;
        } else {
          throw new Error(result.reason || 'the email could not be sent');
        }
      } catch (err) {
        // Give the claim back (and the bell line), so the next run retries.
        console.error(`[deadlines] ${k.kind} for account ${account.id} failed:`, err.message);
        if (bellLine) await bellLine.destroy().catch(() => {});
        await claim.destroy().catch(() => {});
        out.failed += 1;
      }
    }
  }
  if (out.sent || out.bell || out.skipped || out.failed) {
    console.log(`[deadlines] ${today} ${out.due.join(', ')}: ${out.sent} emailed, ${out.bell} bell only, ${out.skipped} not emailed, ${out.failed} failed`);
  }
  return out;
}
