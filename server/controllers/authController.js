/**
 * Sign-in, sign-out, "who am I", change password.
 *
 *   POST /api/auth/login            { email, password }      (public)
 *   POST /api/auth/logout
 *   GET  /api/auth/me               ?period_id=
 *   POST /api/auth/change-password  { current_password, new_password }
 *
 * Failures never say which part was wrong: an unknown email, a wrong password
 * and a disabled account all get the same 401. Only two cases differ, and
 * neither leaks a secret: an email outside the allowed domain (400, the domain
 * is public), and a locked account (423, after MAX_ATTEMPTS failures).
 */
import bcrypt from 'bcryptjs';
import { Op, fn, col, where as sqlWhere } from 'sequelize';
import db from '../models/index.js';
import { getActiveTermId } from '../utils/latestPeriod.js';
import { issueSession, clearSession } from '../utils/session.js';
import { isAllowedEmail, normalizeEmail, domainMessage } from '../utils/roles.js';

export const BCRYPT_COST = 10;
export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;
export const MIN_PASSWORD = 8;

export const MESSAGES = {
  badLogin: 'Incorrect email or password.',
  locked:   'Too many attempts. Try again in 15 minutes.',
};

// Compared against when the email is unknown, so a miss costs the same time
// as a wrong password and response timing doesn't reveal which emails exist.
let dummyHash = null;
const getDummyHash = async () => {
  if (!dummyHash) dummyHash = await bcrypt.hash('not-a-real-password', BCRYPT_COST);
  return dummyHash;
};

export const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_COST);

/**
 * The login decision, independent of Express so the tests (and the seed) can
 * run it against any UserAccount model. Returns
 *   { status: 200, account }  or  { status: 400|401|423, message }.
 */
export async function verifyLogin(Model, rawEmail, password) {
  const email = normalizeEmail(rawEmail);
  if (!isAllowedEmail(email)) return { status: 400, message: domainMessage() };

  const account = await Model.scope('withHash').findOne({ where: { email } });
  const given = typeof password === 'string' ? password : '';
  if (!account) {
    await bcrypt.compare(given, await getDummyHash());
    return { status: 401, message: MESSAGES.badLogin };
  }

  const now = Date.now();
  if (account.locked_until) {
    if (new Date(account.locked_until).getTime() > now) return { status: 423, message: MESSAGES.locked };
    // The lock has run out: the count starts over.
    account.failed_attempts = 0;
    account.locked_until = null;
  }

  const ok = given !== '' && await bcrypt.compare(given, account.password_hash);
  if (!ok) {
    account.failed_attempts = (account.failed_attempts || 0) + 1;
    const lockNow = account.failed_attempts >= MAX_ATTEMPTS;
    if (lockNow) account.locked_until = new Date(now + LOCK_MS);
    await account.save({ fields: ['failed_attempts', 'locked_until'] });
    return lockNow ? { status: 423, message: MESSAGES.locked } : { status: 401, message: MESSAGES.badLogin };
  }

  if (account.status !== 'Active') {
    // A right password on a disabled account reads exactly like a wrong one.
    if (account.changed()) await account.save({ fields: ['failed_attempts', 'locked_until'] });
    return { status: 401, message: MESSAGES.badLogin };
  }

  account.failed_attempts = 0;
  account.locked_until = null;
  account.last_login_at = new Date(now);
  await account.save({ fields: ['failed_attempts', 'locked_until', 'last_login_at'] });
  return { status: 200, account };
}

// --- Linking the account to this period's people --------------------------

const words = (s) => String(s || '')
  .toLowerCase()
  .replace(/\b(dr|prof|professor|engr|atty|mr|mrs|ms)\.?\s+/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean);
// Word-set comparison, so "Danila, Junar" matches "Junar Danila".
const nameKey = (s) => words(s).sort().join(' ');

/**
 * The period's row for this account: same email first, then the same name.
 * Prefers an Active row when several match. Models without an email column
 * (industry_consultants) go straight to the name.
 */
async function linkRow(Model, periodId, account) {
  if (!Model || !periodId) return null;
  const pick = (rows) => (rows.find((r) => r.status === 'Active') || rows[0] || null);
  const attrs = ['id', 'name', 'status'];

  if (Model.rawAttributes.email) {
    const byEmail = await Model.findAll({
      attributes: attrs,
      where: { period_id: periodId, [Op.and]: [sqlWhere(fn('LOWER', fn('TRIM', col('email'))), account.email)] },
    });
    if (byEmail.length) return pick(byEmail);
  }
  const key = nameKey(account.display_name);
  if (!key) return null;
  const all = await Model.findAll({ attributes: attrs, where: { period_id: periodId } });
  return pick(all.filter((r) => nameKey(r.name) === key));
}

export async function resolveLinks(account, periodId) {
  const pid = Number(periodId) || await getActiveTermId();
  const [faculty, consultant] = await Promise.all([
    linkRow(db.Faculty, pid, account),
    linkRow(db.IndustryConsultant, pid, account),
  ]);
  return { facultyId: faculty ? faculty.id : null, consultantId: consultant ? consultant.id : null };
}

/** The ONLY shape an account takes on its way to the browser. */
export const presentUser = (account, links = {}) => ({
  id: account.id,
  email: account.email,
  display_name: account.display_name,
  // Stored order: the first role is the default one the app opens as.
  roles: [...(account.roles || [])],
  must_change_password: !!account.must_change_password,
  facultyId: links.facultyId ?? null,
  consultantId: links.consultantId ?? null,
});

// --- Handlers --------------------------------------------------------------

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const result = await verifyLogin(db.UserAccount, email, password);
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });

    issueSession(res, result.account);
    const links = await resolveLinks(result.account, req.body && req.body.period_id);
    return res.json({ user: presentUser(result.account, links) });
  } catch (err) {
    return next(err);
  }
}

export function logout(_req, res) {
  clearSession(res);
  res.status(204).end();
}

export async function me(req, res, next) {
  try {
    const links = await resolveLinks(req.user, req.query.period_id);
    return res.json({ user: presentUser(req.user, links) });
  } catch (err) {
    return next(err);
  }
}

/** Problems with a proposed new password, or [] when it's acceptable. */
export function passwordProblems(newPassword, { email, currentPassword } = {}) {
  const p = typeof newPassword === 'string' ? newPassword : '';
  const problems = [];
  if (p.length < MIN_PASSWORD) problems.push('The new password needs at least ' + MIN_PASSWORD + ' characters.');
  if (email && p.trim().toLowerCase() === String(email).toLowerCase()) problems.push("The new password can't be your email address.");
  if (currentPassword != null && p === currentPassword) problems.push('The new password must be different from the current one.');
  return problems;
}

export async function changePassword(req, res, next) {
  try {
    const { current_password: current, new_password: next_ } = req.body || {};
    const account = await db.UserAccount.scope('withHash').findByPk(req.user.id);
    const ok = typeof current === 'string' && current !== '' && await bcrypt.compare(current, account.password_hash);
    if (!ok) return res.status(400).json({ message: 'Your current password is incorrect.', field: 'current_password' });

    const problems = passwordProblems(next_, { email: account.email, currentPassword: current });
    if (problems.length) return res.status(400).json({ message: problems[0], field: 'new_password' });

    account.password_hash = await hashPassword(next_);
    account.must_change_password = false;
    await account.save({ fields: ['password_hash', 'must_change_password'] });

    issueSession(res, account);
    const links = await resolveLinks(account, req.query.period_id);
    return res.json({ user: presentUser(account, links) });
  } catch (err) {
    return next(err);
  }
}
