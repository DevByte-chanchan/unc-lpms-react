'use strict';

// The Program Head's (and the Dean's) list of plans not yet submitted: who, since when, against which due
// date, when they were last reminded, and the control to pause the automatic reminders.
// Everything is limited to the programs the person heads (deadline:manage).

const { Op } = require('sequelize');
const { sequelize, Notification, ReminderPause, ReminderLog } = require('../models');
const { programsFor } = require('./termDeadlineController');
const { findAwaiting, standing } = require('../utils/missingSubmissions');
const { schoolClock, timezoneOf, asDate, daysUntil, reminderText } = require('../utils/reminderRules');
const { claim } = require('../utils/reminderJob');
const { notify } = require('../utils/notify');
const { mailer } = require('../utils/mailer');
const { record: audit } = require('../utils/audit');

const asId = (value) => (/^[0-9]+$/.test(String(value ?? '')) ? Number(value) : null);

const lastNotices = async (offeringIds) => {
    if (offeringIds.length === 0) return new Map();
    const rows = await Notification.findAll({
        where: { offering_id: { [Op.in]: offeringIds }, type: { [Op.in]: ['poke', 'reminder'] } },
        attributes: ['offering_id', 'type', 'created_at'], order: [['created_at', 'DESC']], raw: true
    });
    const latest = new Map();
    for (const row of rows) if (!latest.has(row.offering_id)) latest.set(row.offering_id, { at: row.created_at, by: row.type === 'poke' ? 'a person' : 'the system' });
    return latest;
};

// GET /api/missing-submissions?school_year=2026-2027&semester=1st
const listMissing = async (req, res, next) => {
    try {
        const programs = await programsFor(req.user);
        const rows = await findAwaiting({
            sequelize, programIds: programs.map(p => p.program_id),
            schoolYear: req.query.school_year ? String(req.query.school_year) : null,
            semester: req.query.semester ? String(req.query.semester) : null
        });
        const zone = timezoneOf();
        const today = schoolClock(new Date(), zone).day;
        const ids = rows.map(r => r.offeringId);
        const notices = await lastNotices(ids);
        const paused = new Set((await ReminderPause.findAll({ where: { offering_id: { [Op.in]: ids.length ? ids : [0] } }, raw: true })).map(p => p.offering_id));

        const missing = rows.map(row => {
            const { daysLeft, status } = standing(row, today);
            const notice = notices.get(row.offeringId);
            // The day the course was assigned, and how many days that left before the due date (negative: assigned
            // after it). A plan can still be submitted late; this says why it was.
            const assignedDay = row.assignedAt ? schoolClock(asDate(row.assignedAt), zone).day : null;
            // days in the school's zone, not UTC: a reminder at 7 AM in Manila is still that day
            const dayOf = (at) => (at ? schoolClock(asDate(at), zone).day : null);
            return {
                offeringId: row.offeringId, courseCode: row.courseCode, courseTitle: row.courseTitle,
                programId: row.programId, programName: row.programName, schoolYear: row.schoolYear, semester: row.semester,
                instructorName: row.instructorName || null, instructorEmail: row.instructorEmail || null, instructorActive: row.instructorActive,
                assignedAt: row.assignedAt, assignedDay, planUpdatedAt: row.planUpdatedAt,
                assignedDaysBeforeDue: assignedDay && row.syllabusDue ? daysUntil(row.syllabusDue, assignedDay) : null,
                state: row.state, isRevision: row.isRevision, returnedDay: dayOf(row.returnedAt),
                syllabusDue: row.syllabusDue || null, daysLeft, status,
                lastReminderAt: notice ? notice.at : null, lastReminderDay: dayOf(notice?.at), lastReminderBy: notice ? notice.by : null,
                remindersPaused: paused.has(row.offeringId)
            };
        });
        const summary = {
            notSubmitted: missing.length,
            overdue: missing.filter(m => m.status === 'overdue').length,
            dueSoon: missing.filter(m => m.status === 'due-soon').length,
            noDeadline: missing.filter(m => m.status === 'no-deadline').length
        };
        return res.json({ today, summary, missing });
    } catch (error) {
        return next(error);
    }
};

