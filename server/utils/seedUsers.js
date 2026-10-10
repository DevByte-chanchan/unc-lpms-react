/**
 * Account seed.
 *
 *   - Always: one admin (VPAA) from ADMIN_EMAIL / ADMIN_PASSWORD. Refuses to run
 *     if ADMIN_EMAIL isn't an allowed-domain address. must_change_password is
 *     set, so the .env password is only ever a first-login password.
 *   - Development only (NODE_ENV !== 'production'): the six DEMO_ACCOUNTS, each
 *     with its own password, ready to sign in (no forced change).
 *
 * Two modes:
 *   seedUsers()                    create-only and idempotent: an account that
 *                                  already exists is never touched.
 *   seedUsers({ resetDemo: true }) development only: bring the demo accounts in
 *                                  line with DEMO_ACCOUNTS (name, roles, password,
 *                                  unlocked) and retire RETIRED_DEMO_EMAILS.
 *                                  Touches nothing else — only these exact emails.
 *
 * The logic lives here so the tests can run it against a scratch table;
 * scripts/seedUsers.js is the CLI wrapper.
 */
import { hashPassword, passwordProblems, MIN_PASSWORD } from '../controllers/authController.js';
import { isAllowedEmail, normalizeEmail, domainMessage, validRoles } from './roles.js';

// Dev-only passwords, deliberately in source: these accounts never exist in production.
export const DEMO_ACCOUNTS = Object.freeze([
  { email: 'monica.norton@unc.edu.ph',   display_name: 'Monica Norton',   roles: ['Instructor'],                 password: 'Instructor@2026' },
  { email: 'olivia.vance@unc.edu.ph',    display_name: 'Olivia Vance',    roles: ['Program Head', 'Instructor'], password: 'ProgramHead@2026' },
  { email: 'maria.santos@unc.edu.ph',    display_name: 'Maria Santos',    roles: ['Director of Libraries'],      password: 'Library@2026' },
  { email: 'roberto.cruz@unc.edu.ph',    display_name: 'Roberto Cruz',    roles: ['Industry Consultant'],        password: 'Consultant@2026' },
  { email: 'sophia.sterling@unc.edu.ph', display_name: 'Sophia Sterling', roles: ['Dean'],                       password: 'Dean@2026' },
  { email: 'carlos.garcia@unc.edu.ph',   display_name: 'Carlos Garcia',   roles: ['VPAA'],                       password: 'Vpaa@2026' },
].map((d) => Object.freeze({ ...d, roles: Object.freeze([...d.roles]) })));

// Demo accounts from an earlier version of this list. --reset-demo removes them.
export const RETIRED_DEMO_EMAILS = Object.freeze(['junar.danila@unc.edu.ph', 'agnes.reyes@unc.edu.ph']);

// A bad edit to the list above fails loudly at import (and so in the tests).
for (const d of DEMO_ACCOUNTS) {
  const problems = passwordProblems(d.password, { email: d.email });
  if (problems.length) throw new Error('Demo account ' + d.email + ': ' + problems.join(' '));
  if (!isAllowedEmail(d.email)) throw new Error('Demo account ' + d.email + ': ' + domainMessage());
  if (!validRoles([...d.roles])) throw new Error('Demo account ' + d.email + ': invalid roles.');
}

export class SeedError extends Error {}

const isProduction = (env) => (env.NODE_ENV || 'development') === 'production';

function adminSpec(env) {
  const email = normalizeEmail(env.ADMIN_EMAIL);
  if (!isAllowedEmail(email)) {
    throw new SeedError('ADMIN_EMAIL must be set to a UNC address. ' + domainMessage());
  }
  if (!env.ADMIN_PASSWORD || String(env.ADMIN_PASSWORD).length < MIN_PASSWORD) {
    throw new SeedError('ADMIN_PASSWORD must be set (at least ' + MIN_PASSWORD + ' characters).');
  }
  return {
    email,
    display_name: String(env.ADMIN_NAME || 'Administrator').trim().slice(0, 100) || 'Administrator',
    roles: ['VPAA'],
    password: String(env.ADMIN_PASSWORD),
    must_change_password: true,
  };
}

