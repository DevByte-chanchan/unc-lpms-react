/**
 * Root router. Everything under /api/* is mounted here so the
 * Express entry point (index.js) stays a one-liner.
 *
 * Auth: every route needs a signed-in user (requireAuth) EXCEPT /health,
 * /auth/login and the emailed-link endpoints (invitation, forgot/reset
 * password — see routes/auth.js). Reads are open to any signed-in user; each route file guards
 * its own writes with requireRole for the role that owns that data.
 */
import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { externalConsultantEmailsAllowed } from '../utils/roles.js';
import auth              from './auth.js';
import userAccounts      from './userAccounts.js';
import departments       from './departments.js';
import faculty           from './faculty.js';
import programs          from './programs.js';
import courses           from './courses.js';
import industryConsultants from './industryConsultants.js';
import academicPeriods   from './academicPeriods.js';
import courseOfferingAssignments from './courseOfferingAssignments.js';
import archive           from './archive.js';
import imports           from './imports.js';
import universityStatements from './universityStatements.js';
import departmentStatements from './departmentStatements.js';
import notifications     from './notifications.js';

const router = Router();

router.use(cookieParser());

// Public. `features` tells the client which switches are on (it never reveals data).
router.get('/health', (_req, res) => res.json({
  ok: true,
  ts: new Date().toISOString(),
  features: { externalConsultantEmails: externalConsultantEmailsAllowed() },
}));

// /auth/login is public; the auth router guards the rest of /auth itself.
router.use('/auth', auth);

router.use(requireAuth);

router.use('/user-accounts',       requireRole('VPAA'), userAccounts);
router.use('/academic-periods',    academicPeriods);
router.use('/departments',         departments);
router.use('/faculty',             faculty);
router.use('/programs',            programs);
router.use('/courses',             courses);
router.use('/industry-consultants', industryConsultants);
router.use('/course-offering-assignments',  courseOfferingAssignments);
router.use('/archive',             archive);
// Undo: the controller checks the batch's creator (or VPAA) itself.
router.use('/imports',             imports);
router.use('/university-statements', universityStatements);
router.use('/department-statements', departmentStatements);
// The bell: each user sees only their own rows (the controller scopes by req.user).
router.use('/notifications',       notifications);

export default router;
