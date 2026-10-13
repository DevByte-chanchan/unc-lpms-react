import db from '../models/index.js';
import { parseSheet, safeUnlink, pick } from '../utils/excelParser.js';
import { getPeriodId, safeWhereForPeriod } from '../utils/periodScope.js';
import { filterOneToExistingColumns, safeDestroyByPeriod, safeWhere } from '../utils/dbHelpers.js';
import { bulkUpsert, describeSequelizeError } from '../utils/uploadHelpers.js';
import { cloneFromPriorPeriod } from '../utils/periodClone.js';
import { enforceLatestPeriod } from '../utils/latestPeriod.js';
import { isPreviewRequest, PreviewRows, previewResponse } from '../utils/importPreview.js';
import { beginImportBatch, beginManualBatch, completeImportBatch } from './importController.js';
import {
  scheduleUploadInvitations, rolesForFacultyRow, accessSummaries, inviteNow, tooManyInvites,
} from '../services/invitations.js';
import { facultyLeft, LEFT_STATUSES, accountForPerson } from '../services/notices.js';

const { Faculty, Department, UserAccount } = db;

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

// Access follows the faculty list. Never throws: a problem here must not fail
// a write that already happened.
async function safely(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error('[faculty] ' + label + ':', err.message);
    return null;
  }
}

