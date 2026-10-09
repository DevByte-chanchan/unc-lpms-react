'use strict';

// Program-level alignment data: the program's educational objectives (PEOs, each marked as related
// to the UNC mission) and its program outcomes (POs) with the PEOs and graduate attributes each
// supports. Anyone signed in may read it (instructors need it for their syllabus); only the Program
// Head of that program may change it.
//
// PO numbers (PO1, PO2, ...) are the order of po_id, which the CO-PO alignment also relies on, so
// existing outcomes keep their place and new ones are appended. An outcome that a course outcome
// is already aligned to cannot be removed.

const { sequelize, Program, Department, ProgramCourseOffering, ProgramOutcome, ProgramOutcomeAlignment, ProgramEducationalObjective } = require('../models');
const { record: audit } = require('../utils/audit');

const GRADUATE_ATTRIBUTES = Object.freeze(['EC', 'CL', 'ERC', 'LL']);
const MAX_ITEMS = 25;
const MAX_PEO_LENGTH = 500;
const MAX_PO_LENGTH = 200;

const asInt = (value) => (/^\d+$/.test(String(value ?? '')) ? Number(value) : null);
const parseNumbers = (text) => { try { const list = JSON.parse(text); return Array.isArray(list) ? list : []; } catch { return []; } };

const load = async (programId) => {
    const [peos, outcomes] = await Promise.all([
        ProgramEducationalObjective.findAll({ where: { program_id: programId }, order: [['peo_id', 'ASC']] }),
        ProgramOutcome.findAll({ where: { program_id: programId }, order: [['po_id', 'ASC']] })
    ]);
    return {
        peos: peos.map(p => ({ id: p.peo_id, statement: p.statement, missionAligned: !!p.mission_aligned })),
        outcomes: outcomes.map(o => ({ id: o.po_id, text: o.description, peos: parseNumbers(o.peo_numbers), gas: parseNumbers(o.ga_numbers) })),
        graduateAttributes: GRADUATE_ATTRIBUTES
    };
};

// GET /api/program-outcomes/programs: a Program Head's own programs; everyone else sees all.
const listPrograms = async (req, res, next) => {
    try {
        const where = req.user.role === 'program-head' ? { stakeholder_id: req.user.id } : {};
        const programs = await Program.findAll({ where, order: [['name', 'ASC']] });
        // The outcome count lets the page open on a program that already has data.
        const outcomes = await ProgramOutcome.findAll({ where: { program_id: programs.map(p => p.program_id) }, attributes: ['program_id'], raw: true });
        const counts = new Map();
        for (const { program_id: id } of outcomes) counts.set(id, (counts.get(id) || 0) + 1);
        return res.json({ programs: programs.map(p => ({ id: p.program_id, name: p.name, outcomes: counts.get(p.program_id) || 0 })) });
    } catch (err) { return next(err); }
};

// GET /api/program-outcomes/:programId
const getProgram = async (req, res, next) => {
    try {
        const programId = asInt(req.params.programId);
        const program = programId && await Program.findByPk(programId);
        if (!program) return res.status(404).json({ error: 'Program not found.' });
        const canEdit = req.user.role === 'program-head' && String(program.stakeholder_id) === String(req.user.id);
        return res.json({ program: { id: program.program_id, name: program.name }, canEdit, ...(await load(programId)) });
    } catch (err) { return next(err); }
};

// GET /api/program-outcomes/offering/:pcId: the program an offering belongs to, for its syllabus
// (access is checked by requireOfferingAccess in the route).
const getForOffering = async (req, res, next) => {
    try {
        const offering = await ProgramCourseOffering.findByPk(req.params.pcId);
        const program = offering && await Program.findByPk(offering.program_id, { include: [{ model: Department, attributes: ['name'] }] });
        if (!program) return res.status(404).json({ error: 'Program not found.' });
        return res.json({ program: { id: program.program_id, name: program.name, department: program.Department?.name || '' }, ...(await load(program.program_id)) });
    } catch (err) { return next(err); }
};

