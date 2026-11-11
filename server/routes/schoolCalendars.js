/**
 * The official school calendar, uploaded by the VPAA to fill the term form.
 * Mounted behind requireAuth AND requireRole('VPAA') (routes/index.js).
 *
 *   POST /api/school-calendars          multipart: file, semester, school_year, purpose?
 *        → the kept calendar + the fields for that semester (nothing is saved to the term)
 *   GET  /api/school-calendars?school_year=&semester=
 *        → { calendar: <the latest for that year, with fields> | null }
 *   GET  /api/school-calendars/:id?semester=&school_year=
 *   GET  /api/school-calendars/:id/file  the file itself, inline
 *
 * The file path is built ONLY from the row's sha256 and type
 * (services/schoolCalendars.js), never from the id or the uploaded name.
 */
import { Router } from 'express';
import fs from 'node:fs';
import db from '../models/index.js';
import { rateLimit } from '../utils/rateLimit.js';
import { uploadCalendar, CALENDAR_TYPES_MESSAGE as TYPES } from '../middleware/upload.js';
import { safeUnlink } from '../utils/excelParser.js';
import { storeCalendar, latestForYear, presentCalendar, storedPath, UploadError } from '../services/schoolCalendars.js';

const router = Router();
const MISSING = 'This calendar file is no longer on the server.';

const fileUpload = (req, res, next) => uploadCalendar(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'That file is larger than 10 MB.' });
  return res.status(err.status || 400).json({ message: err.message || TYPES });
});

// 10 uploads an hour per account (re-uploads included).
const uploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  key: (req) => (req.user ? 'account:' + req.user.id : null),
  message: 'You have uploaded 10 calendars in the last hour. Wait a while, or type the dates.',
});

const purposeOf = (v) => (String(v || '').toLowerCase() === 'edit' ? 'edit' : 'create');

router.post('/', uploadLimit, fileUpload, async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ message: TYPES });
    const { row, reused } = await storeCalendar({
      file,
      schoolYear: req.body.school_year,
      actorId: req.user && req.user.id,
      ai: req.app.locals.calendarAiReader, // tests inject a fake; undefined → the configured one
    });
    return res.status(reused ? 200 : 201).json({
      ...presentCalendar(row, { semester: req.body.semester, schoolYear: req.body.school_year, purpose: purposeOf(req.body.purpose) }),
      reused,
    });
  } catch (err) {
    if (err instanceof UploadError || err.status === 422) return res.status(err.status).json({ message: err.message });
    return next(err);
  } finally {
    if (file) safeUnlink(file.path);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const row = await latestForYear(req.query.school_year);
    if (!row) return res.json({ calendar: null });
    return res.json({ calendar: presentCalendar(row, { semester: req.query.semester, schoolYear: req.query.school_year, purpose: purposeOf(req.query.purpose) }) });
  } catch (err) { return next(err); }
});

const byId = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(404).json({ message: MISSING }); return null; }
  const row = await db.SchoolCalendar.findByPk(id);
  if (!row) { res.status(404).json({ message: MISSING }); return null; }
  return row;
};

router.get('/:id', async (req, res, next) => {
  try {
    const row = await byId(req, res);
    if (!row) return undefined;
    return res.json(presentCalendar(row, { semester: req.query.semester, schoolYear: req.query.school_year, purpose: purposeOf(req.query.purpose) }));
  } catch (err) { return next(err); }
});

// For a Content-Disposition header: ASCII only, no quotes or backslashes.
const headerName = (name) => String(name || 'school-calendar').replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');

router.get('/:id/file', async (req, res, next) => {
  try {
    const row = await byId(req, res);
    if (!row) return undefined;
    const file = storedPath(row.sha256, row.mime);
    if (!file) return res.status(404).json({ message: MISSING });
    let stat;
    try { stat = await fs.promises.stat(file); } catch { return res.status(404).json({ message: MISSING }); }
    const name = headerName(row.original_name);
    res.set({
      'Content-Type': row.mime,
      'Content-Length': String(stat.size),
      'Content-Disposition': 'inline; filename="' + name + '"; filename*=UTF-8\'\'' + encodeURIComponent(row.original_name || name),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=300',
      // A picture or PDF shown in the page: never a document that runs anything.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    });
    const stream = fs.createReadStream(file);
    stream.on('error', (err) => next(err));
    return stream.pipe(res);
  } catch (err) { return next(err); }
});

export default router;
