'use strict';

// Sign-up and sign-in for LPMS.
//
// Modelled on my.unc.edu.ph's login, but deliberately NOT a copy of it. Three
// things were taken, and three were left behind on purpose:
//
//   TAKEN
//     * the honeypot field. myUNC hides an input named `body` and treats a
//       filled one as a bot. It costs nothing and needs no dependency.
//     * a role attached to the account rather than chosen freely at sign-in.
//     * an inactive-account state, so access can be withdrawn without
//       deleting the person's approval history.
//
//     * the "Login as" role selector on sign-in. Kept because the screen
//       should read like the portal people already use — but WITHOUT myUNC's
//       weakness: a wrong role and a wrong password return the identical
//       message. Two different errors would let anyone discover which email
//       and role combinations exist by reading the response.
//
//   LEFT BEHIND
//     * the 20-character password cap. That is a legacy limit; capping length
//       throws away entropy for no benefit.
//     * ASP.NET's __VIEWSTATE / __EVENTVALIDATION, which solve a WebForms
//       postback problem this app does not have.

const { User } = require('../models');
const { hashPassword, verifyPassword, needsRehash } = require('../utils/password');
const { TTL_MS: RESET_TTL_MS, createToken, hashToken, expiryFrom, verifyReset } = require('../utils/resetToken');
const { COOKIE_NAME, SESSION_TTL_MS, issueSession, revokeSession, revokeUserSessions, revokeOtherUserSessions } = require('../middleware/auth');
const { mailer, resetEmail } = require('../utils/mailer');

const { record: audit } = require('../utils/audit');

const ROLE_KEYS = require('../models/user').ROLE_KEYS;

// Sign-in events for the audit trail. Never pass a password or token in `details`.
const auditAuth = (req, action, outcome, user, details) => audit({
    actor: user ? { id: user.user_id ?? user.id, name: user.name, role: user.role } : null,
    action, entityType: 'auth', entityId: user ? (user.user_id ?? user.id) : null,
    outcome, details, ip: req.ip
});

// ONE message for every way a sign-in can fail: unknown email, wrong
// password, wrong role. The moment these differ, the form becomes an oracle
// for enumerating accounts.
const GENERIC_CREDENTIAL_ERROR = 'Incorrect email, password or role.';
const PUBLISHED_DEMO_PASSWORD = 'demo1234';
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// ---------------------------------------------------------- lockout ---

// Per-email failed-attempt counter. In memory, so it resets when the server
// restarts — enough to blunt online guessing, and honest about what it is.
// A production system would keep this in the database or a cache.
const attempts = new Map();
const LOCKOUT = { max: 5, windowMs: 15 * 60 * 1000, maxEntries: 5000 };
const sourceAttempts = new Map();
const SOURCE_LIMIT = { max: 30, windowMs: 15 * 60 * 1000, maxEntries: 1000 };
const registrationAttempts = new Map();
const REGISTRATION_LIMIT = { max: 5, windowMs: 15 * 60 * 1000, maxEntries: 1000 };

const recordFailure = (key, now = Date.now()) => {
    if (!attempts.has(key) && attempts.size >= LOCKOUT.maxEntries) {
        attempts.delete(attempts.keys().next().value);
    }
    const entry = attempts.get(key) || { count: 0, first: now };
    if (now - entry.first > LOCKOUT.windowMs) { entry.count = 0; entry.first = now; }
    entry.count += 1;
    attempts.set(key, entry);
};

const isLockedOut = (key, now = Date.now()) => {
    const entry = attempts.get(key);
    if (!entry) return false;
    if (now - entry.first > LOCKOUT.windowMs) { attempts.delete(key); return false; }
    return entry.count >= LOCKOUT.max;
};

const clearFailures = (key) => attempts.delete(key);
const clearFailuresForEmail = (email) => {
    const suffix = `\u0000${email}`;
    for (const key of attempts.keys()) {
        if (key.endsWith(suffix)) attempts.delete(key);
    }
};

const recordSourceFailure = (source, now = Date.now()) => {
    if (!sourceAttempts.has(source) && sourceAttempts.size >= SOURCE_LIMIT.maxEntries) {
        sourceAttempts.delete(sourceAttempts.keys().next().value);
    }
    const entry = sourceAttempts.get(source) || { count: 0, first: now };
    if (now - entry.first > SOURCE_LIMIT.windowMs) { entry.count = 0; entry.first = now; }
    entry.count += 1;
    sourceAttempts.set(source, entry);
};