// PUT /api/missing-submissions/:offeringId/pause { paused: true|false }
const setPaused = async (req, res, next) => {
    try {
        const id = asId(req.params.offeringId);
        if (!id || typeof req.body?.paused !== 'boolean') return res.status(400).json({ error: 'Give an offering and paused: true or false.' });
        const programs = await programsFor(req.user);
        const known = (await findAwaiting({ sequelize, programIds: programs.map(p => p.program_id) })).some(r => r.offeringId === id);
        if (!known) return res.status(404).json({ error: 'That plan is not waiting on its instructor, or is not in a program you head.' });
        if (req.body.paused) await ReminderPause.findOrCreate({ where: { offering_id: id }, defaults: { paused_by: req.user.id } });
        else await ReminderPause.destroy({ where: { offering_id: id } });
        await audit({ actor: req.user, action: req.body.paused ? 'REMINDERS_PAUSED' : 'REMINDERS_RESUMED', entityType: 'offerings', entityId: id, ip: req.ip });
        return res.json({ offeringId: id, remindersPaused: req.body.paused });
    } catch (error) {
        return next(error);
    }
};

// POST /api/missing-submissions/:offeringId/remind — the Program Head reminds the instructor now, in the app and by
// e-mail when mail is set up. Once per plan per day (ReminderLog "manual:offering:<id>"), so a person cannot flood an
// instructor; it counts as "reminded by a person", which also keeps the automatic one quiet for the day.
const remindNow = async (req, res, next) => {
    try {
        const id = asId(req.params.offeringId);
        if (!id) return res.status(400).json({ error: 'Give an offering.' });
        const programs = await programsFor(req.user);
        const row = (await findAwaiting({ sequelize, programIds: programs.map(p => p.program_id) })).find(r => r.offeringId === id);
        if (!row) return res.status(404).json({ error: 'That plan is not waiting on its instructor, or is not in a program you head.' });
        if (!row.instructorId || !row.instructorActive) return res.status(409).json({ error: 'This course has no active instructor to remind.' });
        const zone = timezoneOf();
        const today = schoolClock(new Date(), zone).day;
        // One reminder a day per plan from anyone: if the system already reminded today, a second ping is noise.
        const last = (await lastNotices([id])).get(id);
        if (last && schoolClock(asDate(last.at), zone).day === today) {
            return res.status(409).json({ error: `${row.courseCode}'s instructor was already reminded today. Try again tomorrow.` });
        }
        if (!(await claim(ReminderLog, `manual:offering:${id}`, 'manual', today))) {
            return res.status(409).json({ error: `${row.courseCode}'s instructor was already reminded today. Try again tomorrow.` });
        }
        const days = row.syllabusDue ? daysUntil(row.syllabusDue, today) : null;
        const text = days == null ? `reminder: ${row.state === 'Returned' ? 'resubmit' : 'submit'} your learning plan`
            : reminderText(row.courseCode, days, row.state === 'Returned');
        await notify([row.instructorId], 'poke', id, `${row.courseCode} — ${text} (from your Program Head)`, null);
        if (mailer.configured() && row.instructorEmail) {
            await mailer.send({ to: row.instructorEmail, subject: `LPMS reminder: ${row.courseCode}`,
                text: `${row.courseCode} - ${text}.

Your Program Head sent this reminder. Open LPMS and submit it from your assigned course offerings.` });
        }
        await audit({ actor: req.user, action: 'REMINDER_SENT_MANUALLY', entityType: 'offerings', entityId: id, ip: req.ip });
        return res.json({ offeringId: id, lastReminderAt: new Date().toISOString(), lastReminderBy: 'a person' });
    } catch (error) {
        return next(error);
    }
};

module.exports = { listMissing, setPaused, remindNow };
