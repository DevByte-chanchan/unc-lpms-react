import db from '../models/index.js';
import { parseSheet, safeUnlink, pick } from '../utils/excelParser.js';
import { getPeriodId, safeWhereForPeriod } from '../utils/periodScope.js';
import { filterOneToExistingColumns, safeDestroyByPeriod, safeWhere } from '../utils/dbHelpers.js';
import { bulkUpsert, describeSequelizeError } from '../utils/uploadHelpers.js';
import { cloneFromPriorPeriod } from '../utils/periodClone.js';
import { enforceLatestPeriod } from '../utils/latestPeriod.js';

const { Faculty, Department } = db;

function toIsoDate(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(v).trim();
}

export async function listFaculty(req, res, next) {
  try {
    const where = await safeWhereForPeriod(Faculty, req);
    let rows = await Faculty.findAll({ where, order: [['name', 'ASC']] });
    const __period_id = getPeriodId(req);
    if (__period_id && rows.length === 0) {
      const __cloned = await cloneFromPriorPeriod(Faculty, __period_id, {
        attributes: ['name', 'role', 'department', 'department_id', 'status', 'about', 'sex', 'birthdate', 'email', 'contact_number'],
        transform: (r) => ({ ...r }),
        updateKeys: [],
      });
      if (__cloned) {
        console.log('[faculty] cloned ' + __cloned.count + ' rows from period ' + __cloned.source + ' → ' + __period_id);
        rows = await Faculty.findAll({ where, order: [['name', 'ASC']] });
      }
    }

    res.json(rows);
  } catch (err) { next(err); }
}

export async function getFaculty(req, res, next) {
  try {
    const row = await Faculty.scope('withAbout').findByPk(req.params.id, {
      include: [{ model: Department, as: 'departmentRef' }],
    });
    if (!row) return res.status(404).json({ message: 'Faculty not found' });
    res.json(row);
  } catch (err) { next(err); }
}