const isSourceLimited = (source, now = Date.now()) => {
    const entry = sourceAttempts.get(source);
    if (!entry) return false;
    if (now - entry.first > SOURCE_LIMIT.windowMs) { sourceAttempts.delete(source); return false; }
    return entry.count >= SOURCE_LIMIT.max;
};

const consumeRegistrationAttempt = (source, now = Date.now()) => {
    if (!registrationAttempts.has(source) && registrationAttempts.size >= REGISTRATION_LIMIT.maxEntries) {
        registrationAttempts.delete(registrationAttempts.keys().next().value);
    }
    const entry = registrationAttempts.get(source) || { count: 0, first: now };
    if (now - entry.first > REGISTRATION_LIMIT.windowMs) {
        entry.count = 0;
        entry.first = now;
    }
    if (entry.count >= REGISTRATION_LIMIT.max) return false;
    entry.count += 1;
    registrationAttempts.set(source, entry);
    return true;
};

const publicRegistrationEnabled = (source) => {
    if (process.env.LPMS_ALLOW_PUBLIC_REGISTRATION === '1') return true;
    // Keep the zero-config localhost demo usable, but fail closed for remote
    // callers whenever deployment mode is missing or misspelled.
    return process.env.NODE_ENV !== 'production' && LOOPBACK_ADDRESSES.has(source);
};

// Approver self-registration exists only for the zero-config local demo.
// Even LPMS_ALLOW_PUBLIC_REGISTRATION must not grant privileged roles to a
// deployed or remote caller.
const localPrivilegedRegistrationEnabled = (source) =>
    process.env.NODE_ENV !== 'production' && LOOPBACK_ADDRESSES.has(source);

// ---------------------------------------------------------- helpers ---

const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

const startSession = (res, user) => {
    const token = issueSession(user);
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_TTL_MS
    });
};

// myUNC's `div#magic` trick: a field hidden from real users. A browser leaves
// it empty; a script that fills every input does not.
const isBot = (body) => Boolean(String(body?.body ?? '').trim());

const validatePassword = (password) => {
    const value = String(password ?? '');
    if (value.length < 8) return 'Password must be at least 8 characters.';
    // No maximum. myUNC caps at 20; there is no reason to.
    if (value.length > 200) return 'Password is unreasonably long.';
    if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
        return 'Password must contain at least one letter and one number.';
    }
    return null;
};

// ------------------------------------------------------------ register ---

exports.register = async (req, res, next) => {
    try {
        if (isBot(req.body)) {
            // Say nothing useful to the script; look like an ordinary refusal.
            return res.status(400).json({ error: 'Registration could not be completed.' });
        }

        const source = req.ip || req.socket?.remoteAddress || 'unknown';
        if (!publicRegistrationEnabled(source)) {
            return res.status(403).json({
                error: 'Public registration is disabled. Contact the system administrator.'
            });
        }

        if (!consumeRegistrationAttempt(source)) {
            return res.status(429).json({
                error: 'Too many registration attempts. Wait a few minutes and try again.'
            });
        }

        const name = String(req.body?.name || '').trim();
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password ?? '');
        const role = String(req.body?.role || '').trim();

        if (!name) return res.status(400).json({ error: 'Full name is required.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
        if (!ROLE_KEYS.includes(role)) return res.status(400).json({ error: 'Select a valid role.' });
        // The superuser is never self-registered, not even in the local demo.
        if (role === 'superuser') return res.status(403).json({ error: 'This role cannot be self-registered.' });
        if (role !== 'instructor' && !localPrivilegedRegistrationEnabled(source)) {
            return res.status(403).json({ error: 'Approver accounts must be provisioned by an administrator.' });
        }

        const passwordProblem = validatePassword(password);
        if (passwordProblem) return res.status(400).json({ error: passwordProblem });

        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

        const user = await User.create({
            name,
            email,
            role,
            password_hash: await hashPassword(password)
        });

        startSession(res, user);
        auditAuth(req, 'REGISTER', 'success', user, { role: user.role });
        return res.status(201).json({ user: user.toPublic() });
    } catch (err) {
        // A unique-constraint race between the check above and the insert.
        if (err?.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'An account with that email already exists.' });
        }
        return next(err);
    }
};

