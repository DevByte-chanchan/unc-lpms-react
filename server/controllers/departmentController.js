/**
 * Department controller — HR Staff, period-scoped with clone-on-
 * first-use continuity.
 */
import db from '../models/index.js';
import { parseSheet, safeUnlink, pick } from '../utils/excelParser.js';
import { getPeriodId, safeWhereForPeriod } from '../utils/periodScope.js';
import { filterOneToExistingColumns } from '../utils/dbHelpers.js';
import { bulkUpsert, describeSequelizeError } from '../utils/uploadHelpers.js';
import { cloneFromPriorPeriod } from '../utils/periodClone.js';
import { enforceLatestPeriod } from '../utils/latestPeriod.js';
import { isPreviewRequest, PreviewRows, previewResponse } from '../utils/importPreview.js';
import { beginImportBatch, beginManualBatch, completeImportBatch } from './importController.js';

const { Department } = db;

export async function listDepartments(req, res, next) {
  try {
    const period_id = getPeriodId(req);
    const where = await safeWhereForPeriod(Department, req);
    let rows = await Department.findAll({ where, order: [['name', 'ASC']] });

    if (period_id && rows.length === 0) {
      // Preserve the source row's status — if a department was
      // Unlisted in the previous period, it stays Unlisted in this
      // one (the user can flip it back to Active via the row Edit
      // modal).
      const cloned = await cloneFromPriorPeriod(Department, period_id, {
        attributes: ['name', 'code', 'dean', 'status'],
        transform: (r) => ({ name: r.name, code: r.code, dean: r.dean, status: r.status || 'Active' }),
        updateKeys: ['name', 'dean', 'status'],
      });
      if (cloned) {
        // eslint-disable-next-line no-console
        console.log('[departments] cloned ' + cloned.count + ' rows from period ' + cloned.source + ' → ' + period_id);
        rows = await Department.findAll({ where, order: [['name', 'ASC']] });
      }
    }

    res.json(rows);
  } catch (err) { next(err); }
}

export async function getDepartment(req, res, next) {
  try {
    const row = await Department.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Department not found' });
    res.json(row);
  } catch (err) { next(err); }
}

export async function createDepartment(req, res) {
  try {
    const { name, code, dean, status } = req.body;
    const period_id = getPeriodId(req);
    if (!name || !code) return res.status(400).json({ message: 'name and code are required' });
    if (!period_id)     return res.status(400).json({ message: 'period_id is required' });
    if (!(await enforceLatestPeriod(res, period_id))) return;
    const safe = await filterOneToExistingColumns(Department, {
      name, code, dean, status: status || 'Active', period_id,
    });
    // Snapshot first, so a row added by hand is undoable the same way an
    // uploaded one is.
    const batch = await beginManualBatch('departments', period_id, name);
    const created = await Department.create(safe);
    await completeImportBatch(batch, { added: 1 });

    res.status(201).json(created);
  } catch (err) { res.status(400).json({ message: describeSequelizeError(err) }); }
}

export async function updateDepartment(req, res) {
  try {
    const row = await Department.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Department not found' });
    const callerPeriod = getPeriodId(req);
    if (callerPeriod && row.period_id && row.period_id !== callerPeriod) {
      return res.status(403).json({ message: 'This department belongs to a different period; switch periods to edit it.' });
    }
    if (!(await enforceLatestPeriod(res, row.period_id || callerPeriod))) return;
    const patch = {};
    for (const k of ['name', 'code', 'dean', 'status']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    const safe = await filterOneToExistingColumns(Department, patch);
    await row.update(safe);
    res.json(row);
  } catch (err) { res.status(400).json({ message: describeSequelizeError(err) }); }
}

export async function unlistMany(req, res) {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (ids.length === 0) return res.status(400).json({ message: 'No ids provided.' });
    const callerPeriod = getPeriodId(req);
    if (callerPeriod && !(await enforceLatestPeriod(res, callerPeriod))) return;
    const where = callerPeriod ? { id: ids, period_id: callerPeriod } : { id: ids };
    await Department.update({ status: 'Unlisted' }, { where });
    res.json({ unlisted: ids.length });
  } catch (err) { res.status(400).json({ message: describeSequelizeError(err) }); }
}

