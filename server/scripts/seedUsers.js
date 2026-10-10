/**
 * npm run db:seed:users                    (Docker: docker exec ca-api npm run db:seed:users)
 *   Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD, plus — in
 *   development — the demo accounts below. Create-only: safe to run again.
 *
 * npm run db:seed:users -- --reset-demo    (Docker: docker exec ca-api npm run db:seed:users -- --reset-demo)
 *   Development only. Brings an existing database's demo accounts in line with
 *   the list (name, roles, password, unlocked), creates missing ones, and
 *   retires the old Junar Danila / Agnes Reyes accounts (deleted if never used,
 *   else disabled). Accounts with any other email are never touched.
 *
 * Demo accounts (development only; source of truth: utils/seedUsers.js):
 *   Instructor             monica.norton@unc.edu.ph    Instructor@2026
 *   Program Head (+Instr.) olivia.vance@unc.edu.ph     ProgramHead@2026
 *   Director of Libraries  maria.santos@unc.edu.ph     Library@2026
 *   Industry Consultant    roberto.cruz@unc.edu.ph     Consultant@2026
 *   Dean                   sophia.sterling@unc.edu.ph  Dean@2026
 *   VPAA                   carlos.garcia@unc.edu.ph    Vpaa@2026
 */
import dotenv from 'dotenv';
import db from '../models/index.js';
import { seedUsers, SeedError, DEMO_ACCOUNTS } from '../utils/seedUsers.js';
import { resolveLinks } from '../controllers/authController.js';

dotenv.config();

const resetDemo = process.argv.includes('--reset-demo');

const linkText = (links) => {
  const l = links || {};
  return [
    l.facultyId ? 'faculty #' + l.facultyId : null,
    l.consultantId ? 'consultant #' + l.consultantId : null,
  ].filter(Boolean).join(', ') || '—';
};

function printTable(rows) {
  const head = ['email', 'display name', 'roles', 'password', 'action', 'links (current period)'];
  const body = rows.map((r) => [r.email, r.display_name, r.roles.join(', '), r.password || '—', r.action, r.action === 'deleted' || r.action === 'disabled' ? '—' : linkText(r.links)]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  body.forEach((b) => console.log(line(b)));
}

// Who must link to a faculty row for their pages to work.
const NEEDS_FACULTY = {
  'Program Head': 'Program Head pages will show no programs.',
  'Dean': 'Dean pages have no faculty record to read the department from.',
};

try {
  await db.UserAccount.sync();   // creates the table if the API hasn't booted yet
  const { created, existing, demo, notes } = await seedUsers({
    Model: db.UserAccount,
    linkFor: (account) => resolveLinks(account),
    resetDemo,
  });

  notes.forEach((n) => console.log('[seed] note: ' + n));

  if (resetDemo) {
    created.filter((c) => !demo.some((d) => d.email === c.email))
      .forEach((c) => console.log('[seed] created ' + c.email + '  (' + c.display_name + ' — ' + c.roles.join(', ') + ')'));
    console.log('[seed] --reset-demo:');
    printTable(demo);
    // The linking check: the roles whose pages depend on a faculty row.
    for (const d of DEMO_ACCOUNTS) {
      const row = demo.find((r) => r.email === d.email);
      const missing = d.roles.find((r) => NEEDS_FACULTY[r]);
      if (row && missing && !(row.links && row.links.facultyId)) {
        console.log('[seed] note: ' + d.email + ' has no faculty row in the current period — ' + NEEDS_FACULTY[missing]);
      }
    }
  } else {
    if (!created.length) console.log('[seed] nothing to create — every account already exists.');
    created.forEach((c) => {
      console.log('[seed] created ' + c.email + '  (' + c.display_name + ' — ' + c.roles.join(', ') + ')  → ' + linkText(c.links));
    });
  }
  if (existing.length) console.log('[seed] already existed (left as is): ' + existing.join(', '));
  await db.sequelize.close();
} catch (err) {
  console.error('[seed] ' + (err instanceof SeedError ? err.message : (err && err.stack) || err));
  await db.sequelize.close().catch(() => {});
  process.exit(1);
}
