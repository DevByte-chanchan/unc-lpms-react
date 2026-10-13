/**
 * Notices — "tell each person, once, what changed for them this term".
 *
 *   currentState(account, periodId)      what is true right now: roles, courses led /
 *                                        contributed to / consulted on
 *   markDirty(accountIds, opts)          something may have changed for these people
 *   accountsInvolved(periodId)           everyone a bulk write could have touched
 *   diff(told, now) / isEmpty(d)         what is NEW compared with the last email
 *   deliverDueNotices()                  the email worker's tick, after the invitations
 *   recordTold(accountId, periodId, now) an invitation just told them everything
 *   baselineNotices()                    at boot: existing data is "already told"
 *   deadlineNotifications()              daily: the 7-day and 1-day deadline notices
 *   cleanupNotifications()               daily: read notifications older than 90 days
 *   facultyLeft({ faculty, … })          a faculty row left the active term
 *
 * Every write that can change someone's roles or courses calls markDirty. That
 * is cheap and safe: the worker compares what we last TOLD the person
 * (account_notices.told_*) with currentState() after the undo window, and
 * sends nothing when nothing differs. So undo, revalidation and re-uploading
 * the same file are silent, and a burst of edits becomes one email.
 *
 * Two channels: a `notifications` row (the bell) for everyone, and ONE email —
 * an update email for people who have set a password, or their invitation
 * (carrying the news) for people who haven't. Someone whose invitation is
 * already out gets no extra email; the bell waits for their first sign-in.
 */
import { Op } from 'sequelize';
import db from '../models/index.js';
import { sendMail } from './mailer.js';
import { updateEmail } from '../templates/updateEmail.js';
import { getActiveTermId } from '../utils/latestPeriod.js';
import { ROLE_HOMES, normalizeEmail } from '../utils/roles.js';
import { schoolEmail, samePerson } from '../utils/schoolEmail.js';
import {
  createInvitation, sendInvitation, senderFor, describeRoles, appBaseUrl, facultyRowFor,
  UPLOAD_SEND_DELAY_MS, RETRY_DELAYS_MS, WAITING,
} from './invitations.js';

const {
  AccountNotice, Notification, UserAccount, Faculty, IndustryConsultant, ConsultantCourse,
  CourseOfferingAssignment, AcademicPeriod, AccountInvitation, Course,
} = db;

// A burst of changes keeps pushing the email later — but never past this.
export const MAX_DEBOUNCE_MS = 5 * 60 * 1000;
// Assignment statuses that count as "you teach this".
const COUNTED = ['Active', 'On Leave'];
// A faculty row in one of these has left the term.
export const LEFT_STATUSES = ['Inactive', 'Emeritus', 'Unlisted', 'Archived'];
const ASSIGNED_COURSES_LINK = ROLE_HOMES.Instructor;
const CONSULTANT_LINK = ROLE_HOMES['Industry Consultant'];

const sortCodes = (list) => [...new Set(list.filter(Boolean).map((c) => String(c).trim()))].sort();
const short = (s, n) => (s == null ? null : String(s).slice(0, n));
const periodOr = async (periodId) => Number(periodId) || await getActiveTermId();

// --- Who is who --------------------------------------------------------------

/** All accounts once, for the resolvers below (one query per bulk operation). */
const loadAccounts = () => UserAccount.findAll({ attributes: ['id', 'email', 'display_name', 'status', 'roles', 'must_change_password'] });

/** The account for a person: by email, else the derived school email, else an unambiguous name. */
export function accountForPerson(accounts, { name, email }) {
  const e = normalizeEmail(email);
  if (e) {
    const byEmail = accounts.find((a) => a.email === e);
    if (byEmail) return byEmail;
  }
  const derived = schoolEmail(name);
  if (derived) {
    const byDerived = accounts.find((a) => a.email === derived);
    if (byDerived && samePerson(byDerived.display_name, name)) return byDerived;
  }
  const byName = accounts.filter((a) => samePerson(a.display_name, name));
  return byName.length === 1 ? byName[0] : null;
}

