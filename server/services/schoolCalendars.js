/**
 * Kept school calendars: storing an upload, reading it once, and working out
 * the term form's fields for a semester from what was read.
 *
 * FILES
 * server/storage/calendars/<sha256>.<ext>, never under the uploaded name; the
 * path is built only from a sha256 that matched /^[a-f0-9]{64}$/ and an
 * extension from a fixed list, so no row can point outside the folder.
 * The same file uploaded again reuses its row (and its reading: no second OCR
 * or AI call).
 *
 * FIELDS
 * `extracted` keeps the reader's transcript; presentFields() parses it on each
 * request, for whichever semester the form is on.
 */
/* global process */ // Node globals: the root ESLint config lints server/ with browser globals.
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import db from '../models/index.js';
import { readCalendar, sniffKind, MIME_OF, EXT_OF, CalendarReadError, UNREADABLE } from './schoolCalendarReader.js';
import { parseTranscript, fieldsFor, schoolYearOf, SEMESTER_LABELS, semesterKey, FIELD_LABELS } from '../utils/schoolCalendarParse.js';

const { SchoolCalendar } = db;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_STORAGE_DIR = path.resolve(__dirname, '..', 'storage', 'calendars');
/** Where the files live. SCHOOL_CALENDAR_STORAGE_DIR lets the tests use a scratch folder. */
export const storageDir = () => process.env.SCHOOL_CALENDAR_STORAGE_DIR || DEFAULT_STORAGE_DIR;

const SHA_RE = /^[a-f0-9]{64}$/;
const EXTS = new Set(Object.values(EXT_OF));
const KIND_OF_MIME = Object.fromEntries(Object.entries(MIME_OF).map(([k, v]) => [v, k]));

/** Absolute path of a stored file, or null for anything that isn't a plain sha256 + known extension. */
export function storedPath(sha256, mime, dir = storageDir()) {
  const sha = String(sha256 || '');
  const kind = KIND_OF_MIME[mime];
  if (!SHA_RE.test(sha) || !kind || !EXTS.has(EXT_OF[kind])) return null;
  const base = path.resolve(dir);
  const full = path.resolve(base, sha + '.' + EXT_OF[kind]);
  if (path.dirname(full) !== base) return null;
  return full;
}

/** A display name with no path, control or quote characters, at most 150 long. */
export function sanitizeName(name, fallback = 'school-calendar') {
  const base = String(name || fallback).split(/[\\/]/).pop();
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|*?:]/g, '_').replace(/\s+/g, ' ').trim() || fallback;
  if (cleaned.length <= 150) return cleaned;
  const ext = path.extname(cleaned).slice(0, 10);
  return cleaned.slice(0, 150 - ext.length) + ext;
}

const YEAR_RE = /^(\d{4})-(\d{4})$/;
/** '2026-2027' when valid (consecutive years), else null. */
export function cleanSchoolYear(v) {
  const m = YEAR_RE.exec(String(v || '').trim());
  return m && Number(m[2]) === Number(m[1]) + 1 ? m[0] : null;
}

export class UploadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

async function copyIn(srcPath, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (fssync.existsSync(dest)) return;
  const tmp = dest + '.' + process.pid + '.tmp';
  await fs.copyFile(srcPath, tmp);
  await fs.rename(tmp, dest);
}

/**
 * Keep an uploaded calendar and read it (once per distinct file).
 * @param file   multer's { path, originalname, size }
 * @param schoolYear  the form's school year: used when the file names none
 * @param ai     an injected AI reader (tests); undefined → the configured one
 * @returns { row, reused }
 * @throws UploadError (400: not a picture or PDF) / CalendarReadError (422: nothing readable)
 */
