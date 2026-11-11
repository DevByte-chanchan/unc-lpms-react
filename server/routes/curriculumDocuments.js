/**
 * Kept Program of Study PDFs. Mounted behind requireAuth (routes/index.js), and
 * open to every signed-in role: faculty need the curriculum to write syllabi.
 *
 *   GET /api/curriculum-documents?program_id=     { active: [...], previous: [...] }
 *   GET /api/curriculum-documents/:id/file         the PDF, inline (?download=1 → attachment)
 *
 * The file path is built ONLY from the row's sha256 (services/curriculumDocuments.js),
 * never from the id, the name or anything else the request carries.
 */
import { Router } from 'express';
import fs from 'node:fs';
import db from '../models/index.js';
import { listForProgram, storedPath } from '../services/curriculumDocuments.js';

const router = Router();
const MISSING = 'This PDF is no longer on the server.';

router.get('/', async (req, res, next) => {
  try {
    let programId = Number(req.query.program_id);
    // ?course_code=&period_id= — for an instructor who knows the course, not
    // the program: the first program in that term that offers the code.
    if (!programId && req.query.course_code && Number(req.query.period_id)) {
      const code = String(req.query.course_code).trim().toUpperCase();
      const courses = await db.Course.findAll({ where: { period_id: Number(req.query.period_id) }, attributes: ['course_id', 'course_no'], raw: true });
      const ids = courses.filter((c) => String(c.course_no).trim().toUpperCase() === code).map((c) => c.course_id);
      const offering = ids.length ? await db.ProgramCourseOffering.findOne({ where: { course_id: ids }, order: [['program_id', 'ASC']], raw: true }) : null;
      if (!offering) return res.json({ active: [], previous: [], program_id: null });
      programId = offering.program_id;
    }
    if (!programId) return res.status(400).json({ message: 'program_id (or course_code with period_id) is required.' });
    return res.json({ ...(await listForProgram(programId)), program_id: programId });
  } catch (err) { return next(err); }
});

// For a Content-Disposition header: ASCII only, no quotes or backslashes.
const headerName = (name) => String(name || 'program-of-study.pdf').replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');

router.get('/:id/file', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ message: MISSING });
    const row = await db.CurriculumDocument.findByPk(id);
    if (!row || row.status === 'removed') return res.status(404).json({ message: MISSING });
    const file = storedPath(row.sha256);
    if (!file) return res.status(404).json({ message: MISSING });
    let stat;
    try { stat = await fs.promises.stat(file); } catch { return res.status(404).json({ message: MISSING }); }

    const disposition = ['1', 'true', 'yes'].includes(String(req.query.download || '').toLowerCase()) ? 'attachment' : 'inline';
    const name = headerName(row.original_name);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(stat.size),
      'Content-Disposition': disposition + '; filename="' + name + '"; filename*=UTF-8\'\'' + encodeURIComponent(row.original_name || name),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=300',
    });
    const stream = fs.createReadStream(file);
    stream.on('error', (err) => next(err));
    return stream.pipe(res);
  } catch (err) { return next(err); }
});

export default router;
