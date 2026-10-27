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
const remindApprovers = async ({ deps, clock, timeZone, programIds, result }) => {
    const { models, notify } = deps;
    const { sequelize, ReminderLog, User } = models;
    const waiting = await findWaitingOnApprovers({ sequelize, today: clock.day, timeZone, programIds });
    const directors = (await User.findAll({ where: { role: 'director-of-libraries', is_active: true }, attributes: ['user_id'], raw: true })).map(u => u.user_id);
    const perPerson = new Map();
    const entry = (id) => { if (!perPerson.has(id)) perPerson.set(id, { waiting: 0, long: 0, stalled: 0, stalledPlans: new Set(), trigger: false }); return perPerson.get(id); };
    for (const row of waiting) {
        const people = row.role === 'LIBRARY_DIRECTOR' ? directors : [row.role === 'PROGRAM_HEAD' ? row.programHeadId : row.deanId];
        for (const id of people.filter(Boolean)) {
            const e = entry(id);
            if (row.waitedDays < rules.waitLimitFor(row.role)) continue;
            e.waiting += 1;
            if (row.waitedDays >= rules.waitLimitFor('DEAN')) e.long += 1;
            if (rules.isWaitingTrigger(row.waitedDays, row.role)) e.trigger = true;
        }
        if (row.role !== 'DEAN' && row.deanId && row.waitedDays >= rules.waitLimitFor('DEAN')) {
            const e = entry(row.deanId);
            if (!e.stalledPlans.has(row.offeringId)) { e.stalledPlans.add(row.offeringId); e.stalled += 1; }
            if (rules.isWaitingTrigger(row.waitedDays, 'DEAN')) e.trigger = true;
        }
    }
    for (const [id, e] of perPerson) {
        if (!e.trigger || (e.waiting === 0 && e.stalled === 0)) continue;
        const user = await User.findByPk(id);
        if (!user || !user.is_active) continue;
        if (!(await claim(ReminderLog, `waiting:${id}`, 'waiting', clock.day))) continue;
        await notify([id], 'approval_waiting', null, rules.waitingText(e), null);
        result.approverReminders += 1;
    }
};

// programIds limits the run to those programs (null = every program), for a manual run or a test.
const runReminders = async ({ now = new Date(), env = process.env, deps = lazy(), log = () => {}, programIds = null } = {}) => {
    const { models, notify, mailer } = deps;
    const { sequelize, Notification, ReminderLog, ReminderPause, Program, User } = models;
    const clock = rules.schoolClock(now, rules.timezoneOf(env));
    const result = { day: clock.day, sent: 0, alreadySent: 0, quiet: 0, paused: 0, digests: 0, approverReminders: 0, skipped: null };
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
        if (recent.has(row.offeringId)) { result.quiet += 1; continue; }
        if (!(await claim(ReminderLog, `offering:${row.offeringId}`, kind, clock.day))) { result.alreadySent += 1; continue; }

        const text = rules.reminderText(row.courseCode, days);
        await notify([row.instructorId], 'reminder', row.offeringId, `${row.courseCode} — ${text}`, null);
        result.sent += 1;
        if (mailer.configured() && row.instructorEmail) {
            const mail = emailFor(row.courseCode, text);
            const sent = await mailer.send({ to: row.instructorEmail, ...mail });
            if (!sent.ok) log(`Reminder e-mail for offering ${row.offeringId} was not sent: ${sent.error}`);
        }
    }

    if (rules.isDigestDay(clock)) {
        const programs = await Program.findAll({ attributes: ['program_id', 'stakeholder_id'], raw: true });
        const headOf = new Map(programs.filter(p => p.stakeholder_id).map(p => [p.program_id, Number(p.stakeholder_id)]));
        const perHead = new Map();
        for (const row of waiting) {
            const head = headOf.get(row.programId);
            if (!head) continue;
            const entry = perHead.get(head) || { notSubmitted: 0, overdue: 0 };
            entry.notSubmitted += 1;
            if (standing(row, clock.day).status === 'overdue') entry.overdue += 1;
            perHead.set(head, entry);
        }
        for (const [head, counts] of perHead) {
            const user = await User.findByPk(head);
            if (!user || !user.is_active) continue;
            if (!(await claim(ReminderLog, `digest:${head}`, 'digest', clock.day))) continue;
            await notify([head], 'missing_digest', null, rules.digestText(counts.notSubmitted, counts.overdue), null);
            result.digests += 1;
        }
    }
    await remindApprovers({ deps, clock, timeZone: rules.timezoneOf(env), programIds, result });
    return result;
};

// Runs once now and then every hour. Off when LPMS_REMINDERS=0.
const startReminders = ({ env = process.env, log = console.log, setIntervalFn = setInterval } = {}) => {
    if (String(env.LPMS_REMINDERS || '').trim() === '0') { log('Automatic reminders are off (LPMS_REMINDERS=0).'); return null; }
    const run = async () => {
        try {
            const result = await runReminders({ env, log });
            if (result.sent || result.digests || result.approverReminders) log(`Reminders sent: ${result.sent}, digests: ${result.digests}, approver reminders: ${result.approverReminders}.`);
        } catch (error) {
            console.error(`Reminders did not run: ${error.message}`);
        }
    };
    run();
    const timer = setIntervalFn(run, CHECK_EVERY_MS);
    if (timer && timer.unref) timer.unref();
    return timer;
};

module.exports = { runReminders, startReminders, claim };