/** Account ids for faculty rows (by id) of the period. */
export async function accountsForFacultyIds(periodId, facultyIds) {
  const ids = [...new Set((facultyIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const [rows, accounts] = await Promise.all([
    Faculty.findAll({ where: { id: ids }, attributes: ['id', 'name', 'email'] }),
    loadAccounts(),
  ]);
  return [...new Set(rows.map((f) => accountForPerson(accounts, f)).filter(Boolean).map((a) => a.id))];
}

/** Lead + contributor faculty ids on one assignment row. */
export const facultyIdsOnRow = (row) => {
  if (!row) return [];
  const out = [];
  if (row.faculty_id) out.push(Number(row.faculty_id));
  for (const c of (Array.isArray(row.contributors) ? row.contributors : [])) {
    if (c && c.faculty_id) out.push(Number(c.faculty_id));
  }
  return out;
};

/** Account ids for the Lead and Contributors of an assignment row. */
export const accountsOnRow = (row) => accountsForFacultyIds(row && row.period_id, facultyIdsOnRow(row));

async function consultantRowsFor(periodId, account) {
  if (!periodId) return [];
  const rows = await IndustryConsultant.findAll({ where: { period_id: periodId }, attributes: ['id', 'name', 'status'] });
  return rows.filter((r) => samePerson(r.name, account.display_name));
}

// --- What is true now ----------------------------------------------------------

/**
 * { roles, lead: [code], contributor: [code], consultant: [code], names: { code: name } }
 * for `account` in the period. Codes are sorted, so two states compare stably.
 */
export async function currentState(account, periodId) {
  const pid = await periodOr(periodId);
  const state = { roles: [...(account.roles || [])], lead: [], contributor: [], consultant: [], names: {} };
  if (!pid) return state;

  const fac = await facultyRowFor(pid, { name: account.display_name, email: account.email });
  if (fac) {
    const rows = await CourseOfferingAssignment.findAll({
      where: { period_id: pid, status: COUNTED },
      attributes: ['course_code', 'course_name', 'faculty_id', 'contributors'],
    });
    const lead = [];
    const contributor = [];
    for (const r of rows) {
      if (!r.course_code) continue;
      if (r.course_name) state.names[String(r.course_code).trim()] = r.course_name;
      if (Number(r.faculty_id) === Number(fac.id)) lead.push(r.course_code);
      else if ((Array.isArray(r.contributors) ? r.contributors : []).some((c) => c && Number(c.faculty_id) === Number(fac.id))) contributor.push(r.course_code);
    }
    state.lead = sortCodes(lead);
    state.contributor = sortCodes(contributor).filter((c) => !state.lead.includes(c));
  }

  const consultants = await consultantRowsFor(pid, account);
  if (consultants.length) {
    const links = await ConsultantCourse.findAll({
      where: { consultant_id: consultants.map((c) => c.id) },
      include: [{ model: Course, as: 'course', attributes: ['course_no', 'course_title'] }],
    });
    const codes = [];
    for (const l of links) {
      const code = l.course ? l.course.course_no : l.course_code;
      if (!code) continue;
      codes.push(code);
      if (l.course && l.course.course_title) state.names[String(code).trim()] = l.course.course_title;
    }
    state.consultant = sortCodes(codes);
  }
  return state;
}

/** { midterm, finals } as YYYY-MM-DD strings (or null) for the term. */
export async function deadlinesFor(periodId) {
  const pid = await periodOr(periodId);
  if (!pid) return { midterm: null, finals: null };
  const p = await AcademicPeriod.findByPk(pid, { attributes: ['midterm_deadline', 'finals_deadline'] });
  return { midterm: p ? p.midterm_deadline || null : null, finals: p ? p.finals_deadline || null : null };
}

// --- Marking ---------------------------------------------------------------------

/**
 * Something may have changed for these accounts in the period. Upserts the
 * row dirty with send_after = now + the upload delay; a further change pushes
 * it later (bursts combine), capped at first_dirty_at + 5 minutes.
 * Never throws: a problem here must not fail the write that just happened.
 */
export async function markDirty(accountIds, { periodId, senderId = null, delayMs = UPLOAD_SEND_DELAY_MS } = {}) {
  const ids = [...new Set((accountIds || []).map(Number).filter(Boolean))];
  const pid = await periodOr(periodId);
  if (!ids.length || !pid) return 0;
  const now = Date.now();
  let marked = 0;
  for (const id of ids) {
    try {
      const [row] = await AccountNotice.findOrCreate({
        where: { user_account_id: id, period_id: pid },
        defaults: { dirty: false, told_roles: [], told_lead: [], told_contributor: [], told_consultant: [] },
      });
      const proposed = now + delayMs;
      let sendAfter;
      let firstDirty;
      if (row.dirty && row.first_dirty_at) {
        firstDirty = new Date(row.first_dirty_at);
        const cap = firstDirty.getTime() + MAX_DEBOUNCE_MS;
        const current = row.send_after ? new Date(row.send_after).getTime() : proposed;
        sendAfter = new Date(Math.min(proposed, Math.max(cap, current)));
      } else {
        firstDirty = new Date(now);
        sendAfter = new Date(proposed);
      }
      await row.update({
        dirty: true,
        send_after: sendAfter,
        first_dirty_at: firstDirty,
        sent_by_account_id: senderId || row.sent_by_account_id || null,
      });
      marked += 1;
    } catch (err) {
      console.error('[notices] could not mark account ' + id + ':', err.message);
    }
  }
  return marked;
}

/**
 * Every account a bulk write in the period could have touched: the Lead and
 * Contributors of its assignments, everyone on its consultant list, and
 * everyone who already has a notice row for it (so people who were DROPPED
 * are told too).
 */
export async function accountsInvolved(periodId) {
  const pid = await periodOr(periodId);
  if (!pid) return [];
  const [rows, faculty, consultants, notices, accounts] = await Promise.all([
    CourseOfferingAssignment.findAll({ where: { period_id: pid, status: COUNTED }, attributes: ['faculty_id', 'contributors'] }),
    Faculty.findAll({ where: { period_id: pid }, attributes: ['id', 'name', 'email'] }),
    IndustryConsultant.findAll({ where: { period_id: pid }, attributes: ['id', 'name'] }),
    AccountNotice.findAll({ where: { period_id: pid }, attributes: ['user_account_id'] }),
    loadAccounts(),
  ]);
  const facById = new Map(faculty.map((f) => [Number(f.id), f]));
  const out = new Set(notices.map((n) => n.user_account_id));
  const facultyIds = new Set(rows.flatMap(facultyIdsOnRow));
  for (const fid of facultyIds) {
    const f = facById.get(Number(fid));
    const a = f && accountForPerson(accounts, f);
    if (a) out.add(a.id);
  }
  for (const c of consultants) {
    const a = accountForPerson(accounts, { name: c.name });
    if (a) out.add(a.id);
  }
  return [...out];
}

// --- The news ------------------------------------------------------------------

const without = (a, b) => a.filter((x) => !b.includes(x));

/**
 * What is new compared with what the person was last told. Instructor is
 * never news on its own (it shows through courses). Lead → Contributor on the
 * same course is not reported; Contributor → Lead is.
 */
export function diff(told, now) {
  const t = {
    roles: (told && told.roles) || [], lead: (told && told.lead) || [],
    contributor: (told && told.contributor) || [], consultant: (told && told.consultant) || [],
  };
  const n = {
    roles: (now && now.roles) || [], lead: (now && now.lead) || [],
    contributor: (now && now.contributor) || [], consultant: (now && now.consultant) || [],
  };
  const noInstructor = (r) => r.filter((x) => x !== 'Instructor');
  const toldTeaching = [...t.lead, ...t.contributor];
  const nowTeaching = [...n.lead, ...n.contributor];
  return {
    rolesAdded: without(noInstructor(n.roles), t.roles),
    rolesRemoved: without(noInstructor(t.roles), n.roles),
    leadAdded: without(n.lead, t.lead),
    contributorAdded: without(n.contributor, toldTeaching),
    consultantAdded: without(n.consultant, t.consultant),
    consultantRemoved: without(t.consultant, n.consultant),
    removed: without(toldTeaching, nowTeaching),
  };
}

export const isEmpty = (d) => Object.values(d || {}).every((list) => !list || list.length === 0);

const toldOf = (row) => ({
  roles: row.told_roles || [], lead: row.told_lead || [],
  contributor: row.told_contributor || [], consultant: row.told_consultant || [],
});

const toldFields = (state) => ({
  told_roles: state.roles || [], told_lead: state.lead || [],
  told_contributor: state.contributor || [], told_consultant: state.consultant || [],
});

/**
 * An invitation (or update) just told the person everything in `state`:
 * remember it, so the worker finds nothing new. Upserts the row.
 */
export async function recordTold(accountId, periodId, state, { result = null } = {}) {
  const pid = await periodOr(periodId);
  if (!accountId || !pid) return null;
  const [row] = await AccountNotice.findOrCreate({
    where: { user_account_id: accountId, period_id: pid },
    defaults: { dirty: false, ...toldFields(state) },
  });
  await row.update({
    ...toldFields(state),
    last_sent_at: result ? row.last_sent_at : new Date(),
    last_result: result ? short(result, 255) : null,
    last_error: null,
  });
  return row;
}

// --- The bell ------------------------------------------------------------------

const termLabelOf = (period) => (period && period.label) || '';
const nameFor = (state, code) => (state.names && state.names[String(code).trim()]) || null;
const bodyFor = (state, code, period) => {
  const parts = [nameFor(state, code), termLabelOf(period)].filter(Boolean);
  return parts.length ? short(parts.join(' · '), 255) : null;
};

/** The notifications rows one diff turns into (not yet written). */
export function notificationsFor(d, { state, period, roleLabels = {}, remainingRoles = [] }) {
  const items = [];
  const push = (kind, title, body, link) => items.push({ kind, title: short(title, 150), body, link: short(link, 255) });
  for (const role of d.rolesAdded) push('role_added', `You're now a ${roleLabels[role] || role}`, termLabelOf(period) || null, ROLE_HOMES[role] || '/');
  for (const role of d.rolesRemoved) {
    const home = ROLE_HOMES[remainingRoles[0]] || '/login';
    push('role_removed', `You no longer have the ${role} role`, termLabelOf(period) || null, home);
  }
  for (const code of d.leadAdded) push('lead_added', `You're the Lead Faculty for ${code}`, bodyFor(state, code, period), ASSIGNED_COURSES_LINK);
  for (const code of d.contributorAdded) push('contributor_added', `You're a Contributor to ${code}`, bodyFor(state, code, period), ASSIGNED_COURSES_LINK);
  for (const code of d.removed) push('course_removed', `You've been removed from ${code}`, termLabelOf(period) || null, ASSIGNED_COURSES_LINK);
  for (const code of d.consultantAdded) push('consultant_added', `You're the Industry Consultant for ${code}`, bodyFor(state, code, period), CONSULTANT_LINK);
  for (const code of d.consultantRemoved) push('consultant_removed', `You're no longer the consultant for ${code}`, termLabelOf(period) || null, CONSULTANT_LINK);
  return items;
}

async function writeNotifications(accountId, periodId, senderId, items) {
  if (!items.length) return [];
  return Notification.bulkCreate(items.map((n) => ({
    ...n, user_account_id: accountId, period_id: periodId, sent_by_account_id: senderId || null,
  })));
}

// --- The worker's tick ---------------------------------------------------------

/** { role: 'Program Head (BSIT)' } from describeRoles, keyed by the bare role. */
async function roleLabelsFor(account, periodId) {
  const out = {};
  try {
    for (const label of await describeRoles(account, periodId)) {
      const role = (account.roles || []).find((r) => label === r || label.startsWith(r + ' ('));
      if (role) out[role] = label;
    }
  } catch { /* plain role names then */ }
  return out;
}

const withNames = (state, codes) => codes.map((code) => ({ code, name: nameFor(state, code) }));

/**
 * For every dirty row whose send_after has come: claim it, work out the news,
 * write the bell notifications, send ONE email (update or invitation) and
 * record the outcome. See the module comment for the rules.
 */
export async function deliverDueNotices({ limit = 20, now = new Date(), accountIds = null } = {}) {
  const due = await AccountNotice.findAll({
    // accountIds: tests scope the tick to their own throw-away accounts.
    where: { ...(accountIds ? { user_account_id: accountIds } : {}), dirty: true, send_after: { [Op.lte]: now } },
    order: [['send_after', 'ASC'], ['id', 'ASC']],
    limit,
  });
  const out = { due: due.length, emailed: 0, invited: 0, silent: 0, waitingInBell: 0 };

  for (const row of due) {
    const [claimed] = await AccountNotice.update({ dirty: false }, { where: { id: row.id, dirty: true } });
    if (!claimed) continue;
    try {
      const account = await UserAccount.findByPk(row.user_account_id);
      if (!account) { out.silent += 1; continue; }
      const periodId = row.period_id;
      const state = await currentState(account, periodId);

      if (account.status !== 'Active') {
        await row.update(toldFields(state));
        out.silent += 1;
        continue;
      }

      // An invitation about to go out will carry the news — look again after it.
      const pending = await AccountInvitation.count({ where: { user_account_id: account.id, status: ['scheduled', 'sending'] } });
      if (pending && account.must_change_password) {
        await row.update({ dirty: true, send_after: new Date(now.getTime() + 15 * 1000) });
        continue;
      }

      const d = diff(toldOf(row), state);
      if (isEmpty(d)) {
        await row.update({ ...toldFields(state), first_dirty_at: null });
        out.silent += 1;
        continue;
      }

      const period = await AcademicPeriod.findByPk(periodId, { attributes: ['id', 'label', 'midterm_deadline', 'finals_deadline'] });
      const roleLabels = await roleLabelsFor(account, periodId);
      const items = notificationsFor(d, { state, period, roleLabels, remainingRoles: state.roles });
      const written = await writeNotifications(account.id, periodId, row.sent_by_account_id, items);

      if (!account.must_change_password) {
        // Signed in: the update email.
        const sender = await senderFor({
          sent_by_account_id: row.sent_by_account_id, period_id: periodId, source_entity: 'notice',
          display_name: account.display_name, email: account.email,
        });
        const mail = updateEmail({
          name: account.display_name,
          termLabel: termLabelOf(period),
          rolesAdded: d.rolesAdded.map((r) => roleLabels[r] || r),
          rolesRemoved: d.rolesRemoved,
          lead: withNames(state, d.leadAdded),
          contributor: withNames(state, d.contributorAdded),
          consultant: withNames(state, d.consultantAdded),
          consultantRemoved: d.consultantRemoved,
          removed: d.removed,
          deadlines: { midterm: period && period.midterm_deadline, finals: period && period.finals_deadline },
          link: appBaseUrl() + '/login',
          sender,
        });
        const result = await sendMail({ ...mail, to: account.email });
        await recordOutcome(row, state, result, { now, notifications: written });
        if (result.status === 'sent' || result.status === 'captured') out.emailed += 1;
        continue;
      }

      // Not signed in. An invitation already out (sent, unexpired)? Nothing
      // more: the bell waits, and the next reminder lists their latest courses.
      const live = await AccountInvitation.count({
        where: { user_account_id: account.id, status: 'sent', expires_at: { [Op.gt]: now } },
      });
      if (live) {
        await row.update({ ...toldFields(state), first_dirty_at: null, last_result: 'Waiting for sign-in — in the bell.' });
        out.waitingInBell += 1;
        continue;
      }

      // Their first invitation, carrying the news.
      const invitation = await createInvitation(account, {
        source: 'notice', emailSource: 'manual', periodId, senderId: row.sent_by_account_id, supersede: true, immediate: true,
      });
      const result = await sendInvitation(invitation, { state });
      // The bell is written; the invitation's own retries carry the email.
      await row.update({ ...toldFields(state), first_dirty_at: null, last_sent_at: result.status === 'failed' ? row.last_sent_at : now, last_error: result.status === 'failed' ? short(result.reason, 255) : null, last_result: result.status === 'skipped' ? short('Not sent: ' + (result.reason || 'skipped'), 255) : null });
      if (result.status === 'sent' || result.status === 'captured') {
        out.invited += 1;
        if (written.length) await Notification.update({ emailed_at: now }, { where: { id: written.map((n) => n.id) } });
      }
    } catch (err) {
      console.error('[notices] row ' + row.id + ' failed:', err.message);
      await row.update({ dirty: true, send_after: new Date(now.getTime() + RETRY_DELAYS_MS[0]), last_error: short(err.message, 255) }).catch(() => {});
    }
  }
  return out;
}

async function recordOutcome(row, state, result, { now, notifications }) {
  if (result.status === 'sent' || result.status === 'captured') {
    await row.update({ ...toldFields(state), first_dirty_at: null, last_sent_at: now, attempts: 0, last_error: null, last_result: null });
    if (notifications.length) await Notification.update({ emailed_at: now }, { where: { id: notifications.map((n) => n.id) } });
    return;
  }
  if (result.status === 'skipped') {
    await row.update({ ...toldFields(state), first_dirty_at: null, attempts: 0, last_error: null, last_result: short('Not sent: ' + (result.reason || 'skipped by the mailer'), 255) });
    return;
  }
  const attempts = (row.attempts || 0) + 1;
  const retryIn = RETRY_DELAYS_MS[attempts - 1];
  if (retryIn) {
    await row.update({ dirty: true, send_after: new Date(now.getTime() + retryIn), attempts, last_error: short(result.reason || 'Unknown error', 255) });
  } else {
    // Out of retries: the bell has it; don't repeat it in a later email.
    await row.update({ ...toldFields(state), first_dirty_at: null, attempts, last_error: short(result.reason || 'Unknown error', 255), last_result: 'Email failed after retries.' });
  }
}

// --- Boot, daily tasks -----------------------------------------------------------

/**
 * On deploy: the active term's existing assignments and consultant links are
 * "already told", so nobody gets an email about data that was there before
 * notices existed. Only when the term has no notice rows yet.
 */
export async function baselineNotices({ periodId = null } = {}) {
  const pid = periodId || await getActiveTermId();
  if (!pid) return 0;
  if (await AccountNotice.count({ where: { period_id: pid } })) return 0;
  const [assignments, links] = await Promise.all([
    CourseOfferingAssignment.count({ where: { period_id: pid } }),
    IndustryConsultant.count({ where: { period_id: pid } }),
  ]);
  if (!assignments && !links) return 0;
  const ids = await accountsInvolved(pid);
  let n = 0;
  for (const id of ids) {
    const account = await UserAccount.findByPk(id);
    if (!account) continue;
    const state = await currentState(account, pid);
    await AccountNotice.findOrCreate({
      where: { user_account_id: id, period_id: pid },
      defaults: { ...toldFields(state), dirty: false },
    });
    n += 1;
  }
  console.log('[notices] baseline: ' + n + ' accounts');
  return n;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const dateOnly = (d) => { const x = new Date(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); };
const daysUntil = (deadline, now) => {
  if (!deadline) return null;
  const target = Date.parse(String(deadline).slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(target)) return null;
  return Math.round((target - dateOnly(now)) / DAY_MS);
};

export const DEADLINE_DAYS = [7, 1];

/**
 * Once a day: when a deadline of the active term is 7 days or 1 day away, a
 * `deadline` notification for every Lead and Contributor with courses — once
 * per (deadline, days). Signed-in people also get it by email.
 */
export async function deadlineNotifications({ now = new Date(), periodId = null } = {}) {
  const pid = await periodOr(periodId);
  if (!pid) return { created: 0, emailed: 0 };
  const period = await AcademicPeriod.findByPk(pid, { attributes: ['id', 'label', 'midterm_deadline', 'finals_deadline'] });
  if (!period) return { created: 0, emailed: 0 };
  const due = [];
  for (const [which, value] of [['midterm', period.midterm_deadline], ['finals', period.finals_deadline]]) {
    const days = daysUntil(value, now);
    if (DEADLINE_DAYS.includes(days)) due.push({ which, days, date: value });
  }
  const out = { created: 0, emailed: 0 };
  if (!due.length) return out;

  const ids = await accountsInvolved(pid);
  for (const id of ids) {
    const account = await UserAccount.findByPk(id);
    if (!account || account.status !== 'Active') continue;
    const state = await currentState(account, pid);
    if (!state.lead.length && !state.contributor.length) continue;
    const fresh = [];
    for (const { which, days, date } of due) {
      const dedupe_key = `deadline:${pid}:${which}:${days}`;
      const exists = await Notification.count({ where: { user_account_id: id, dedupe_key } });
      if (exists) continue;
      const label = which === 'midterm' ? 'Midterm' : 'Finals';
      const n = await Notification.create({
        user_account_id: id, period_id: pid, kind: 'deadline', dedupe_key,
        title: short(`${label} deadline in ${days} ${days === 1 ? 'day' : 'days'}`, 150),
        body: short([formatDate(date), termLabelOf(period)].filter(Boolean).join(' · '), 255),
        link: ASSIGNED_COURSES_LINK,
      });
      fresh.push({ n, which, days, date, label });
      out.created += 1;
    }
    if (fresh.length && !account.must_change_password) {
      const mail = updateEmail({
        name: account.display_name,
        termLabel: termLabelOf(period),
        deadlineReminders: fresh.map((f) => ({ label: f.label, days: f.days, date: f.date })),
        deadlines: { midterm: period.midterm_deadline, finals: period.finals_deadline },
        link: appBaseUrl() + '/login',
        sender: null,
      });
      const r = await sendMail({ ...mail, to: account.email });
      if (r.status === 'sent' || r.status === 'captured') {
        out.emailed += 1;
        await Notification.update({ emailed_at: now }, { where: { id: fresh.map((f) => f.n.id) } });
      }
    }
  }
  return out;
}

/** Read notifications older than 90 days go. */
export async function cleanupNotifications({ now = new Date() } = {}) {
  return Notification.destroy({ where: { read_at: { [Op.lt]: new Date(now.getTime() - 90 * DAY_MS) } } });
}

export function formatDate(value) {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// --- Faculty leaving -------------------------------------------------------------

/**
 * A faculty row of the ACTIVE term became Inactive / Emeritus / Unlisted /
 * Archived: their account loses Instructor only (Dean, Program Head and
 * Consultant stay); with no role left it is disabled. They are marked dirty,
 * so they get a "removed from …" email only if they really lost courses.
 */
export async function facultyLeft({ faculty, periodId = null, senderId = null, activeTermId = null }) {
  if (!faculty || !LEFT_STATUSES.includes(faculty.status)) return null;
  const pid = Number(periodId || faculty.period_id);
  const active = activeTermId || await getActiveTermId();
  if (!pid || Number(active) !== pid) return null;
  const account = accountForPerson(await loadAccounts(), faculty);
  if (!account) return null;
  const roles = (account.roles || []).filter((r) => r !== 'Instructor');
  const patch = {};
  if (roles.length !== (account.roles || []).length) patch.roles = roles;
  if (!roles.length) patch.status = 'Disabled';
  if (Object.keys(patch).length) await account.update(patch);
  await markDirty([account.id], { periodId: pid, senderId });
  return { account_id: account.id, roles, disabled: !roles.length };
}

/** Did this invitation status mean "parked until there is news"? */
export const isWaitingStatus = (status) => status === WAITING;
