// controllers/referenceController.js
//
// The reference collection. Readable by every signed-in role; writes (create, edit, archive,
// import) need reference:manage (the Director of Libraries), enforced in routes/references.js.
// What a reference may contain is decided by config/referenceTypes.js only.

const { Reference, sequelize, Sequelize } = require('../models');
const { describeTypes, FIELDS } = require('../config/referenceTypes');
const { validateReference, duplicateKey, changedFields } = require('../utils/referenceValidation');
const { record: audit } = require('../utils/audit');

const MAX_IMPORT_ROWS = 1000;

const asId = (value) => (/^\d+$/.test(String(value ?? '')) ? Number(value) : null);

const auditReference = (req, action, referenceId, details = {}) => audit({
    actor: req.user, action, entityType: 'references', entityId: referenceId,
    details: { reference_id: referenceId, ...details }, ip: req.ip
});

// GET /api/references/types — the form definition, straight from the config
async function getReferenceTypes(req, res) {
    return res.json({ types: describeTypes() });
}

// GET /api/references — selectable references. Archived ones are left out unless asked for, so
// they cannot be picked for new links (plans that already use them still show them).
async function getAllReferences(req, res) {
    try {
        const includeArchived = ['1', 'true'].includes(String(req.query.includeArchived));
        const refs = await Reference.findAll({
            where: includeArchived ? {} : { archived: false },
            order: [['title', 'ASC']],
            raw: true
        });
        return res.json(refs);
    } catch (err) {
        console.error('getAllReferences error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// GET /api/references/:id
async function getReference(req, res) {
    try {
        const id = asId(req.params.id);
        const ref = id ? await Reference.findByPk(id, { raw: true }) : null;
        if (!ref) return res.status(404).json({ message: 'Reference not found.' });
        return res.json(ref);
    } catch (err) {
        console.error('getReference error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// POST /api/references
async function createReference(req, res) {
    try {
        const result = validateReference(req.body);
        if (!result.ok) return res.status(400).json({ message: 'The reference is not valid.', errors: result.errors });

        const created = await Reference.create({ ...result.values, archived: false, created_by: req.user.id });
        // Field NAMES only, never their values.
        const fields = Object.entries(FIELDS).filter(([, def]) => result.values[def.column] != null).map(([key]) => key);
        await auditReference(req, 'REFERENCE_CREATED', created.reference_id, { type: result.values.type, fields });
        return res.status(201).json(created);
    } catch (err) {
        console.error('createReference error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// PUT /api/references/:id — the whole record, validated as a create would be
async function updateReference(req, res) {
    try {
        const id = asId(req.params.id);
        const stored = id ? await Reference.findByPk(id) : null;
        if (!stored) return res.status(404).json({ message: 'Reference not found.' });

        const result = validateReference(req.body);
        if (!result.ok) return res.status(400).json({ message: 'The reference is not valid.', errors: result.errors });

        const changed = changedFields(stored.get({ plain: true }), result.values);
        if (changed.length === 0) return res.json(stored);
        await stored.update(result.values);
        await auditReference(req, 'REFERENCE_UPDATED', id, { changed });
        return res.json(stored);
    } catch (err) {
        console.error('updateReference error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

const setArchived = (archived) => async (req, res) => {
    try {
        const id = asId(req.params.id);
        const stored = id ? await Reference.findByPk(id) : null;
        if (!stored) return res.status(404).json({ message: 'Reference not found.' });
        if (Boolean(stored.archived) !== archived) {
            await stored.update({ archived });
            await auditReference(req, archived ? 'REFERENCE_ARCHIVED' : 'REFERENCE_UNARCHIVED', id);
        }
        return res.json(stored);
    } catch (err) {
        console.error('setArchived error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * POST /api/references/import  { rows: [{ type, title, authors, isbn, year, link, publisher }], dryRun }
 * Validates every row against the type config. dryRun only reports; otherwise the valid,
 * non-duplicate rows are created. A row is a duplicate when a reference with the same title and
 * authors already exists (or appears earlier in the same batch). Row numbers are 1-based.
 * Used for CSV import and for the one-time upload of references saved in the old local store.
 */
async function importReferences(req, res) {
    try {
        const rows = req.body?.rows;
        const dryRun = req.body?.dryRun === true;
        if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'rows must be a non-empty array.' });
        if (rows.length > MAX_IMPORT_ROWS) return res.status(400).json({ message: `At most ${MAX_IMPORT_ROWS} rows per import.` });

        const seen = new Set((await Reference.findAll({ attributes: ['title', 'author'], raw: true })).map(r => duplicateKey(r.title, r.author)));
        const report = [];
        const toCreate = [];
        rows.forEach((row, index) => {
            const result = validateReference(row);
            if (!result.ok) return report.push({ row: index + 1, status: 'invalid', errors: result.errors });
            const key = duplicateKey(result.values.title, result.values.author);
            if (seen.has(key)) return report.push({ row: index + 1, status: 'duplicate' });
            seen.add(key);
            toCreate.push({ index, values: result.values });
            return report.push({ row: index + 1, status: 'ok' });
        });

        if (!dryRun && toCreate.length > 0) {
            const created = await sequelize.transaction(t => Promise.all(toCreate.map(({ values }) =>
                Reference.create({ ...values, archived: false, created_by: req.user.id }, { transaction: t }))));
            created.forEach((ref, i) => { report[toCreate[i].index].status = 'created'; report[toCreate[i].index].referenceId = ref.reference_id; });
            for (const ref of created) await auditReference(req, 'REFERENCE_CREATED', ref.reference_id, { type: ref.type, via: 'import' });
        }

        const count = (status) => report.filter(r => r.status === status).length;
        return res.status(dryRun ? 200 : 201).json({
            dryRun,
            total: rows.length,
            created: count('created'),
            valid: count('ok') + count('created'),
            duplicates: count('duplicate'),
            invalid: count('invalid'),
            rows: report
        });
    } catch (err) {
        console.error('importReferences error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * GET /api/references/library
 * Reference Library source of truth: every reference in the database (archived ones flagged) plus
 * the list of courses that actually use it (via ILOReferences → ILO → CO → Offering).
 */
async function getReferenceLibrary(req, res) {
    try {
        const rows = await sequelize.query(
            `SELECT
                 r.reference_id,
                 r.title,
                 r.type,
                 r.author,
                 r.isbn,
                 r.link,
                 r.publisher,
                 r.publication_year,
                 r.archived,
                 r.created_by,
                 r.createdAt,
                 GROUP_CONCAT(DISTINCT crs.course_no) AS used_in_courses,
                 GROUP_CONCAT(DISTINCT p.name) AS programs,
                 GROUP_CONCAT(DISTINCT d.name) AS departments
             FROM \`References\` r
                 LEFT JOIN ILOReferences ir ON ir.reference_id = r.reference_id
                 LEFT JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = ir.ilo_id
                 LEFT JOIN CourseOutcomes co ON co.co_id = ilo.co_id
                 LEFT JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
                 LEFT JOIN Courses crs ON crs.course_id = pco.course_id
                 LEFT JOIN Programs p ON p.program_id = pco.program_id
                 LEFT JOIN Departments d ON d.dept_id = pco.dept_id
             GROUP BY r.reference_id
             ORDER BY r.title ASC;`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        return res.json(rows);
    } catch (err) {
        console.error('getReferenceLibrary error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = {
    getReferenceTypes,
    getAllReferences,
    getReference,
    createReference,
    updateReference,
    archiveReference: setArchived(true),
    unarchiveReference: setArchived(false),
    importReferences,
    getReferenceLibrary
};
