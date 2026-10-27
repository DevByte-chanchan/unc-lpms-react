'use strict';

// The Program Head's (and the Dean's) list of plans not yet submitted: who, since when, against which due
// date, when they were last reminded, and the controls to remind now or pause the automatic reminders.
// Everything is limited to the programs the person heads (deadline:manage).

const { Op, Transaction } = require('sequelize');
const { sequelize, Notification, ReminderPause } = require('../models');
const { programsFor } = require('./termDeadlineController');
const { findAwaiting, standing } = require('../utils/missingSubmissions');
const { schoolClock, timezoneOf } = require('../utils/reminderRules');
const { eventMessage } = require('../utils/notify');
const { POKE_WINDOW_MS } = require('./notificationController');
const { record: audit } = require('../utils/audit');

const MAX_BULK = 100;
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
        const today = schoolClock(new Date(), timezoneOf()).day;
        const ids = rows.map(r => r.offeringId);
        const notices = await lastNotices(ids);
        const paused = new Set((await ReminderPause.findAll({ where: { offering_id: { [Op.in]: ids.length ? ids : [0] } }, raw: true })).map(p => p.offering_id));

        const missing = rows.map(row => {
            const { daysLeft, status } = standing(row, today);
            const notice = notices.get(row.offeringId);
            return {
                offeringId: row.offeringId, courseCode: row.courseCode, courseTitle: row.courseTitle,
                programId: row.programId, programName: row.programName, schoolYear: row.schoolYear, semester: row.semester,
                instructorName: row.instructorName || null, instructorEmail: row.instructorEmail || null, instructorActive: row.instructorActive,
                assignedAt: row.assignedAt, planUpdatedAt: row.planUpdatedAt,
                state: row.state, isRevision: row.isRevision,
                syllabusDue: row.syllabusDue || null, daysLeft, status,
                lastReminderAt: notice ? notice.at : null, lastReminderBy: notice ? notice.by : null,
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

// POST /api/missing-submissions/remind { offeringIds: [..] } — remind these instructors now (the same
// per-plan limit as a poke, so nobody is reminded twice within a few hours)
const remindNow = async (req, res, next) => {
    try {
        const ids = [...new Set((Array.isArray(req.body?.offeringIds) ? req.body.offeringIds : []).map(asId).filter(Boolean))];
        if (ids.length === 0) return res.status(400).json({ error: 'Choose at least one plan.' });
        if (ids.length > MAX_BULK) return res.status(400).json({ error: `At most ${MAX_BULK} plans at once.` });

        const programs = await programsFor(req.user);
        const waiting = new Map((await findAwaiting({ sequelize, programIds: programs.map(p => p.program_id) })).map(r => [r.offeringId, r]));

        const results = [];
        for (const id of ids) {
            const row = waiting.get(id);
            if (!row) { results.push({ offeringId: id, status: 'not-waiting' }); continue; }
            if (!row.instructorId || !row.instructorActive) { results.push({ offeringId: id, status: 'no-instructor' }); continue; }
            const outcome = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
                const recent = await Notification.findOne({
                    where: { recipient_user_id: row.instructorId, offering_id: id, type: { [Op.in]: ['poke', 'reminder'] }, created_at: { [Op.gte]: new Date(Date.now() - POKE_WINDOW_MS) } },
                    transaction
                });
                if (recent) return 'limited';
                await Notification.create({
                    recipient_user_id: row.instructorId, type: 'poke', offering_id: id,
                    message: eventMessage(row.courseCode, 'reminder: submit your learning plan', req.user.role),
                    actor_role: req.user.role === 'dean' ? 'DEAN' : 'PROGRAM_HEAD', is_read: false
                }, { transaction });
                return 'sent';
            });
            results.push({ offeringId: id, status: outcome });
        }
        const sent = results.filter(r => r.status === 'sent').length;
        if (sent) await audit({ actor: req.user, action: 'MISSING_SUBMISSIONS_REMINDED', entityType: 'notifications', entityId: null, details: { count: sent }, ip: req.ip });
        return res.json({ sent, results });
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

module.exports = { listMissing, remindNow, setPaused };
