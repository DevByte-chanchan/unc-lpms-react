/**
 * Department VM controller — Dean. Vision and mission only.
 *
 * The department-level twin of universityStatementController.js: versioned,
 * not period-scoped, and the same two-call upload:
 *   POST /extract — parse the PDF for ONE department and hand back fields to
 *                   review. Writes nothing.
 *   POST /        — save the REVIEWED fields as that department's new Active
 *                   version. Other departments' rows are never touched.
 *
 * Rows are keyed by department_code (see models/departmentStatement.js). The
 * code must name a department in the CURRENT term; its name there is
 * snapshotted into department_name.
 */
import fs from 'node:fs/promises';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { safeUnlink } from '../utils/excelParser.js';
import { hasPdfMagic } from '../middleware/upload.js';
import { getActiveTermId } from '../utils/latestPeriod.js';
import { parseDepartmentStatementsPdf, ExtractionError } from '../utils/universityStatementParser.js';
import { findActiveVersion, saveNewVersion, restoreVersion as restoreFrom } from '../utils/universityStatementVersions.js';
import { actorName } from '../middleware/auth.js';

const { DepartmentStatement, Department, sequelize } = db;

export const CONTENT_FIELDS = ['department_name', 'vision', 'mission'];
const HISTORY_ATTRS = ['id', 'department_code', 'department_name', 'status', 'source_filename', 'uploaded_by', 'createdAt'];

export const normCode = (v) => (typeof v === 'string' ? v.trim().toUpperCase() : '');

const findActive = (code, opts) => findActiveVersion(DepartmentStatement, opts, { department_code: code });

/** The current term's department with this code (any case), or null. */
async function resolveDepartment(code) {
  if (!code) return null;
  const periodId = await getActiveTermId();
  if (!periodId) return null;
  return Department.findOne({
    where: {
      period_id: periodId,
      status: { [Op.ne]: 'Unlisted' },
      [Op.and]: sequelize.where(sequelize.fn('UPPER', sequelize.col('code')), code),
    },
  });
}

const unknownDepartment = (res, code) => res.status(400).json({
  message: code
    ? 'No department with code "' + code + '" in the current term.'
    : 'department_code is required.',
});

export async function getCurrent(req, res, next) {
  try {
    const code = normCode(req.query.department_code);
    if (!code) return unknownDepartment(res, code);
    const row = await findActive(code);
    if (!row) return res.status(404).json({ message: 'No VMGO has been saved for ' + code + ' yet.' });
    res.json(row);
  } catch (err) { next(err); }
}

/** The Active row of every department that has one. */
export async function listAllActive(_req, res, next) {
  try {
    const rows = await DepartmentStatement.findAll({
      where: { status: 'Active' },
      order: [['department_code', 'ASC'], ['createdAt', 'DESC'], ['id', 'DESC']],
    });
    res.json(rows);
  } catch (err) { next(err); }
}

export async function listHistory(req, res, next) {
  try {
    const code = normCode(req.query.department_code);
    if (!code) return unknownDepartment(res, code);
    const rows = await DepartmentStatement.findAll({
      where: { department_code: code },
      attributes: HISTORY_ATTRS,
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    });
    res.json(rows);
  } catch (err) { next(err); }
}

export async function getVersion(req, res, next) {
  try {
    const row = await DepartmentStatement.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Version not found' });
    res.json(row);
  } catch (err) { next(err); }
}

/** Preview only: parse the uploaded PDF for one department, write nothing. */
export async function extractStatements(req, res, next) {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded (field "file").' });
    const code = normCode(req.body && req.body.department_code);
    const dept = await resolveDepartment(code);
    if (!dept) return unknownDepartment(res, code);
    // The multer filter only saw a name and a declared type; check the bytes.
    if (!hasPdfMagic(filePath)) {
      return res.status(400).json({ message: 'That file is not a PDF (it does not start with %PDF-).' });
    }
    const buffer = await fs.readFile(filePath);
    const result = await parseDepartmentStatementsPdf(buffer, { departmentName: dept.name, departmentCode: code });
    const active = await findActive(code, { attributes: ['id', 'source_sha256'] });
    res.json({
      ...result,
      department_code: code,
      department_name: dept.name,
      filename: req.file.originalname,
      sameAsActive: !!(active && active.source_sha256 && active.source_sha256 === result.sha256),
    });
  } catch (err) {
    if (err instanceof ExtractionError) return res.status(422).json({ message: err.message, code: err.code });
    next(err);
  } finally {
    safeUnlink(filePath);
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Validate and normalise reviewed fields — vision and mission, both required.
 * Anything else in the body is ignored. Returns { values } or { errors }.
 */
export function validateDepartmentStatements(body) {
  const src = body || {};
  const errors = [];

  const values = { vision: str(src.vision), mission: str(src.mission) };
  if (!values.vision) errors.push({ field: 'vision', message: 'Vision is required.' });
  if (!values.mission) errors.push({ field: 'mission', message: 'Mission is required.' });

  return errors.length ? { errors } : { values };
}

export async function saveStatements(req, res, next) {
  try {
    const code = normCode(req.body && req.body.department_code);
    const dept = await resolveDepartment(code);
    if (!dept) return unknownDepartment(res, code);
    const { values, errors } = validateDepartmentStatements(req.body);
    if (errors) return res.status(400).json({ message: errors[0].message, errors });
    const meta = {
      source_filename: (req.body.source_filename || '').slice(0, 255) || null,
      source_sha256: /^[a-f0-9]{64}$/.test(req.body.source_sha256 || '') ? req.body.source_sha256 : null,
      uploaded_by: actorName(req),   // the signed-in user, never the request body
    };
    const row = await saveNewVersion(
      DepartmentStatement,
      { ...values, department_name: String(dept.name).slice(0, 100) },
      meta,
      { department_code: code },
    );
    res.status(201).json(row);
  } catch (err) { next(err); }
}

/** Make an old version current by COPYING it, within its own department. */
export async function restoreVersion(req, res, next) {
  try {
    const uploaded_by = actorName(req) || undefined;
    const row = await restoreFrom(DepartmentStatement, req.params.id, {
      uploaded_by,
      contentFields: CONTENT_FIELDS,
      scopeFields: ['department_code'],
    });
    if (!row) return res.status(404).json({ message: 'Version not found' });
    res.status(201).json(row);
  } catch (err) { next(err); }
}
