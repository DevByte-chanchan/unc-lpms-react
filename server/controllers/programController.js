import db from '../models/index.js';
import { parseSheet, safeUnlink, pick } from '../utils/excelParser.js';
import { getPeriodId, safeWhereForPeriod } from '../utils/periodScope.js';
import { filterOneToExistingColumns, safeDestroyByPeriod, safeWhere } from '../utils/dbHelpers.js';
import { bulkUpsert, describeSequelizeError } from '../utils/uploadHelpers.js';
import { cloneFromPriorPeriod } from '../utils/periodClone.js';
import { enforceLatestPeriod } from '../utils/latestPeriod.js';

const { Program, Faculty } = db;

// Strips honorifics so "Dr. Maria Santos" matches "Maria Santos".
// Mirrors normalizeName in courseAssignmentController.
const normalizeFacultyName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/\b(dr|prof|professor|engr|engineer|atty|mr|mrs|ms|sir|maam|ma'?am)\.?\s+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Build a { normalizedName -> faculty.id } map for ONE period. Used to
// resolve a program's program_head NAME into program_head_id. Period-scoped
// because faculty rows (and their ids) differ per term.
async function facultyKeyMapForPeriod(period_id) {
  if (!period_id) return new Map();
  const facWhere = await safeWhere(Faculty, { period_id });
  const list = await Faculty.findAll({ where: facWhere, attributes: ['id', 'name'] });
  return new Map(list.map((f) => [normalizeFacultyName(f.name), f.id]));
}

// Resolve a single head name → faculty.id within a period (null if no match).
async function resolveHeadId(program_head, period_id) {
  if (!program_head || !period_id) return null;
  const key = normalizeFacultyName(program_head);
  if (!key) return null;
  const map = await facultyKeyMapForPeriod(period_id);
  return map.get(key) ?? null;
}

// Re-resolve program_head_id for EVERY program in a period from its current
// head name. Idempotent — only writes rows whose id is wrong/missing. Used to
// backfill, and to fix ids after a cross-period clone (faculty ids differ per
// term, so a carried-over id must be re-pointed at THIS period's faculty).
async function syncProgramHeadIds(period_id) {
  if (!period_id) return 0;
  const byKey = await facultyKeyMapForPeriod(period_id);
  const progWhere = await safeWhere(Program, { period_id });
  const progs = await Program.findAll({ where: progWhere, attributes: ['id', 'program_head', 'program_head_id'] });
  let changed = 0;
  for (const p of progs) {
    const want = p.program_head ? (byKey.get(normalizeFacultyName(p.program_head)) ?? null) : null;
    if ((p.program_head_id ?? null) !== (want ?? null)) {
      await p.update({ program_head_id: want });
      changed += 1;
    }
  }
  return changed;
}

// One-time (idempotent) boot backfill: resolve program_head_id for every
// period that has programs. Safe to run on every boot — it only writes when a
// row's resolved id actually changes. Never throws (boot must not fail here).
export async function backfillProgramHeadIds() {
  try {
    const periods = await Program.findAll({ attributes: ['period_id'], group: ['period_id'], raw: true });
    let total = 0;
    for (const { period_id } of periods) {
      if (period_id) total += await syncProgramHeadIds(period_id);
    }
    if (total) console.log('[program] backfilled program_head_id for ' + total + ' row(s).');
  } catch (err) {
    console.warn('[program] head-id backfill skipped: ' + (err && err.message));
  }
}

export async function listPrograms(req, res, next) {
  try {
    const where = await safeWhereForPeriod(Program, req);
    let rows = await Program.findAll({ where, order: [['code', 'ASC']] });
    const __period_id = getPeriodId(req);
    if (__period_id && rows.length === 0) {
      const __cloned = await cloneFromPriorPeriod(Program, __period_id, {
        // Carry the head forward (name + id) so the head keeps access in the
        // new term. The id is then re-resolved against THIS period's faculty.
        attributes: ['code', 'name', 'program_head', 'program_head_id', 'status'],
        transform: (r) => ({ ...r }),
        updateKeys: ['name', 'program_head', 'program_head_id', 'status'],
      });
      if (__cloned) {
        console.log('[program] cloned ' + __cloned.count + ' rows from period ' + __cloned.source + ' → ' + __period_id);
        await syncProgramHeadIds(__period_id);
        rows = await Program.findAll({ where, order: [['code', 'ASC']] });
      }
    }

    // Optional "my program(s)" filter for the Program Head: match by resolved
    // FK (head_id) OR by normalized head name (head_name). We OR them so a
    // stale/missing id still resolves via the period-independent name.
    const headId = req.query && req.query.head_id ? Number(req.query.head_id) : null;
    const headNameKey = req.query && req.query.head_name ? normalizeFacultyName(req.query.head_name) : null;
    if (headId || headNameKey) {
      rows = rows.filter((r) => {
        const idMatch = headId && r.program_head_id != null && Number(r.program_head_id) === headId;
        const nameMatch = headNameKey && normalizeFacultyName(r.program_head) === headNameKey;
        return idMatch || nameMatch;
      });
    }

    res.json(rows);
  } catch (err) { next(err); }
}

export async function getProgram(req, res, next) {
  try {
    const row = await Program.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Program not found' });
    res.json(row);
  } catch (err) { next(err); }
}

export async function createProgram(req, res, next) {
  try {
    const { code, name, program_head, status } = req.body;
    const period_id = getPeriodId(req);
    if (!code || !name) return res.status(400).json({ message: 'code and name are required' });
    if (!period_id)     return res.status(400).json({ message: 'period_id is required' });
    if (!(await enforceLatestPeriod(res, period_id))) return;
    const program_head_id = await resolveHeadId(program_head, period_id);
    const safe = await filterOneToExistingColumns(Program, { code, name, program_head, program_head_id, status: status || 'Active', period_id });
    const created = await Program.create(safe);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function updateProgram(req, res) {
  try {
    const row = await Program.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Program not found' });
    const callerPeriod = getPeriodId(req);
    if (callerPeriod && row.period_id && row.period_id !== callerPeriod) {
      return res.status(403).json({ message: 'This program belongs to a different period; switch periods to edit it.' });
    }
    if (!(await enforceLatestPeriod(res, row.period_id || callerPeriod))) return;

    // Partial-update semantics: only copy keys that were sent.
    const patch = {};
    for (const k of ['code', 'name', 'program_head', 'status']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    // When the head NAME changes, re-resolve its faculty.id (same period).
    if (patch.program_head !== undefined) {
      patch.program_head_id = await resolveHeadId(patch.program_head, row.period_id);
    }
    const safe = await filterOneToExistingColumns(Program, patch);
    await row.update(safe);
    res.json(row);
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function deleteProgram(req, res, next) {
  try {
    const row = await Program.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Program not found' });
    if (!(await enforceLatestPeriod(res, row.period_id))) return;
    const n = await Program.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Program not found' });
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function uploadPrograms(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const period_id = getPeriodId(req);
  if (!period_id) return res.status(400).json({ message: 'period_id is required (pass in form body).' });
  if (!(await enforceLatestPeriod(res, period_id))) {
    safeUnlink(req.file && req.file.path);
    return;
  }

  try {
    const { rows, headers } = parseSheet(req.file.path);

    // Faculty master list for THIS period — used both to resolve each row's
    // program_head_id and to flag heads that aren't known faculty.
    const facultyByKey = await facultyKeyMapForPeriod(period_id);

    const records = [];
    const errors  = [];

    rows.forEach((row, i) => {
      const code         = pick(row, 'code');
      const name         = pick(row, 'name');
      const program_head = pick(row, 'programhead', 'facultyname', 'faculty', 'head');
      const status       = pick(row, 'status');
      if (!code || !name) {
        errors.push({ row: i + 2, message: 'Missing CODE or NAME — skipped.' });
        return;
      }
      const headName = program_head ? String(program_head).trim() : null;
      records.push({
        code: String(code).trim(),
        name: String(name).trim(),
        program_head: headName,
        program_head_id: headName ? (facultyByKey.get(normalizeFacultyName(headName)) ?? null) : null,
        status: status ? String(status).trim() : 'Active',
        period_id,
      });
    });

    if (records.length === 0) {
      return res.status(400).json({ message: 'No valid rows found.', headers, errors });
    }

    const removed = await safeDestroyByPeriod(Program, period_id);
    const created = await bulkUpsert(Program, records, ['name', 'program_head', 'program_head_id', 'status']);

    // Cross-reference each row's program_head against the period's Faculty
    // master list. Rows whose head isn't a known Faculty name surface as
    // warnings so the UI can prompt the user per row.
    const insertedRows = await Program.findAll({
      where: await safeWhere(Program, { period_id }),
      attributes: ['id', 'code', 'name', 'program_head'],
    });
    const warnings = [];
    for (const row of insertedRows) {
      const head = row.program_head;
      if (!head) continue;   // No head specified: not a warning, just empty.
      if (!facultyByKey.has(normalizeFacultyName(head))) {
        warnings.push({ id: row.id, code: row.code, name: row.name, program_head: head });
      }
    }

    res.status(201).json({
      replaced: removed,
      inserted: created.length,
      skipped:  errors.length,
      errors,
      warnings,
      headers,
    });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}