// Returns the cleaned payload or an error message.
const validate = (body) => {
    const peos = body?.peos;
    const outcomes = body?.outcomes;
    if (!Array.isArray(peos) || !Array.isArray(outcomes)) return { error: 'peos and outcomes are required.' };
    if (peos.length > MAX_ITEMS || outcomes.length > MAX_ITEMS) return { error: `At most ${MAX_ITEMS} PEOs and ${MAX_ITEMS} outcomes are allowed.` };

    const cleanPeos = [];
    for (const [index, peo] of peos.entries()) {
        const statement = String(peo?.statement ?? '').trim();
        if (!statement) return { error: `PEO ${index + 1} is empty.` };
        if (statement.length > MAX_PEO_LENGTH) return { error: `PEO ${index + 1} is longer than ${MAX_PEO_LENGTH} characters.` };
        cleanPeos.push({ statement, missionAligned: peo?.missionAligned !== false });
    }

    const seen = new Set();
    const cleanOutcomes = [];
    for (const [index, outcome] of outcomes.entries()) {
        const text = String(outcome?.text ?? '').trim();
        if (!text) return { error: `Program outcome ${index + 1} is empty.` };
        if (text.length > MAX_PO_LENGTH) return { error: `Program outcome ${index + 1} is longer than ${MAX_PO_LENGTH} characters.` };
        const id = outcome?.id == null ? null : asInt(outcome.id);
        if (outcome?.id != null && !id) return { error: `Program outcome ${index + 1} has an invalid id.` };
        if (id && seen.has(id)) return { error: `Program outcome ${index + 1} is listed twice.` };
        if (id) seen.add(id);
        const within = (list, max) => Array.isArray(list) && list.every(n => Number.isInteger(n) && n >= 1 && n <= max);
        if (!within(outcome?.peos ?? [], cleanPeos.length)) return { error: `Program outcome ${index + 1} points to a PEO that does not exist.` };
        if (!within(outcome?.gas ?? [], GRADUATE_ATTRIBUTES.length)) return { error: `Program outcome ${index + 1} has an invalid graduate attribute.` };
        const unique = (list) => [...new Set(list ?? [])].sort((a, b) => a - b);
        cleanOutcomes.push({ id, text, peos: unique(outcome.peos), gas: unique(outcome.gas) });
    }
    return { peos: cleanPeos, outcomes: cleanOutcomes };
};

// PUT /api/program-outcomes/:programId { peos: [{ statement, missionAligned }], outcomes: [{ id?, text, peos, gas }] }
const saveProgram = async (req, res, next) => {
    try {
        const programId = asInt(req.params.programId);
        const program = programId && await Program.findByPk(programId);
        if (!program) return res.status(404).json({ error: 'Program not found.' });
        if (String(program.stakeholder_id) !== String(req.user.id)) {
            return res.status(403).json({ error: 'Only the Program Head of this program can change it.' });
        }

        const clean = validate(req.body);
        if (clean.error) return res.status(400).json({ error: clean.error });

        const outcome = await sequelize.transaction(async (transaction) => {
            const existing = await ProgramOutcome.findAll({ where: { program_id: programId }, transaction });
            const existingIds = new Set(existing.map(o => o.po_id));
            if (clean.outcomes.some(o => o.id && !existingIds.has(o.id))) return { status: 400, error: 'A program outcome does not belong to this program.' };

            const kept = new Set(clean.outcomes.map(o => o.id).filter(Boolean));
            const removed = existing.filter(o => !kept.has(o.po_id));
            for (const gone of removed) {
                const used = await ProgramOutcomeAlignment.count({ where: { po_id: gone.po_id }, transaction });
                if (used > 0) return { status: 409, error: `"${gone.description.slice(0, 60)}" cannot be removed: course outcomes are already aligned to it.` };
            }

            await ProgramEducationalObjective.destroy({ where: { program_id: programId }, transaction });
            for (const peo of clean.peos) {
                await ProgramEducationalObjective.create({ program_id: programId, statement: peo.statement, mission_aligned: peo.missionAligned }, { transaction });
            }
            for (const gone of removed) await gone.destroy({ transaction });
            for (const po of clean.outcomes) {
                const fields = { description: po.text, peo_numbers: JSON.stringify(po.peos), ga_numbers: JSON.stringify(po.gas) };
                if (po.id) await ProgramOutcome.update(fields, { where: { po_id: po.id }, transaction });
                else await ProgramOutcome.create({ program_id: programId, ...fields }, { transaction });
            }
            return { status: 200 };
        });
        if (outcome.status !== 200) return res.status(outcome.status).json({ error: outcome.error });

        await audit({
            actor: req.user, action: 'PROGRAM_OUTCOMES_UPDATE', entityType: 'programs', entityId: programId,
            details: { peos: clean.peos.length, outcomes: clean.outcomes.length }, ip: req.ip
        });
        return res.json({ program: { id: program.program_id, name: program.name }, canEdit: true, ...(await load(programId)) });
    } catch (err) { return next(err); }
};

module.exports = { listPrograms, getProgram, getForOffering, saveProgram, GRADUATE_ATTRIBUTES };