/** Does the account have rows in account_invitations? False when that table doesn't exist. */
async function hasInvitations(Model, account) {
  const qi = Model.sequelize.getQueryInterface();
  const tables = (await qi.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
  if (!tables.includes('account_invitations')) return false;
  const cols = Object.keys(await qi.describeTable('account_invitations'));
  const where = [];
  const replacements = {};
  if (cols.includes('user_account_id')) { where.push('user_account_id = :id'); replacements.id = account.id; }
  if (cols.includes('email')) { where.push('LOWER(email) = :email'); replacements.email = account.email; }
  if (!where.length) return true;   // can't tell — keep the account rather than risk orphaning
  const [rows] = await Model.sequelize.query(
    'SELECT COUNT(*) AS n FROM account_invitations WHERE ' + where.join(' OR '), { replacements },
  );
  return Number(rows[0].n) > 0;
}

const report = (account, password, action, links) => ({
  email: account.email,
  display_name: account.display_name,
  roles: [...account.roles],
  password,
  action,
  ...(links ? { links } : {}),
});

/**
 * @param Model     the UserAccount model
 * @param env       process.env-like object
 * @param linkFor   optional async (account) => { facultyId, consultantId }, for the report
 * @param resetDemo development only: update/create the demo accounts, retire the old ones
 * @returns {
 *   created:  [{ email, display_name, roles, links? }],   accounts this run created (admin included)
 *   existing: [email],                                      left alone (plain mode)
 *   demo:     [{ email, display_name, roles, password, action, links? }],   reset mode only
 *   notes:    [string],
 * }
 * Never returns or logs a password hash.
 */
export async function seedUsers({ Model, env = process.env, linkFor = null, resetDemo = false }) {
  const admin = adminSpec(env);
  if (resetDemo && isProduction(env)) {
    throw new SeedError('--reset-demo is for development only; refusing to run with NODE_ENV=production.');
  }

  const notes = [];
  if (env.DEV_SEED_PASSWORD) notes.push('DEV_SEED_PASSWORD is no longer used — each demo account has its own password.');

  const created = [];
  const existing = [];
  const demo = [];
  const withLinks = async (account) => (linkFor ? linkFor(account) : undefined);

  const createAccount = async (spec, mustChange) => Model.create({
    email: spec.email,
    display_name: spec.display_name,
    roles: [...spec.roles],
    password_hash: await hashPassword(spec.password),
    must_change_password: mustChange,
    status: 'Active',
  });

  // The admin: create-only in both modes.
  if (await Model.findOne({ where: { email: admin.email } })) {
    existing.push(admin.email);
  } else {
    const a = await createAccount(admin, true);
    created.push({ email: a.email, display_name: a.display_name, roles: a.roles, links: await withLinks(a) });
  }

  if (isProduction(env)) return { created, existing, demo, notes };

  for (const d of DEMO_ACCOUNTS) {
    // The admin's own row is never rewritten, even if ADMIN_EMAIL is a demo email.
    if (d.email === admin.email) { existing.push(d.email); continue; }
    const found = await Model.findOne({ where: { email: d.email } });
    if (!found) {
      const a = await createAccount(d, false);
      const links = await withLinks(a);
      created.push({ email: a.email, display_name: a.display_name, roles: a.roles, links });
      if (resetDemo) demo.push(report(a, d.password, 'created', links));
      continue;
    }
    if (!resetDemo) { existing.push(d.email); continue; }
    await found.update({
      display_name: d.display_name,
      roles: [...d.roles],
      password_hash: await hashPassword(d.password),
      status: 'Active',
      must_change_password: false,
      failed_attempts: 0,
      locked_until: null,
    });
    demo.push(report(found, d.password, 'updated', await withLinks(found)));
  }

  if (resetDemo) {
    for (const email of RETIRED_DEMO_EMAILS) {
      if (email === admin.email) continue;
      const old = await Model.findOne({ where: { email } });
      if (!old) continue;
      if (!old.last_login_at && !(await hasInvitations(Model, old))) {
        await old.destroy();
        demo.push(report(old, null, 'deleted'));
      } else {
        // Kept, so anything that refers to it stays intact; it just can't sign in.
        await old.update({ status: 'Disabled' });
        demo.push(report(old, null, 'disabled'));
      }
    }
  }

  return { created, existing, demo, notes };
}
