/**
 * Data purge — wipes every operational table back to a fresh-install state.
 *
 * Run from the `server/` directory:
 *
 *     node scripts/purge.js
 *
 * What it does:
 *   1. Disables FK checks, TRUNCATEs every data table, re-enables FK checks.
 *      TRUNCATE resets AUTO_INCREMENT so new rows start at id = 1.
 *   2. Deletes every file inside ./uploads/ except .gitkeep.
 *
 * Tables intentionally NOT touched:
 *   - SequelizeMeta (migration ledger)
 *   - Any schema-only metadata Sequelize maintains
 *
 * This is a destructive operation. There is no confirmation prompt.
 * Stop the backend before running it (it doesn't matter if the backend
 * is up, but a running backend may immediately re-trigger schema sync /
 * lazy autoclose logic on next request).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import db from '../models/index.js';
import { sequelize } from '../config/sequelize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// FK-safe TRUNCATE order (cheap because we disable FK checks anyway,
// but listed in child→parent order for clarity).
const TABLES = [
  'course_offering_assignments',
  'consultant_courses',
  'industry_consultants',
  'prerequisites',
  'program_course_offerings',
  'courses',
  'programs',
  'faculty',
  'departments',
  'academic_periods',
];

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

async function purgeDatabase() {
  console.log('[purge] connecting…');
  await sequelize.authenticate();

  console.log('[purge] disabling foreign key checks…');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const t of TABLES) {
    try {
      await sequelize.query('TRUNCATE TABLE `' + t + '`');
      console.log('[purge]   truncated ' + t);
    } catch (err) {
      console.warn('[purge]   skipped ' + t + ' (' + err.message + ')');
    }
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('[purge] foreign key checks restored.');
}

async function purgeUploads() {
  console.log('[purge] scrubbing uploads dir: ' + UPLOADS_DIR);
  try {
    const entries = await fs.readdir(UPLOADS_DIR);
    for (const name of entries) {
      if (name === '.gitkeep') continue;
      const p = path.join(UPLOADS_DIR, name);
      const stat = await fs.lstat(p);
      if (stat.isDirectory()) {
        await fs.rm(p, { recursive: true, force: true });
      } else {
        await fs.unlink(p);
      }
      console.log('[purge]   removed ' + name);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('[purge]   uploads dir not found — nothing to clean.');
    } else {
      console.warn('[purge]   uploads scrub error: ' + err.message);
    }
  }
}

(async () => {
  try {
    await purgeDatabase();
    await purgeUploads();
    console.log('[purge] done. Fresh-install state restored.');
  } catch (err) {
    console.error('[purge] failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
})();

// Silence the "imported but unused" lint warning for the model registry —
// importing `db` ensures models register with sequelize even though we
// only need the connection here.
void db;
