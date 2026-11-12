/**
 * The schema half of the API's boot, on its own: everything from "prune
 * duplicate indexes" to "offering constraints". index.js runs it on every
 * start; `npm run db:sync` (scripts/dbSync.js) runs it alone, which is how CI
 * builds a fresh database after `npm run db:migrate` — the migrations only
 * cover changes made since the schema moved to sync({ alter: true }).
 *
 * The ORDER matters; the comments say why each step sits where it does.
 */
import { sequelize } from '../config/sequelize.js';
import { clearColumnCache } from './dbHelpers.js';
import { relaxCodeUniqueConstraints } from './relaxIndexes.js';
import { pruneDuplicateIndexes } from './pruneIndexes.js';
import { dissolveCourseOfferings } from './dissolveCourseOfferings.js';
import { enforceForeignKeyDeleteRules } from './foreignKeyRules.js';
import { rebuildOfferings, ensureOfferingConstraints, repairCrossPeriodAssignments } from './rebuildOfferings.js';
import { renameAssignmentsTable } from './renameAssignmentsTable.js';
import { renameIdColumns } from './renameIdColumns.js';

export async function prepareSchema() {
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
}
