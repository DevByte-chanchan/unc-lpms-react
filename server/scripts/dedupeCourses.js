/**
 * npm run courses:dedupe                 dry run: print what would change, change nothing
 * npm run courses:dedupe -- --apply      do it (one transaction), then print a summary
 * npm run courses:dedupe -- --term 3     one term only
 *   (Docker: docker exec ca-api npm run courses:dedupe -- --apply)
 *
 * Refuses with NODE_ENV=production unless --force is given. Never deletes a
 * course — it archives, so View Archived can restore anything. See
 * utils/dedupeCourses.js for what it looks for.
 */
import dotenv from 'dotenv';
import db from '../models/index.js';
import { planDedupe, applyDedupe, describeAction } from '../utils/dedupeCourses.js';

dotenv.config();

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const force = args.includes('--force');
const termIdx = args.indexOf('--term');
const periodId = termIdx >= 0 ? Number(args[termIdx + 1]) || null : null;

try {
  if ((process.env.NODE_ENV || 'development') === 'production' && !force) {
    throw new Error('Refusing to run with NODE_ENV=production. Add --force if you really mean it.');
  }
  await db.sequelize.authenticate();
  const actions = await planDedupe({ periodId });
  const changes = actions.filter((a) => a.archive);
  const reviews = actions.filter((a) => !a.archive);
  console.log('[dedupe] ' + (apply ? 'APPLY' : 'dry run') + ' — ' + changes.length + ' course(s) to archive, ' + reviews.length + ' to review by hand.');
  for (const kind of ['exact_duplicate', 'title_duplicate', 'wrong_semester', 'review']) {
    const list = actions.filter((a) => a.kind === kind);
    if (!list.length) continue;
    console.log('\n' + ({ exact_duplicate: 'Same code twice in a term', title_duplicate: 'Old code next to the Program of Study code', wrong_semester: 'In the wrong semester', review: 'Check by hand' })[kind] + ':');
    list.forEach((a) => console.log('  ' + describeAction(a)));
  }
  if (!apply) {
    console.log('\n[dedupe] Nothing was changed. Run again with --apply to archive these.');
  } else if (changes.length) {
    const r = await applyDedupe(changes);
    console.log('\n[dedupe] archived ' + r.archived + ' course(s); moved ' + r.moved.assignments + ' assignment(s), '
      + r.moved.consultants + ' consultant link(s), ' + r.moved.prerequisites + ' prerequisite row(s). Restore any from View Archived.');
  } else {
    console.log('\n[dedupe] Nothing to do.');
  }
} catch (err) {
  console.error('[dedupe] ' + (err && err.message));
  process.exitCode = 1;
} finally {
  await db.sequelize.close().catch(() => {});
}
