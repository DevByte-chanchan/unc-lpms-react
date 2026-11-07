'use strict';

// The automatic reminders. Once an hour the job looks at every learning plan still waiting on its
// instructor, against the due date its program set for the term, and sends the reminder that is due
// today (7, 3 and 1 days before, on the day, then every 3rd day overdue; see config/reminders.js).
// On the Program Head's digest day it also sends them a summary of what is still missing, and it
// reminds the approvers (Director, Program Head, Dean) of plans that have waited on them too long.
//
// It is built so that running it twice, or after a restart, changes nothing:
//   * every reminder is written to ReminderLog under (plan, kind, day) first, and the unique key
//     refuses a second one;
//   * nothing is sent before the school day starts, or to a plan whose reminders were paused;
//   * a plan that was poked or reminded within the last few hours is left alone.
// A person always decides what happens to a plan; the job only reminds.

const { Op } = require('sequelize');
const { QUIET_HOURS, CHECK_EVERY_MS } = require('../config/reminders');
const rules = require('./reminderRules');
const { findAwaiting, standing } = require('./missingSubmissions');
const { findWaitingOnApprovers } = require('./approverWaiting');
const { yearsRule, healthCounts, healthText } = require('./referenceHealth');

const lazy = () => ({
    models: require('../models'),
    notify: require('./notify').notify,
    mailer: require('./mailer').mailer
});

// Writes the row that claims one reminder. Resolves false when it was already sent.
// Looks first, because every hourly run meets the reminders it already sent; the unique key on
// (subject, kind, day) is only the backstop against two runs racing each other.
const claim = async (ReminderLog, subject, kind, day) => {
    if (await ReminderLog.findOne({ where: { subject, kind, day }, attributes: ['id'], raw: true })) return false;
    try {
        await ReminderLog.create({ subject, kind, day });
        return true;
    } catch (error) {
        if (error && (error.name === 'SequelizeUniqueConstraintError' || /UNIQUE constraint/.test(String(error.message)))) return false;
        throw error;
    }
};

const emailFor = (courseCode, text) => ({
    subject: `LPMS reminder: ${courseCode}`,
    text: `${courseCode} - ${text}.\n\nOpen LPMS and submit it from your assigned course offerings.`
});

// Plans waiting on an approver: each approver gets one in-app summary on a day when one of their plans
// reaches its wait limit (3 days for the Director and Program Head, 7 for the Dean, then every multiple).
// The Dean is also told of plans stalled with another reviewer for 7 days or more.
const remindApprovers = async ({ deps, clock, timeZone, programIds, result, now = new Date() }) => {
    const { models, notify } = deps;
    const { sequelize, ReminderLog, User } = models;
    const waiting = await findWaitingOnApprovers({ sequelize, today: clock.day, timeZone, programIds });
    const directors = (await User.findAll({ where: { role: 'director-of-libraries', is_active: true }, attributes: ['user_id'], raw: true })).map(u => u.user_id);
    const perPerson = new Map();
    const entry = (id) => { if (!perPerson.has(id)) perPerson.set(id, { waiting: 0, long: 0, stalled: 0, stalledPlans: new Set(), plans: new Set(), trigger: false }); return perPerson.get(id); };
    for (const row of waiting) {
        const people = row.role === 'LIBRARY_DIRECTOR' ? directors : [row.role === 'PROGRAM_HEAD' ? row.programHeadId : row.deanId];
        for (const id of people.filter(Boolean)) {
            const e = entry(id);
            if (row.waitedDays < rules.waitLimitFor(row.role)) continue;
            e.waiting += 1;
            e.plans.add(row.offeringId);
            if (row.waitedDays >= rules.waitLimitFor('DEAN')) e.long += 1;
            if (rules.isWaitingTrigger(row.waitedDays, row.role)) e.trigger = true;
        }
        if (row.role !== 'DEAN' && row.deanId && row.waitedDays >= rules.waitLimitFor('DEAN')) {
            const e = entry(row.deanId);
            if (!e.stalledPlans.has(row.offeringId)) { e.stalledPlans.add(row.offeringId); e.stalled += 1; }
            e.plans.add(row.offeringId);
            if (rules.isWaitingTrigger(row.waitedDays, 'DEAN')) e.trigger = true;
        }
    }
    for (const [id, e] of perPerson) {
        if (!e.trigger || (e.waiting === 0 && e.stalled === 0)) continue;
        const user = await User.findByPk(id);
        if (!user || !user.is_active) continue;
        if (!(await claim(ReminderLog, `waiting:${id}`, 'waiting', clock.day))) continue;
        // About exactly one plan: name it, so the notification opens that plan instead of the list.
        const onlyPlan = e.plans.size === 1 ? [...e.plans][0] : null;
        await notify([id], 'approval_waiting', onlyPlan, rules.waitingText(e), null, now);
        result.approverReminders += 1;
    }
};