// --------------------------------------------------------------- login ---

exports.login = async (req, res, next) => {
    try {
        if (isBot(req.body)) return res.status(401).json({ error: GENERIC_CREDENTIAL_ERROR });

        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password ?? '');
        // Optional: the "Login as" selector. When sent it must match the
        // account, but a mismatch is reported exactly like a bad password.
        const claimedRole = String(req.body?.role || '').trim();
        const source = req.ip || req.socket?.remoteAddress || 'unknown';
        const attemptKey = `${source}\u0000${email}`;

        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
        if (claimedRole && !ROLE_KEYS.includes(claimedRole)) {
            return res.status(401).json({ error: GENERIC_CREDENTIAL_ERROR });
        }

        if (isSourceLimited(source) || isLockedOut(attemptKey)) {
            auditAuth(req, 'LOGIN', 'denied', null, { email, reason: 'locked-out' });
            return res.status(429).json({
                error: 'Too many failed attempts. Wait a few minutes and try again.'
            });
        }

        // NO ACCOUNTS AT ALL IS NOT A CREDENTIAL DECISION.
        //
        // This is the hole the crash fix opened. Before it, a database with no
        // Users table made this route fail with a 500, the client read that as
        // "the server cannot do auth", and it fell back to the built-in demo
        // accounts. Now the table is created at boot — so the route works
        // perfectly and answers every sign-in with a truthful 401, because the
        // table is EMPTY. A correct refusal, and the demo accounts became
        // unreachable: "Incorrect email, password or role." for credentials
        // that were never wrong.
        //
        // 503, not 401. The distinction is real rather than a trick to get the
        // fallback: with zero accounts this service cannot authenticate
        // anybody, so it is unavailable, not deciding. The client treats only
        // 400/401/403/409/423 as decisions and everything else as "no answer",
        // which is what makes the demo accounts work again — and a 401 still
        // never falls through, so nothing is loosened.
        //
        // This leaks no account information: it says the deployment has not
        // been seeded, which the sign-in screen already displays.
        if ((await User.count()) === 0) {
            return res.status(503).json({
                error: 'No accounts have been created on this server yet.',
                setup: 'no-accounts'
            });
        }

        const user = await User.scope('withSecret').findOne({ where: { email } });

        // Hash even when there is no such account, so a missing email and a
        // wrong password take the same amount of time. Without this the
        // response time alone reveals which emails are registered.
        const storedHash = user ? user.password_hash : 'scrypt$16384$8$1$00$00';
        const ok = await verifyPassword(password, storedHash);

        // The role check rides along with the password check so both failures
        // cost the same time and return the same body. Note it is evaluated
        // AFTER the hash comparison above, never as an early exit — an early
        // return would make a role mismatch measurably faster than a bad
        // password and give the difference away by timing.
        const roleOk = !claimedRole || (user && user.role === claimedRole);
        const publishedDemoCredential =
            process.env.NODE_ENV === 'production' && password === PUBLISHED_DEMO_PASSWORD;

        if (!user || !ok || !roleOk || publishedDemoCredential) {
            recordFailure(attemptKey);
            recordSourceFailure(source);
            auditAuth(req, 'LOGIN', 'failed', null, { email });
            return res.status(401).json({ error: GENERIC_CREDENTIAL_ERROR });
        }

        if (!user.is_active) {
            auditAuth(req, 'LOGIN', 'denied', user, { reason: 'deactivated' });
            return res.status(403).json({ error: 'This account has been deactivated. Contact the administrator.' });
        }

        // An admin-issued temporary password stops working after 72 hours. The password was
        // correct, so saying why is not an account-enumeration leak.
        if (user.must_change_password && user.temp_password_expires_at
            && new Date(user.temp_password_expires_at) <= new Date()) {
            auditAuth(req, 'LOGIN', 'denied', user, { reason: 'temporary-password-expired' });
            return res.status(403).json({ error: 'Your temporary password has expired. Ask the administrator to issue a new one.' });
        }

        clearFailures(attemptKey);

        // Transparently upgrade a hash written with weaker parameters.
        if (needsRehash(user.password_hash)) {
            user.password_hash = await hashPassword(password);
        }
        user.last_login_at = new Date();
        await user.save();

        startSession(res, user);
        auditAuth(req, 'LOGIN', 'success', user, user.must_change_password ? { mustChangePassword: true } : undefined);
        return res.json({ user: user.toPublic(), mustChangePassword: Boolean(user.must_change_password) });
    } catch (err) {
        return next(err);
    }
};


