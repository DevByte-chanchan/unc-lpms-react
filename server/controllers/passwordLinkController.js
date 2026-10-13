/**
 * The public password-link endpoints (no session needed; rate-limited in
 * routes/auth.js):
 *
 *   GET  /api/auth/invitation?token=        who the invitation is for
 *   POST /api/auth/accept-invitation        { token, password }
 *   POST /api/auth/forgot-password          { email }
 *   POST /api/auth/reset-password           { token, password }
 *   POST /api/auth/request-invitation       { email }   a new link from a dead invitation link
 *
 * Accepting an invitation or resetting a password signs in THAT account,
 * replacing whatever session the browser had: one person's link is never
 * applied to another person's session.
 */
import db from '../models/index.js';
import { issueSession } from '../utils/session.js';
import { isAllowedEmail, isAllowedEmailForRoles, normalizeEmail } from '../utils/roles.js';
import { hashPassword, passwordProblems, presentUser, resolveLinks } from './authController.js';
import { findLiveInvitation, requestInvitation } from '../services/invitations.js';
import { sendPasswordReset, findLiveReset } from '../services/passwordResets.js';

const { AccountInvitation, PasswordReset, UserAccount } = db;

// Superseding means an older link stops working; the page offers a new one.
export const LINK_GONE = 'This link has been replaced by a newer one or has expired. Check your inbox for the latest email from LPMS, or get a new link.';
export const FORGOT_REPLY = 'If that email is registered, we sent a reset link.';
export const REQUEST_REPLY = "If that address has an LPMS account waiting to be set up, we've sent a new link.";

const gone = (res) => res.status(410).json({ message: LINK_GONE });

async function setOwnPassword(account, password) {
  const withHash = await UserAccount.scope('withHash').findByPk(account.id);
  withHash.password_hash = await hashPassword(password);
  withHash.must_change_password = false;
  withHash.failed_attempts = 0;
  withHash.locked_until = null;
  await withHash.save({ fields: ['password_hash', 'must_change_password', 'failed_attempts', 'locked_until'] });
  return withHash;
}

async function signInAs(res, account, periodId) {
  issueSession(res, account);
  const links = await resolveLinks(account, periodId);
  return res.json({ user: presentUser(account, links) });
}

export async function getInvitation(req, res, next) {
  try {
    const live = await findLiveInvitation(req.query.token);
    if (!live) return gone(res);
    const { account } = live;
    return res.json({ display_name: account.display_name, email: account.email, roles: [...(account.roles || [])] });
  } catch (err) {
    return next(err);
  }
}

export async function acceptInvitation(req, res, next) {
  try {
    const { token, password } = req.body || {};
    const live = await findLiveInvitation(token);
    if (!live) return gone(res);
    const { invitation, account } = live;

    const problems = passwordProblems(password, { email: account.email });
    if (problems.length) return res.status(400).json({ message: problems[0], field: 'password' });

    // Claim the invitation first, so the same link can't be accepted twice
    // by two requests racing each other.
    const [claimed] = await AccountInvitation.update(
      { status: 'accepted', accepted_at: new Date(), token_hash: null },
      { where: { id: invitation.id, status: 'sent' } },
    );
    if (!claimed) return gone(res);

    const updated = await setOwnPassword(account, password);
    await AccountInvitation.update(
      { status: 'cancelled', token_hash: null, hold_reason: 'The account was activated from another invitation.' },
      { where: { user_account_id: account.id, status: ['waiting', 'held', 'scheduled', 'sent', 'failed'] } },
    );
    return signInAs(res, updated, req.body && req.body.period_id);
  } catch (err) {
    return next(err);
  }
}

// Forgot password / new link: a UNC address always; an outside address only
// when the switch is on and the account is an Industry-Consultant-only one.
async function accountForPublicEmail(email) {
  if (!email) return null;
  if (!isAllowedEmail(email) && !isAllowedEmailForRoles(email, ['Industry Consultant'])) return null;
  const account = await UserAccount.findOne({ where: { email } });
  if (!account || account.status !== 'Active') return null;
  if (!isAllowedEmailForRoles(email, account.roles || [])) return null;
  return account;
}

export async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body && req.body.email);
    // Answer first, the same way for everyone; the email (if any) goes out
    // after, so neither the reply nor its timing says whether it exists.
    res.json({ message: FORGOT_REPLY });
    const account = await accountForPublicEmail(email);
    if (!account) return undefined;
    sendPasswordReset(account, { ip: req.ip }).catch((err) => console.error('[reset] send failed:', err.message));
    return undefined;
  } catch (err) {
    if (!res.headersSent) return next(err);
    console.error('[reset] forgot-password failed after replying:', err.message);
    return undefined;
  }
}

/**
 * "Send me a new link". The reply never says whether the address has an
 * account; a fresh invitation goes out only to an Active account that is
 * still waiting to set its password (services/invitations.js).
 */
export async function requestInvitationLink(req, res, next) {
  try {
    const email = normalizeEmail(req.body && req.body.email);
    res.json({ message: REQUEST_REPLY });
    requestInvitation(email).catch((err) => console.error('[invitations] request failed:', err.message));
    return undefined;
  } catch (err) {
    if (!res.headersSent) return next(err);
    console.error('[invitations] request-invitation failed after replying:', err.message);
    return undefined;
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};
    const live = await findLiveReset(token);
    if (!live) return gone(res);
    const { reset, account } = live;

    const problems = passwordProblems(password, { email: account.email });
    if (problems.length) return res.status(400).json({ message: problems[0], field: 'password' });

    const [claimed] = await PasswordReset.update({ used_at: new Date() }, { where: { id: reset.id, used_at: null } });
    if (!claimed) return gone(res);
    // Every other outstanding link for the account dies with this one.
    await PasswordReset.update({ used_at: new Date() }, { where: { user_account_id: account.id, used_at: null } });

    const updated = await setOwnPassword(account, password);
    return signInAs(res, updated, req.body && req.body.period_id);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/auth/reset-password?token= — who the reset is for (the page's "signed in as someone else" check). */
export async function getReset(req, res, next) {
  try {
    const live = await findLiveReset(req.query.token);
    if (!live) return gone(res);
    return res.json({ display_name: live.account.display_name, email: live.account.email });
  } catch (err) {
    return next(err);
  }
}