// On the digest day the Director of Libraries gets one summary of the references that need attention
// (unavailable, older than their recency rule, missing an ISBN or link). Nothing is sent when all is well.
const remindDirectors = async ({ deps, clock, result, now = new Date() }) => {
    const { models, notify } = deps;
    const { Reference, ReminderLog, User } = models;
    const refs = await Reference.findAll({ where: { archived: false }, raw: true });
    const counts = healthCounts(refs, { years: await yearsRule(models), currentYear: Number(clock.day.slice(0, 4)) });
    if (counts.needAttention === 0) return;
    const directors = await User.findAll({ where: { role: 'director-of-libraries', is_active: true }, attributes: ['user_id'], raw: true });
    for (const { user_id: id } of directors) {
        if (!(await claim(ReminderLog, `refhealth:${id}`, 'digest', clock.day))) continue;
        await notify([id], 'reference_health', null, healthText(counts), null, now);
        result.referenceDigests += 1;
    }
};

// programIds limits the run to those programs (null = every program), for a manual run or a test.
const runReminders = async ({ now = new Date(), env = process.env, deps = lazy(), log = () => {}, programIds = null } = {}) => {
    const { models, notify, mailer } = deps;
    const { sequelize, Notification, ReminderLog, ReminderPause, Program, User } = models;
    const clock = rules.schoolClock(now, rules.timezoneOf(env));
    const result = { day: clock.day, sent: 0, emailRetries: 0, alreadySent: 0, quiet: 0, paused: 0, digests: 0, approverReminders: 0, referenceDigests: 0, skipped: null };
    if (!rules.isSendingHour(clock)) { result.skipped = 'before the school day starts'; return result; }

    const waiting = await findAwaiting({ sequelize, programIds });
    const ids = waiting.map(row => row.offeringId);
    const pausedIds = new Set((await ReminderPause.findAll({ where: { offering_id: { [Op.in]: ids.length ? ids : [0] } }, raw: true })).map(p => p.offering_id));
    const recent = new Set((await Notification.findAll({
        where: { offering_id: { [Op.in]: ids.length ? ids : [0] }, type: { [Op.in]: ['poke', 'reminder'] }, created_at: { [Op.gte]: new Date(now.getTime() - QUIET_HOURS * 3600 * 1000) } },
        attributes: ['offering_id'], raw: true
    })).map(n => n.offering_id));

    for (const row of waiting) {
        if (!row.syllabusDue || !row.instructorId || !row.instructorActive) continue;
        const days = rules.daysUntil(row.syllabusDue, clock.day);
        const kind = rules.reminderKindFor(days);
        if (!kind) continue;
        if (pausedIds.has(row.offeringId)) { result.paused += 1; continue; }

        const subject = `offering:${row.offeringId}`;
        const text = rules.reminderText(row.courseCode, days, row.state === 'Returned');
        const wantsEmail = mailer.configured() && row.instructorEmail;
        // The e-mail is recorded as sent only once it really went (its own ReminderLog row, "email:offering:12"),
        // so a mail server that was down is tried again at the next hourly check, the same day only.
        const sendEmail = async () => {
            const sent = await mailer.send({ to: row.instructorEmail, ...emailFor(row.courseCode, text) });
            if (sent.ok) await claim(ReminderLog, `email:${subject}`, kind, clock.day);
            else log(`Reminder e-mail for offering ${row.offeringId} was not sent: ${sent.error}`);
        };

        // Today's in-app reminder already went out but its e-mail did not: retry only the e-mail.
        // Checked before the quiet window, because that reminder is itself what makes the plan "recent".
        if (wantsEmail
            && await ReminderLog.findOne({ where: { subject, kind, day: clock.day }, attributes: ['id'], raw: true })
            && !(await ReminderLog.findOne({ where: { subject: `email:${subject}`, kind, day: clock.day }, attributes: ['id'], raw: true }))) {
            await sendEmail();
            result.emailRetries += 1;
            continue;
        }

        if (recent.has(row.offeringId)) { result.quiet += 1; continue; }
        if (!(await claim(ReminderLog, subject, kind, clock.day))) { result.alreadySent += 1; continue; }

        await notify([row.instructorId], 'reminder', row.offeringId, `${row.courseCode} — ${text}`, null, now);
        result.sent += 1;
        if (wantsEmail) await sendEmail();
    }

    if (rules.isDigestDay(clock)) {
        const programs = await Program.findAll({ attributes: ['program_id', 'stakeholder_id'], raw: true });
        const headOf = new Map(programs.filter(p => p.stakeholder_id).map(p => [p.program_id, Number(p.stakeholder_id)]));
        const perHead = new Map();
        for (const row of waiting) {
            const head = headOf.get(row.programId);
            if (!head) continue;
            const entry = perHead.get(head) || { notSubmitted: 0, overdue: 0, noDueDate: 0, noInstructor: 0 };
            entry.notSubmitted += 1;
            const where = standing(row, clock.day).status;
            if (where === 'overdue') entry.overdue += 1;
            if (where === 'no-deadline') entry.noDueDate += 1;
            if (!row.instructorId || !row.instructorActive) entry.noInstructor += 1;
            perHead.set(head, entry);
        }
        for (const [head, counts] of perHead) {
            const user = await User.findByPk(head);
            if (!user || !user.is_active) continue;
            if (!(await claim(ReminderLog, `digest:${head}`, 'digest', clock.day))) continue;
            await notify([head], 'missing_digest', null, rules.digestText(counts.notSubmitted, counts.overdue, counts), null, now);
            result.digests += 1;
        }
        // Not tied to a program: skipped when the run is limited to some programs (a test or a manual run).
        if (!programIds) await remindDirectors({ deps, clock, result, now });
    }
    await remindApprovers({ deps, clock, timeZone: rules.timezoneOf(env), programIds, result, now });
    return result;
};

// Runs once now and then every hour. Off when LPMS_REMINDERS=0.
const startReminders = ({ env = process.env, log = console.log, setIntervalFn = setInterval, runFn = runReminders } = {}) => {
    if (String(env.LPMS_REMINDERS || '').trim() === '0') { log('Automatic reminders are off (LPMS_REMINDERS=0).'); return null; }
    // A run that is still going (a slow mail server) is not joined by the next hourly one.
    let running = false;
    const run = async () => {
        if (running) { log('Reminders are still running from the last check; this check is skipped.'); return; }
        running = true;
        try {
            const result = await runFn({ env, log });
            if (result.sent || result.digests || result.approverReminders || result.referenceDigests) log(`Reminders sent: ${result.sent}, digests: ${result.digests}, approver reminders: ${result.approverReminders}, reference digests: ${result.referenceDigests}.`);
        } catch (error) {
            console.error(`Reminders did not run: ${error.message}`);
        } finally {
            running = false;
        }
    };
    run();
    const timer = setIntervalFn(run, CHECK_EVERY_MS);
    if (timer && timer.unref) timer.unref();
    return timer;
};

module.exports = { runReminders, startReminders, claim, remindDirectors };