// ------------------------------------------------------- password reset ---
//
// A real reset mechanism with fail-closed delivery.
//
//   * The token is 32 random bytes. What is stored is its SHA-256, so a copy
//     of the Users table cannot be used to reset anybody's password.
//   * It expires in 30 minutes and is single-use — consumed on success and
//     replaced whenever a new one is requested.
//   * `requestReset` answers identically whether or not the email exists.
//     "No account with that email" would turn this endpoint into a way to
//     enumerate every registered address, which is the classic mistake here.
//
// DELIVERY: there is no mail server configured. Raw bearer tokens are never
// written to general process logs. The only escape hatch is explicit,
// non-production, loopback-only demo mode:
//
//     LPMS_EXPOSE_RESET_TOKEN=1     # local demos only — never in production
//
// The token itself — generation, hashing, expiry and the constant-time
// comparison — lives in utils/resetToken.js so it can be tested without a
// database. Run it with: node utils/resetToken.test.js

exports.requestReset = async (req, res, next) => {
    try {
        if (isBot(req.body)) return res.json({ ok: true });

        const email = normalizeEmail(req.body?.email);
        const mailReady = mailer.configured();
        const localDemoDelivery = process.env.NODE_ENV !== 'production'
            && process.env.LPMS_EXPOSE_RESET_TOKEN === '1'
            && LOOPBACK_ADDRESSES.has(req.ip || req.socket?.remoteAddress || '');
        if (!localDemoDelivery && !mailReady) {
            return res.json({
                ok: true,
                message: 'Password reset delivery is not configured. Contact the system administrator.'
            });
        }
        // The same answer either way. Do not "helpfully" say the account was
        // not found.
        const sameAnswer = {
            ok: true,
            message: mailReady
                ? 'If that email has an account, a reset link has been sent. It expires in 30 minutes.'
                : 'If that email has an account, a reset link has been created. It expires in 30 minutes.'
        };
        if (!email) return res.json(sameAnswer);

        const user = await User.scope('withSecret').findOne({ where: { email } });
        if (!user || !user.is_active) return res.json(sameAnswer);

        const rawToken = createToken();
        user.reset_token_hash = hashToken(rawToken);
        user.reset_expires_at = expiryFrom(Date.now());
        await user.save();

        if (mailReady) {
            // Not awaited: a missing account answers instantly, so waiting on SMTP here would
            // reveal which emails exist. The token only ever leaves in the email.
            const message = resetEmail({ name: user.name, email: user.email, token: rawToken });
            mailer.send({ to: user.email, ...message })
                .then(sent => auditAuth(req, 'PASSWORD_RESET_REQUESTED', sent.ok ? 'success' : 'failed', user, { delivery: 'email' }));
            return res.json(sameAnswer);
        }

        auditAuth(req, 'PASSWORD_RESET_REQUESTED', 'success', user, { delivery: 'shown-demo' });
        return res.json({ ...sameAnswer, devToken: rawToken });
    } catch (err) {
        return next(err);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const token = String(req.body?.token || '').trim();
        const password = String(req.body?.password ?? '');

        const invalid = { error: 'This reset link is invalid or has expired. Request a new one.' };
        if (!email || !token) return res.status(400).json(invalid);

        const passwordProblem = validatePassword(password);
        if (passwordProblem) return res.status(400).json({ error: passwordProblem });

        const user = await User.scope('withSecret').findOne({ where: { email } });
        // One call, one answer: no account, no outstanding reset, expired, or
        // the wrong token all look identical from out here. verifyReset does
        // the comparison in constant time — a plain === would leak, through
        // timing, how much of a guessed token was right.
        if (!verifyReset(token, user, Date.now())) {
            return res.status(400).json(invalid);
        }

        user.password_hash = await hashPassword(password);
        // Single use: consume the token so the same link cannot be replayed.
        user.reset_token_hash = null;
        user.reset_expires_at = null;
        user.must_change_password = false;
        user.temp_password_expires_at = null;
        user.password_changed_at = new Date();
        await user.save();

        // A password reset is an account-recovery boundary. Remove every old
        // browser session before issuing the new one below so a stolen cookie
        // cannot survive the password change.
        revokeUserSessions(user.user_id ?? user.id);

        // Any lockout from the failed attempts that led here is cleared.
        clearFailuresForEmail(email);

        startSession(res, user);
        auditAuth(req, 'PASSWORD_RESET', 'success', user);
        return res.json({ user: user.toPublic() });
    } catch (err) {
        return next(err);
    }
};

