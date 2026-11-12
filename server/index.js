/**
 * Express entry point.
 *
 * Boot sequence:
 *   1. authenticate() — fail fast if .env / Docker are wrong
 *   2. sync({ alter: true }) — keep schema in step with model files
 *   3. Listen.
 *
 * Note: the previous "ensureDefaultPeriod" auto-seeder is intentionally
 * removed. Deleted periods stay deleted; the user adds new ones from
 * the PeriodSelector's "+ Period" button.
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import './models/index.js'; // registers every model before the schema steps
import api from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { assertDbConnection } from './config/sequelize.js';
import { prepareSchema } from './utils/prepareSchema.js';
import { backfillYearLevelsFromCatalog } from './controllers/courseController.js';
import { backfillProgramHeadIds, reconcileProgramHeads } from './controllers/programController.js';
import { fixAllCapsAssignmentNames } from './utils/fixNameCase.js';
import { assertAuthConfig } from './utils/session.js';
import { startEmailWorker } from './workers/emailWorker.js';
import { baselineNotices } from './services/notices.js';

dotenv.config();

// Production without JWT_SECRET refuses to boot; development warns and uses a
// fixed dev secret (utils/session.js).
try {
  assertAuthConfig();
} catch (err) {
  console.error('[auth] ' + err.message);
  process.exit(1);
}

const app = express();

const isLocalhost = (origin) => {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch (_) { return false; }
};
const allowedFromEnv = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (allowedFromEnv.length === 0) return cb(null, isLocalhost(origin));
    return cb(null, allowedFromEnv.includes(origin) || isLocalhost(origin));
  },
  credentials: true,
}));
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));
// Never log a link token: GET /api/auth/invitation?token=… would otherwise
// print it in every request line.
morgan.token('url', (req) => String(req.originalUrl || req.url).replace(/([?&]token=)[^&]*/gi, '$1[redacted]'));
app.use(morgan('dev'));

let firstRequestLogged = false;
app.use((req, _res, next) => {
  if (!firstRequestLogged) {
    firstRequestLogged = true;
    console.log('[cors] first request received  origin=' + (req.headers.origin || '(none)') + '  path=' + req.path);
  }
  next();
});

app.use('/api', api);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 4000);

(async () => {
  console.log('[boot] starting…');
  console.log('[boot] DB target: ' + (process.env.DB_HOST || '127.0.0.1') + ':' + (process.env.DB_PORT || 3307) +
              ' / ' + (process.env.DB_NAME || 'course_assignment') +
              ' as user ' + (process.env.DB_USER || 'ca_user'));

  try {
    console.log('[boot] step 1: authenticate…');
    await assertDbConnection();
    console.log('[db] connected.');

    // Steps 1.5 → 2 and the offering constraints: utils/prepareSchema.js
    // (also run alone by `npm run db:sync`, e.g. in CI).
    await prepareSchema();

    // Curriculum auto-seed intentionally disabled — the module starts fully
    // empty (no terms, no courses). A Program Head uploads the curriculum.
    // Re-enable by uncommenting if you want the 8 sample courses back.
    // await seedCurriculumIfEmpty();

    // One-time (idempotent) backfill: resolve programs.program_head_id from
    // the existing program_head name + period faculty list.
    await backfillProgramHeadIds();
    // Every head named in the active term's programs list has the Program Head role.
    try {
      const { getActiveTermId } = await import('./utils/latestPeriod.js');
      const activeId = await getActiveTermId();
      if (activeId) await reconcileProgramHeads(activeId);
    } catch (err) {
      console.error('[program-head] boot reconcile skipped:', err.message);
    }

    // Older uploads stored registrar names in ALL CAPS; show them in normal case.
    try {
      const n = await fixAllCapsAssignmentNames();
      if (n) console.log('[names] ' + n + ' course assignment(s) changed from ALL CAPS to normal case');
    } catch (err) {
      console.error('[names] ALL CAPS fix skipped:', err.message);
    }

    // One-time (idempotent) backfill: sync course_offerings/course_offering_assignments
    // year_level from the catalog so moved courses reflect everywhere.
    await backfillYearLevelsFromCatalog();

    // Notices: the active term's existing assignments and consultant links
    // count as already told, so a deploy never emails about old data.
    await baselineNotices().catch((err) => console.error('[notices] baseline failed:', err.message));

    console.log('[boot] no auto-seed (periods are user-managed).');
  } catch (err) {
    console.error('[db] boot failed.');
    console.error('     name:    ' + (err && err.name));
    console.error('     message: ' + (err && err.message));
    console.error('     code:    ' + (err && (err.code || err.original && err.original.code)));
    console.error('     errno:   ' + (err && (err.errno || err.original && err.original.errno)));
    console.error('     sqlMsg:  ' + (err && err.original && err.original.sqlMessage));
    console.error('     stack:');
    console.error(err && err.stack);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log('[api] listening on http://localhost:' + PORT);
    console.log('[api] CORS: ' + (allowedFromEnv.length ? 'env list = ' + allowedFromEnv.join(',') : 'any localhost (dev mode)'));
    // Sends upload invitations once their undo window has passed, and retries.
    startEmailWorker();
  });
})();
