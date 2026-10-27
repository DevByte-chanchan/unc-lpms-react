'use strict';

// The syllabus due date of a term, per program. A Program Head sets it for the programs they head, a
// Dean for the programs of their department (permission deadline:manage). The automatic reminders
// and the "not yet submitted" page read it; a program with no due date gets no automatic reminders.

const { Op } = require('sequelize');
const { Program, Department, TermDeadline } = require('../models');
const { validateDeadline } = require('../utils/deadlineValidation');
const { record: audit } = require('../utils/audit');

// The programs this person may set a deadline for.
const programsFor = async (user) => {
    if (user?.role === 'program-head') {
        return Program.findAll({ where: { stakeholder_id: user.id }, attributes: ['program_id', 'name', 'dept_id'], order: [['name', 'ASC']], raw: true });
    }
    if (user?.role === 'dean') {
        const departments = await Department.findAll({ where: { stakeholder_id: user.id }, attributes: ['dept_id'], raw: true });
        if (departments.length === 0) return [];
        return Program.findAll({ where: { dept_id: { [Op.in]: departments.map(d => d.dept_id) } }, attributes: ['program_id', 'name', 'dept_id'], order: [['name', 'ASC']], raw: true });
    }
    return [];
};

const asId = (value) => (/^[0-9]+$/.test(String(value ?? '')) ? Number(value) : null);

const audited = (req, action, entityId, details) => audit({ actor: req.user, action, entityType: 'term_deadlines', entityId, details, ip: req.ip });

// GET /api/term-deadlines?school_year=2026-2027&semester=1st — the person's programs and the deadlines set for them
const listDeadlines = async (req, res, next) => {
    try {
        const programs = await programsFor(req.user);
        const where = { program_id: { [Op.in]: programs.length ? programs.map(p => p.program_id) : [0] } };
        if (req.query.school_year) where.school_year = String(req.query.school_year);
        if (req.query.semester) where.semester = String(req.query.semester);
        const deadlines = await TermDeadline.findAll({ where, order: [['school_year', 'DESC'], ['semester', 'ASC'], ['program_id', 'ASC']], raw: true });
        return res.json({ programs, deadlines });
    } catch (error) {
        return next(error);
    }
};

// PUT /api/term-deadlines { program_id, school_year, semester, syllabus_due } — set or change one
const saveDeadline = async (req, res, next) => {
    try {
        const result = validateDeadline(req.body);
        if (!result.ok) return res.status(400).json({ error: 'The deadline is not valid.', errors: result.errors });
        const allowed = await programsFor(req.user);
        if (!allowed.some(p => p.program_id === result.values.program_id)) {
            return res.status(403).json({ error: 'You can set a deadline only for a program you head.' });
        }
        const { program_id, school_year, semester, syllabus_due } = result.values;
        const existing = await TermDeadline.findOne({ where: { program_id, school_year, semester } });
        let row;
        if (existing) {
            if (existing.syllabus_due !== syllabus_due) await existing.update({ syllabus_due, set_by: req.user.id });
            row = existing;
        } else {
            row = await TermDeadline.create({ program_id, school_year, semester, syllabus_due, set_by: req.user.id });
        }
        await audited(req, existing ? 'TERM_DEADLINE_CHANGED' : 'TERM_DEADLINE_SET', row.id, { program_id, school_year, semester, syllabus_due });
        return res.status(existing ? 200 : 201).json(row);
    } catch (error) {
        return next(error);
    }
};

// DELETE /api/term-deadlines/:id — no deadline means no automatic reminders for that program and term
const deleteDeadline = async (req, res, next) => {
    try {
        const id = asId(req.params.id);
        const row = id ? await TermDeadline.findByPk(id) : null;
        if (!row) return res.status(404).json({ error: 'Deadline not found.' });
        const allowed = await programsFor(req.user);
        if (!allowed.some(p => p.program_id === row.program_id)) return res.status(403).json({ error: 'You can remove a deadline only for a program you head.' });
        await row.destroy();
        await audited(req, 'TERM_DEADLINE_REMOVED', id, { program_id: row.program_id, school_year: row.school_year, semester: row.semester });
        return res.json({ ok: true });
    } catch (error) {
        return next(error);
    }
};

module.exports = { programsFor, listDeadlines, saveDeadline, deleteDeadline };