// ------------------------------------------------------ change password ---
//
// The signed-in user changes their own password. Also the forced screen after an admin-issued
// temporary password. Wrong current passwords count toward the same lockout as sign-in.
exports.changePassword = async (req, res, next) => {
    try {
        const currentPassword = String(req.body?.currentPassword ?? '');
        const newPassword = String(req.body?.newPassword ?? '');
        const source = req.ip || req.socket?.remoteAddress || 'unknown';
        const attemptKey = `${source}\u0000${normalizeEmail(req.user.email)}`;

        if (isLockedOut(attemptKey)) {
            return res.status(429).json({ error: 'Too many failed attempts. Wait a few minutes and try again.' });
        }

        const user = await User.scope('withSecret').findByPk(req.user.id);
        if (!user) return res.status(401).json({ error: 'Authentication required.' });

        if (!currentPassword || !(await verifyPassword(currentPassword, user.password_hash))) {
            recordFailure(attemptKey);
            auditAuth(req, 'PASSWORD_CHANGE_FAILED', 'failed', user, { reason: 'wrong-current-password' });
            return res.status(401).json({ error: 'Your current password is incorrect.' });
        }

        const problem = validatePassword(newPassword);
        if (problem) return res.status(400).json({ error: problem });
        if (newPassword === currentPassword) {
            return res.status(400).json({ error: 'The new password must be different from your current password.' });
        }

        user.password_hash = await hashPassword(newPassword);
        user.must_change_password = false;
        user.temp_password_expires_at = null;
        user.password_changed_at = new Date();
        user.reset_token_hash = null;
        user.reset_expires_at = null;
        await user.save();

        // Other browsers signed in as this user are logged out; this one stays.
        revokeOtherUserSessions(user.user_id, req.sessionToken);
        clearFailures(attemptKey);
        await auditAuth(req, 'PASSWORD_CHANGED', 'success', user);
        return res.json({ user: user.toPublic() });
    } catch (err) {
        return next(err);
    }
};

exports.logout = (req, res) => {
    auditAuth(req, 'LOGOUT', 'success', req.user);
    revokeSession(req.sessionToken);
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    });
    return res.json({ ok: true });
};

exports.currentSession = (req, res) => res.json({ user: req.user });

// ------------------------------------------------------------ accounts ---

// The sign-in screen's one-click demo accounts. Never includes hashes — the
// default scope excludes them, and this is a convenience for the demo build.
exports.listAccounts = async (req, res, next) => {
    try {
        const users = await User.findAll({
            where: { is_active: true },
            order: [['user_id', 'ASC']]
        });
        return res.json({ accounts: users.map(u => ({ id: u.user_id, name: u.name, email: u.email, role: u.role })) });
    } catch (err) {
        return next(err);
    }
};

// A cheap way for the client to find out whether server accounts are available
// at all, so it knows whether to fall back to its local store.
exports.health = async (req, res) => {
    try {
        const count = await User.count();
        return res.json({ ok: true, accounts: count });
    } catch {
        return res.status(503).json({ ok: false });
    }
};

exports._internals = {
    validatePassword,
    isBot,
    isLockedOut,
    recordFailure,
    clearFailures,
    LOCKOUT,
    GENERIC_CREDENTIAL_ERROR,
    hashToken,
    verifyReset,
    RESET_TTL_MS,
    REGISTRATION_LIMIT,
    consumeRegistrationAttempt,
    publicRegistrationEnabled,
    localPrivilegedRegistrationEnabled
};
