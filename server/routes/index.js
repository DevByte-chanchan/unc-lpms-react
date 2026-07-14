/**
 * Root router. Everything under /api/* is mounted here so the
 * Express entry point (index.js) stays a one-liner.
 */
import { Router } from 'express';
import departments       from './departments.js';
import faculty           from './faculty.js';
import programs          from './programs.js';
import courses           from './courses.js';
import industryConsultants from './industryConsultants.js';
import academicPeriods   from './academicPeriods.js';
import courseOfferingAssignments from './courseOfferingAssignments.js';
import archive           from './archive.js';
import imports           from './imports.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

router.use('/academic-periods',    academicPeriods);
router.use('/departments',         departments);
router.use('/faculty',             faculty);
router.use('/programs',            programs);
router.use('/courses',             courses);
router.use('/industry-consultants', industryConsultants);
router.use('/course-offering-assignments',  courseOfferingAssignments);
router.use('/archive',             archive);
router.use('/imports',             imports);

export default router;