export async function deleteDepartment(req, res, next) {
  try {
    const callerPeriod = getPeriodId(req);
    const row = await Department.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Department not found.' });
    if (!(await enforceLatestPeriod(res, row.period_id || callerPeriod))) return;
    const where = callerPeriod ? { id: req.params.id, period_id: callerPeriod } : { id: req.params.id };
    const n = await Department.destroy({ where });
    if (!n) return res.status(404).json({ message: 'Department not found (or it belongs to a different period).' });
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function uploadDepartments(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const period_id = getPeriodId(req);
  if (!period_id) return res.status(400).json({ message: 'period_id is required (pass in form body).' });
  if (!(await enforceLatestPeriod(res, period_id))) {
    safeUnlink(req.file && req.file.path);
    return;
  }

  try {
    const { rows, headers } = parseSheet(req.file.path);
    const records = [];
    const errors  = [];
    // Departments are identified by CODE (UNIQUE(code, period_id)) — the same
    // key bulkUpsert upserts on — so reconciliation must compare by code too,
    // not by name. Comparing by name flagged a renamed-but-same-code row as
    // "missing" even though it was updated in place.
    const seenCodes = new Set();
    // Every sheet row, valid or not, in sheet order — this is what the preview
    // table renders. Built in the SAME pass as `records` so the two can't drift.
    const preview = new PreviewRows();

    rows.forEach((row, i) => {
      const rowNum = i + 2;   // sheet row: the header is row 1
      const name = pick(row, 'name');
      const code = pick(row, 'code');
      const dean = pick(row, 'dean');

      // Enough to answer "is this the right file", not a full data dump. Status
      // isn't shown because the sheet's is ignored — every row imports Active.
      const cells = {
        Name: name ? String(name).trim() : '',
        Code: code ? String(code).trim() : '',
        Dean: dean ? String(dean).trim() : '',
      };

      if (!name || !code) {
        const missing = [];
        if (!name) missing.push({ field: 'Name', message: 'Missing NAME — this row will be skipped.' });
        if (!code) missing.push({ field: 'Code', message: 'Missing CODE — this row will be skipped.' });
        errors.push({ row: rowNum, message: 'Missing NAME or CODE — skipped.' });
        preview.error(rowNum, cells, missing);
        return;
      }

      preview.ok(rowNum, cells);
      seenCodes.add(String(code).trim().toLowerCase());
      records.push({
        name: String(name).trim(),
        code: String(code).trim(),
        dean: dean ? String(dean).trim() : null,
        status: 'Active',
        period_id,
      });
    });

    // ---------- PREVIEW: persist NOTHING and return before the snapshot ----------
    // Everything below this line writes. A preview past it would leave an
    // ImportBatch behind and offer an Undo for an import that never happened.
    if (isPreviewRequest(req)) {
      return previewResponse(res, {
        filename: req.file.originalname,
        headers,
        preview,
      });
    }

    if (records.length === 0) {
      return res.status(400).json({ message: 'No valid rows found.', headers, errors });
    }

    const existing = await Department.findAll({
      where: { period_id },
      attributes: ['id', 'name', 'code', 'status'],
      raw: true,
    });
    // Photograph the period before the upsert below overwrites anything —
    // this is what the Undo button restores.
    const batch = await beginImportBatch('departments', period_id, req.file.originalname);

    const created = await bulkUpsert(Department, records, ['name', 'dean', 'status']);
    // Only reconcile departments that are actually IN THE TABLE. Already-archived
    // rows (Unlisted / Archived) aren't shown there, so flagging them again on
    // every upload was inaccurate. Match by code (the identity), not name.
    const ARCHIVED_DEPT_STATUSES = new Set(['Unlisted', 'Archived']);
    const missing = existing.filter((row) =>
      !ARCHIVED_DEPT_STATUSES.has(row.status)
      && !seenCodes.has(String(row.code).trim().toLowerCase()));

    await completeImportBatch(batch, { inserted: created.length });

    res.status(201).json({ inserted: created.length, skipped: errors.length, errors, headers, missing });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}