export async function createFaculty(req, res) {
  try {
    const { name, role, department, status, about, sex, birthdate, email, contact_number } = req.body;
    const period_id = getPeriodId(req);
    if (!name || !role) return res.status(400).json({ message: 'name and role are required' });
    if (!period_id)     return res.status(400).json({ message: 'period_id is required' });
    if (!(await enforceLatestPeriod(res, period_id))) return;

    let department_id = null;
    if (department) {
      const where = await safeWhere(Department, { name: department, period_id });
      const dept = await Department.findOne({ where, attributes: ['id', 'name'] });
      if (dept) department_id = dept.id;
    }
    const safe = await filterOneToExistingColumns(Faculty, {
      name, role, department, department_id,
      status: status || 'Active', about,
      sex, birthdate: birthdate || null, email, contact_number,
      period_id,
    });
    const created = await Faculty.create(safe);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function updateFaculty(req, res) {
  try {
    const row = await Faculty.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Faculty not found' });
    const callerPeriod = getPeriodId(req);
    if (callerPeriod && row.period_id && row.period_id !== callerPeriod) {
      return res.status(403).json({ message: 'This faculty belongs to a different period; switch periods to edit it.' });
    }
    if (!(await enforceLatestPeriod(res, row.period_id || callerPeriod))) return;

    // Partial-update semantics: only copy keys that were sent. Empty
    // strings become null so the user can intentionally clear a field,
    // but missing keys leave the existing value untouched.
    const editable = ['name', 'role', 'department', 'status', 'about', 'sex', 'birthdate', 'email', 'contact_number'];
    const patch = {};
    for (const k of editable) {
      if (req.body[k] !== undefined) {
        patch[k] = req.body[k] === '' ? null : req.body[k];
      }
    }

    // Re-resolve department_id if department name changed.
    if (patch.department !== undefined) {
      if (!patch.department) {
        patch.department_id = null;
      } else {
        const where = await safeWhere(Department, { name: patch.department, period_id: row.period_id });
        const dept = await Department.findOne({ where, attributes: ['id'] });
        patch.department_id = dept ? dept.id : null;
      }
    }

    const safe = await filterOneToExistingColumns(Faculty, patch);
    await row.update(safe);
    res.json(row);
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

// Reconciliation: archive (set status 'Inactive') the faculty whose ids
// are passed — used after an upload to retire people who were dropped
// from the new list. Mirrors Department.unlistMany.
export async function inactivateMany(req, res) {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (ids.length === 0) return res.status(400).json({ message: 'No ids provided.' });
    const callerPeriod = getPeriodId(req);
    if (callerPeriod && !(await enforceLatestPeriod(res, callerPeriod))) return;
    const where = callerPeriod ? { id: ids, period_id: callerPeriod } : { id: ids };
    await Faculty.update({ status: 'Inactive' }, { where });
    res.json({ inactivated: ids.length });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  }
}

export async function deleteFaculty(req, res, next) {
  try {
    const row = await Faculty.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Faculty not found' });
    if (!(await enforceLatestPeriod(res, row.period_id))) return;
    const n = await Faculty.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Faculty not found' });
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function uploadFaculty(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  const period_id = getPeriodId(req);
  if (!period_id) return res.status(400).json({ message: 'period_id is required (pass in form body).' });
  if (!(await enforceLatestPeriod(res, period_id))) {
    safeUnlink(req.file && req.file.path);
    return;
  }

  try {
    const { rows, headers } = parseSheet(req.file.path);

    const deptWhere = await safeWhere(Department, { period_id });
    const allDepts = await Department.findAll({ where: deptWhere, attributes: ['id', 'name'] });
    const deptByName = new Map(allDepts.map((d) => [d.name.toLowerCase(), d]));

    const records = [];
    const errors  = [];

    rows.forEach((row, i) => {
      const name        = pick(row, 'name', 'fullname', 'facultyname', 'completename', 'employeename');
      const role        = pick(row, 'role', 'position', 'designation', 'rank');
      const departmentN = pick(row, 'department');
      const status      = pick(row, 'status');
      const about       = pick(row, 'about', 'biography', 'bio');
      const sex         = pick(row, 'sex', 'gender');
      const birthdate   = pick(row, 'birthdate', 'birthday', 'dob');
      const email       = pick(row, 'email', 'emailaddress');
      const contact     = pick(row, 'contactnumber', 'contact', 'phone', 'mobilenumber', 'mobile');

      if (!name || !role) {
        errors.push({ row: i + 2, message: 'Missing NAME or ROLE — skipped.' });
        return;
      }

      let department_id = null;
      if (departmentN) {
        const dept = deptByName.get(String(departmentN).toLowerCase());
        if (dept) department_id = dept.id;
        else errors.push({ row: i + 2, message: 'Department "' + departmentN + '" not found in this period; stored as free text.', level: 'warning' });
      }

      records.push({
        name:           String(name).trim(),
        role:           String(role).trim(),
        department:     departmentN ? String(departmentN).trim() : null,
        department_id,
        status:         status ? String(status).trim() : 'Active',
        about:          about ? String(about).trim() : null,
        sex:            sex ? String(sex).trim() : null,
        birthdate:      toIsoDate(birthdate),
        email:          email ? String(email).trim() : null,
        contact_number: contact ? String(contact).trim() : null,
        period_id,
      });
    });

    if (records.length === 0) {
      const detected = headers && headers.length ? headers.join(', ') : '(none)';
      return res.status(400).json({
        message: 'No valid rows found. The sheet needs a "Name" column and a "Role" column. Detected columns: [' + detected + '].',
        headers,
        errors,
      });
    }

    // Merge by name (case-insensitive) instead of wiping everything:
    // update rows that match an uploaded name, insert the new ones, and
    // return rows that exist in the DB but are ABSENT from the file as
    // `missing` so the client can reconcile them (NOT auto-deleted).
    const existing = await Faculty.findAll({
      where: { period_id },
      attributes: ['id', 'name', 'role', 'status'],
      raw: true,
    });
    const existingByName = new Map(existing.map((r) => [String(r.name).trim().toLowerCase(), r]));

    let inserted = 0;
    let updated  = 0;
    for (const rec of records) {
      const safe = await filterOneToExistingColumns(Faculty, rec);
      const ex = existingByName.get(String(rec.name).trim().toLowerCase());
      if (ex) {
        await Faculty.update(safe, { where: { id: ex.id } });
        updated += 1;
      } else {
        await Faculty.create(safe);
        inserted += 1;
      }
    }

    const seenNames = new Set(records.map((r) => String(r.name).trim().toLowerCase()));
    const missing = existing.filter((r) => !seenNames.has(String(r.name).trim().toLowerCase()));

    res.status(201).json({
      inserted,
      updated,
      skipped:  errors.filter((e) => e.level !== 'warning').length,
      warnings: errors.filter((e) => e.level === 'warning').length,
      errors,
      headers,
      missing,
    });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}
