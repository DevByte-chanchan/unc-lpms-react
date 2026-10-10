/**
 * University VMGO controller — OVPAA.
 *
 * Versioned, not period-scoped (see models/universityStatement.js). The upload
 * is two calls on purpose:
 *   POST /extract — parse the PDF and hand back fields to review. Writes nothing.
 *   POST /        — save the REVIEWED fields as the new Active version.
 * The PDF itself is never stored; only its name and hash travel with the save.
 */
import fs from 'node:fs/promises';
import db from '../models/index.js';
import { safeUnlink } from '../utils/excelParser.js';
import { hasPdfMagic } from '../middleware/upload.js';
import { parseUniversityStatementsPdf, ExtractionError } from '../utils/universityStatementParser.js';
import { findActiveVersion, saveNewVersion, restoreVersion as restoreFrom } from '../utils/universityStatementVersions.js';
import { actorName } from '../middleware/auth.js';

const { UniversityStatement } = db;

const HISTORY_ATTRS = ['id', 'status', 'source_filename', 'uploaded_by', 'createdAt'];
const LIST_FIELDS = ['core_values', 'graduate_attributes'];

const findActive = (opts) => findActiveVersion(UniversityStatement, opts);

export async function getCurrent(_req, res, next) {
  try {
    const row = await findActive();
    if (!row) return res.status(404).json({ message: 'No university statements have been saved yet.' });
    res.json(row);
  } catch (err) { next(err); }
}

export async function listHistory(_req, res, next) {
  try {
    const rows = await UniversityStatement.findAll({
      attributes: HISTORY_ATTRS,
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
    });
    res.json(rows);
  } catch (err) { next(err); }
}

export async function getVersion(req, res, next) {
  try {
    const row = await UniversityStatement.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Version not found' });
    res.json(row);
  } catch (err) { next(err); }
}

/** Preview only: parse the uploaded PDF, write nothing. */
export async function extractStatements(req, res, next) {
  const filePath = req.file && req.file.path;
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded (field "file").' });
    // The multer filter only saw a name and a declared type; check the bytes.
    if (!hasPdfMagic(filePath)) {
      return res.status(400).json({ message: 'That file is not a PDF (it does not start with %PDF-).' });
    }
    const buffer = await fs.readFile(filePath);
    const result = await parseUniversityStatementsPdf(buffer);
    const active = await findActive({ attributes: ['id', 'source_sha256'] });
    res.json({
      ...result,
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

/**
 * Validate and normalise reviewed fields. Returns { values } or { errors }.
 * Lists are re-numbered 1..n in the order given.
 */
export function validateStatements(body) {
  const src = body || {};
  const errors = [];
  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  const values = {
    vision: str(src.vision),
    mission: str(src.mission),
    educational_policy: str(src.educational_policy) || null,
  };
  if (!values.vision) errors.push({ field: 'vision', message: 'Vision is required.' });
  if (!values.mission) errors.push({ field: 'mission', message: 'Mission is required.' });

  for (const key of LIST_FIELDS) {
    const list = Array.isArray(src[key]) ? src[key] : [];
    values[key] = list.map((it, i) => {
      const title = str(it && it.title);
      if (!title) errors.push({ field: key + '[' + i + '].title', message: 'Every item needs a title.' });
      return { order: i + 1, title, description: str(it && it.description) };
    });
  }
  return errors.length ? { errors } : { values };
}

export async function saveStatements(req, res, next) {
  try {
    const { values, errors } = validateStatements(req.body);
    if (errors) return res.status(400).json({ message: errors[0].message, errors });
    const meta = {
      source_filename: (req.body.source_filename || '').slice(0, 255) || null,
      source_sha256: /^[a-f0-9]{64}$/.test(req.body.source_sha256 || '') ? req.body.source_sha256 : null,
      uploaded_by: actorName(req),   // the signed-in user, never the request body
    };
    const row = await saveNewVersion(UniversityStatement, values, meta);
    res.status(201).json(row);
  } catch (err) { next(err); }
}

/** Make an old version current by COPYING it — history is never rewritten. */
export async function restoreVersion(req, res, next) {
  try {
    const uploaded_by = actorName(req) || undefined;
    const row = await restoreFrom(UniversityStatement, req.params.id, { uploaded_by });
    if (!row) return res.status(404).json({ message: 'Version not found' });
    res.status(201).json(row);
  } catch (err) { next(err); }
}
