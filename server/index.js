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

import db from './models/index.js';
import api from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { assertDbConnection, sequelize } from './config/sequelize.js';
import { clearColumnCache } from './utils/dbHelpers.js';
import { relaxCodeUniqueConstraints } from './utils/relaxIndexes.js';
import { pruneDuplicateIndexes } from './utils/pruneIndexes.js';
import { dissolveCourseOfferings } from './utils/dissolveCourseOfferings.js';
import { enforceForeignKeyDeleteRules } from './utils/foreignKeyRules.js';
import { seedCurriculumIfEmpty, backfillYearLevelsFromCatalog } from './controllers/courseController.js';
import { rebuildOfferings, ensureOfferingConstraints, repairCrossPeriodAssignments } from './utils/rebuildOfferings.js';
import { renameAssignmentsTable } from './utils/renameAssignmentsTable.js';
import { renameIdColumns } from './utils/renameIdColumns.js';
import { backfillProgramHeadIds } from './controllers/programController.js';

dotenv.config();

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

    // Step 1.5: prune duplicate indexes that previous sync() calls
    // may have accumulated (Sequelize creates label_2, label_3, …
    // on repeated boots, eventually hitting MySQL's 64-key limit).
    // MUST run before sync, otherwise sync will fail with ER_TOO_MANY_KEYS.
    console.log('[boot] step 1.5: prune duplicate indexes…');
    await pruneDuplicateIndexes();

    // Retire course_offerings and repoint everything that referenced it onto
    // the catalog. MUST run before sync, so sync can then build the new FKs
    // against rows that exist. No-op once the table is gone.
    console.log('[boot] step 1.6: dissolve course_offerings…');
    await dissolveCourseOfferings();

    // sync() creates a missing FK but never rewrites an existing one's delete
    // rule, so a FK that synced with the wrong ON DELETE would stay wrong.
    // Drop the mismatched ones here and let sync rebuild them from the models.
    console.log('[boot] step 1.7: enforce FK delete rules…');
    await enforceForeignKeyDeleteRules();

    // Turn program_course_offerings into a true (course × program) associative
    // entity. MUST precede sync(): sync would drop courses.program_id (the data
    // this reads), and could not add UNIQUE(course_id, program_id) while the
    // old duplicate rows still exist.
    // course_assignments → course_offering_assignments. FIRST, and before
    // sync(): every step below (and sync itself) addresses the table by its new
    // name, and sync would otherwise create an empty one alongside the real one.
    console.log('[boot] step 1.75: rename assignments table…');
    await renameAssignmentsTable();

    // Key columns → <entity>_id, with every FK matching the PK it points at.
    // Runs after the TABLE rename (it addresses course_offering_assignments by
    // its new name) and before everything else, since every step below — and
    // sync() itself — now addresses columns by their new names.
    console.log('[boot] step 1.76: rename key columns (PK/FK → <entity>_id)…');
    await renameIdColumns();

    console.log('[boot] step 1.8: rebuild course offerings (course × program)…');
    await rebuildOfferings();

    console.log('[boot] step 2: sync (alter mode — adds missing columns)…');
    await sequelize.sync({ alter: true });
    console.log('[db] sync complete — schema matches models.');
    clearColumnCache();

    await relaxCodeUniqueConstraints();
    console.log('[db] code-unique constraints relaxed (cross-period clones can now insert).');

    // Cut loose any assignment holding another period's course BEFORE the
    // offering backfill below tries to link it. Ordering matters: that backfill
    // is what turns a cross-period course_id into a cross-period offering link,
    // and the offering link is globally UNIQUE — which is what was breaking the
    // Course Assignment upload with "Duplicate value for ca_offering_unique".
    await repairCrossPeriodAssignments();

    // Runs every boot, unguarded: drops the legacy index that forbids one
    // course in two programs, and links any assignment still missing its
    // offering. Deliberately NOT inside rebuildOfferings — that one is guarded,
    // and a guard already skipped these once.
    await ensureOfferingConstraints();

    // Curriculum auto-seed intentionally disabled — the module starts fully
    // empty (no terms, no courses). A Program Head uploads the curriculum.
    // Re-enable by uncommenting if you want the 8 sample courses back.
    // await seedCurriculumIfEmpty();

    // One-time (idempotent) backfill: resolve programs.program_head_id from
    // the existing program_head name + period faculty list.
    await backfillProgramHeadIds();

    // One-time (idempotent) backfill: sync course_offerings/course_offering_assignments
    // year_level from the catalog so moved courses reflect everywhere.
    await backfillYearLevelsFromCatalog();


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
  });
})();