export async function storeCalendar({ file, schoolYear, actorId, ai }) {
  const buf = await fs.readFile(file.path);
  const kind = sniffKind(buf);
  if (!kind) throw new UploadError('Upload a PNG, JPG or WEBP picture, or a PDF, of the school calendar.');
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

  const existing = await SchoolCalendar.findOne({ where: { sha256 } });
  if (existing) {
    // The file may have gone (a fresh start emptied the folder): put it back.
    const dest = storedPath(existing.sha256, existing.mime);
    if (dest && !fssync.existsSync(dest)) await copyIn(file.path, dest);
    return { row: existing, reused: true };
  }

  const read = await readCalendar(buf, kind, { ai });
  const parsed = parseTranscript(read.transcript, { lenient: read.source === 'ocr' });
  if (!parsed.blocks.length) throw new CalendarReadError(UNREADABLE);

  const dest = storedPath(sha256, MIME_OF[kind]);
  await copyIn(file.path, dest);
  try {
    const row = await SchoolCalendar.create({
      school_year: cleanSchoolYear(parsed.schoolYear) || cleanSchoolYear(schoolYear),
      sha256,
      original_name: sanitizeName(file.originalname),
      mime: MIME_OF[kind],
      size_bytes: buf.length,
      extracted: { transcript: read.transcript, source: read.source, confidence: read.confidence, warnings: read.warnings },
      uploaded_by_account_id: actorId || null,
    });
    return { row, reused: false };
  } catch (err) {
    // Two uploads of the same new file at once: the other one won.
    if (err && err.name === 'SequelizeUniqueConstraintError') {
      const row = await SchoolCalendar.findOne({ where: { sha256 } });
      if (row) return { row, reused: true };
    }
    throw err;
  }
}

/** The latest calendar kept for a school year, or null. */
export async function latestForYear(schoolYear) {
  const sy = cleanSchoolYear(schoolYear);
  if (!sy) return null;
  return SchoolCalendar.findOne({ where: { school_year: sy }, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
}

/**
 * The API shape: the file's details, plus — when a semester is given — the
 * fields for it (see fieldsFor), or `message` when the calendar has no block
 * for that semester.
 */
export function presentCalendar(row, { semester, schoolYear, purpose } = {}) {
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  const ex = plain.extracted || {};
  const source = ex.source || 'pdf';
  const parsed = parseTranscript(ex.transcript || { blocks: [] }, { lenient: source === 'ocr' });
  const out = {
    id: plain.id,
    school_year: plain.school_year,
    original_name: plain.original_name,
    mime: plain.mime,
    size_bytes: plain.size_bytes,
    source,
    created_at: plain.createdAt || plain.created_at,
    url: '/api/school-calendars/' + plain.id + '/file',
    blocksFound: parsed.blocks.map((b) => b.key),
  };
  const key = semesterKey(semester);
  if (!key) return out;

  const r = fieldsFor(parsed, key, { schoolYear: cleanSchoolYear(schoolYear), purpose, source, strict: source === 'ocr' });
  const readerWarnings = Array.isArray(ex.warnings) ? ex.warnings : [];
  out.semester = key;
  out.block = r.block;
  out.fields = r.fields;
  out.sources = r.sources;
  out.alternatives = r.alternatives;
  // OCR rows without a readable date are mostly misread words: leave them out.
  out.events = source === 'ocr' ? r.events.filter((e) => e.date) : r.events;
  out.missing = r.missing.filter((f) => !(r.optionalMissing || []).includes(f));
  out.notInCalendar = r.optionalMissing || [];
  out.labels = FIELD_LABELS;
  if (!r.block) {
    out.message = `This calendar has no ${SEMESTER_LABELS[key]} block.`;
    out.warnings = [];
  } else {
    out.warnings = [...readerWarnings, ...r.warnings];
  }
  return out;
}

/** Empty the storage folder, keeping .gitkeep. Returns the names removed. */
export async function emptyStorage(dir = storageDir()) {
  let entries;
  try { entries = await fs.readdir(dir); } catch (err) { if (err.code === 'ENOENT') return []; throw err; }
  const removed = [];
  for (const name of entries) {
    if (name === '.gitkeep') continue;
    await fs.rm(path.join(dir, name), { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}

export { schoolYearOf };