/** Each row with its `access` cell (invitation status) — see accessSummaries. */
async function withAccess(rows) {
  const people = rows.map((r) => ({ key: r.id, name: r.name, email: r.email }));
  const access = await accessSummaries(people);
  return rows.map((r) => ({ ...r.toJSON(), access: access[r.id] || { account_id: null, status: 'none', label: 'No account' } }));
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

    res.json(await withAccess(rows));
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
    // Snapshot first, so a row added by hand is undoable the same way an
    // uploaded one is.
    const batch = await beginManualBatch('faculty', period_id, name, req.user);
    const created = await Faculty.create(safe);
    await completeImportBatch(batch, { added: 1 });

    // Same as the upload: an account, invited once they have a course.
    if (String(created.status || 'Active').trim().toLowerCase() === 'active') {
      await safely('could not prepare the account', () => scheduleUploadInvitations({
        entity: 'faculty',
        people: [{ name: created.name, email: created.email, roles: rolesForFacultyRow(created.role) }],
        batchId: batch ? batch.id : null,
        periodId: period_id,
        senderId: req.user ? req.user.id : null,
        defer: true,
      }));
    }

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

    const wasActive = !LEFT_STATUSES.includes(row.status);
    const safe = await filterOneToExistingColumns(Faculty, patch);
    await row.update(safe);

    // Leaving the term (Active / On Leave → Inactive, Emeritus, …): the
    // account loses Instructor only, and they're told if they lost courses.
    if (wasActive && LEFT_STATUSES.includes(row.status)) {
      await safely('could not update access', () => facultyLeft({
        faculty: row, periodId: row.period_id, senderId: req.user ? req.user.id : null,
      }));
    }
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
    const rows = await Faculty.findAll({ where, attributes: ['id', 'name', 'email', 'status', 'period_id'] });
    await Faculty.update({ status: 'Inactive' }, { where });
    // Each one leaves the term: Instructor goes, courses lost are reported.
    for (const f of rows) {
      if (LEFT_STATUSES.includes(f.status)) continue;   // already out
      await safely('could not update access', () => facultyLeft({
        faculty: { ...f.toJSON(), status: 'Inactive' }, periodId: f.period_id, senderId: req.user ? req.user.id : null,
      }));
    }
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

// --- Invite now / Resend ------------------------------------------------------

const inviteReply = (res, r, account) => {
  if (r.status === 'active') return res.status(409).json({ message: r.reason, hint: 'Use Forgot password.', access: r.invitation });
  if (r.status === 'disabled') return res.status(400).json({ message: r.reason });
  if (r.status === 'sent') return res.json({ message: 'Invitation sent to ' + account.email + '.', access: r.invitation });
  if (r.status === 'skipped') return res.json({ message: 'Not sent: ' + (r.reason || 'skipped by the mailer'), access: r.invitation, skipped: true });
  return res.status(502).json({ message: 'The email could not be sent: ' + (r.reason || 'unknown error'), access: r.invitation });
};

async function accountForFacultyRow(row) {
  const accounts = await UserAccount.findAll({ attributes: ['id', 'email', 'display_name', 'status', 'roles', 'must_change_password'] });
  return accountForPerson(accounts, row);
}

/** POST /api/faculty/:id/invite — an invitation right now, signed by the Dean who clicked. */
export async function inviteFaculty(req, res, next) {
  try {
    const row = await Faculty.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Faculty not found' });
    if (!(await enforceLatestPeriod(res, row.period_id))) return undefined;
    let account = await accountForFacultyRow(row);
    if (!account) {
      // Never uploaded as Active, or the account was removed: make one now.
      const s = await scheduleUploadInvitations({
        entity: 'faculty', people: [{ name: row.name, email: row.email, roles: rolesForFacultyRow(row.role) }],
        periodId: row.period_id, senderId: req.user.id, defer: true,
      });
      account = await accountForFacultyRow(row);
      if (!account) return res.status(400).json({ message: s.held ? 'Held: check the email on the faculty record first.' : 'No account could be made for ' + row.name + '.' });
    }
    if (await tooManyInvites(account.id)) return res.status(429).json({ message: 'At most 5 invitations an hour for one person. Try again later.' });
    const r = await inviteNow(account, { senderId: req.user.id, source: 'faculty', periodId: row.period_id });
    return inviteReply(res, r, account);
  } catch (err) {
    return next(err);
  }
}

/** POST /api/faculty/invite-all { period_id } — everyone "Not invited yet" in the period. */
export async function inviteAllFaculty(req, res, next) {
  try {
    const period_id = getPeriodId(req);
    if (!period_id) return res.status(400).json({ message: 'period_id is required' });
    if (!(await enforceLatestPeriod(res, period_id))) return undefined;
    const rows = await Faculty.findAll({ where: { period_id }, attributes: ['id', 'name', 'email', 'role', 'status'] });
    const list = await withAccess(rows);
    const out = { sent: 0, skipped: 0, failed: 0, total: 0 };
    for (const f of list) {
      if (!f.access || f.access.status !== 'waiting' || !f.access.account_id) continue;
      out.total += 1;
      const account = await UserAccount.findByPk(f.access.account_id);
      if (!account || await tooManyInvites(account.id)) { out.skipped += 1; continue; }
      const r = await inviteNow(account, { senderId: req.user.id, source: 'faculty', periodId: period_id });
      if (r.status === 'sent') out.sent += 1;
      else if (r.status === 'skipped' || r.status === 'active') out.skipped += 1;
      else out.failed += 1;
    }
    return res.json(out);
  } catch (err) {
    return next(err);
  }
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
    // Every sheet row, valid or not, in sheet order — this is what the preview
    // table renders. Built in the SAME pass as `records` so the two can't drift.
    const preview = new PreviewRows();

    rows.forEach((row, i) => {
      const rowNum      = i + 2;   // sheet row: the header is row 1
      const name        = pick(row, 'name', 'fullname', 'facultyname', 'completename', 'employeename');
      const role        = pick(row, 'role', 'position', 'designation', 'rank');
      const departmentN = pick(row, 'department');
      const status      = pick(row, 'status');
      const about       = pick(row, 'about', 'biography', 'bio');
      const sex         = pick(row, 'sex', 'gender');
      const birthdate   = pick(row, 'birthdate', 'birthday', 'dob');
      const email       = pick(row, 'email', 'emailaddress');
      const contact     = pick(row, 'contactnumber', 'contact', 'phone', 'mobilenumber', 'mobile');

      // The columns the preview shows. Deliberately not every field — these are
      // the ones that tell a user at a glance whether this is the right file.
      const cells = {
        Name:         name ? String(name).trim() : '',
        Role:         role ? String(role).trim() : '',
        Department:   departmentN ? String(departmentN).trim() : '',
        Status:       status ? String(status).trim() : 'Active',
        Email:        email ? String(email).trim() : '',
        'Contact No.': contact ? String(contact).trim() : '',
      };

      if (!name || !role) {
        const missing = [];
        if (!name) missing.push({ field: 'Name', message: 'Missing NAME — this row will be skipped.' });
        if (!role) missing.push({ field: 'Role', message: 'Missing ROLE — this row will be skipped.' });
        errors.push({ row: rowNum, message: 'Missing NAME or ROLE — skipped.' });
        preview.error(rowNum, cells, missing);
        return;
      }

      let department_id = null;
      const rowWarnings = [];
      if (departmentN) {
        const dept = deptByName.get(String(departmentN).toLowerCase());
        if (dept) department_id = dept.id;
        else {
          const message = 'Department "' + departmentN + '" not found in this period; stored as free text.';
          errors.push({ row: rowNum, message, level: 'warning' });
          rowWarnings.push({ field: 'Department', message });
        }
      }

      // A warning still imports — it just carries a caveat, so it never counts
      // towards the "rows with errors" tally.
      if (rowWarnings.length > 0) preview.warning(rowNum, cells, rowWarnings);
      else preview.ok(rowNum, cells);

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

    // ---------- PREVIEW: persist NOTHING and return before the snapshot ----------
    // Past this point the upload starts writing. A file with zero valid rows is
    // NOT an error here (unlike the commit path below) — it is the wrong-file
    // case this step exists to catch, and the red rows say so better than a 400.
    if (isPreviewRequest(req)) {
      return previewResponse(res, {
        filename: req.file.originalname,
        headers,
        preview,
      });
    }

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
      attributes: ['id', 'name', 'role', 'status', 'email'],
      raw: true,
    });
    const existingByName = new Map(existing.map((r) => [String(r.name).trim().toLowerCase(), r]));

    // Photograph the period before the merge below overwrites anything —
    // this is what the Undo button restores.
    const batch = await beginImportBatch('faculty', period_id, req.file.originalname, req.user);

    let inserted = 0;
    let updated  = 0;
    const left = [];   // rows the file moved out of the term
    for (const rec of records) {
      const safe = await filterOneToExistingColumns(Faculty, rec);
      const ex = existingByName.get(String(rec.name).trim().toLowerCase());
      if (ex) {
        await Faculty.update(safe, { where: { id: ex.id } });
        if (!LEFT_STATUSES.includes(ex.status) && LEFT_STATUSES.includes(rec.status)) left.push({ ...ex, status: rec.status });
        updated += 1;
      } else {
        await Faculty.create(safe);
        inserted += 1;
      }
    }

    await completeImportBatch(batch, { inserted, updated });

    // Everyone Active on the sheet gets LPMS access: an account (if new) and a
    // 'waiting' invitation — nothing is emailed until they have a course (the
    // course assignment invites them) or the Dean presses Invite now.
    const invitations = await scheduleUploadInvitations({
      entity: 'faculty',
      people: records
        .filter((r) => String(r.status || 'Active').trim().toLowerCase() === 'active')
        .map((r) => ({ name: r.name, email: r.email, roles: rolesForFacultyRow(r.role) })),
      batchId: batch ? batch.id : null,
      periodId: period_id,
      senderId: req.user ? req.user.id : null,
      defer: true,
    });
    for (const f of left) {
      await safely('could not update access', () => facultyLeft({ faculty: { ...f, period_id }, periodId: period_id, senderId: req.user ? req.user.id : null }));
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
      invitations,
    });
  } catch (err) {
    res.status(400).json({ message: describeSequelizeError(err) });
  } finally {
    safeUnlink(req.file && req.file.path);
  }
}
