/**
 * Password reset links ("Forgot password?" and the VPAA's "Send password reset").
 *
 *   sendPasswordReset(account, { ip })  new 1-hour link, emailed now
 *   findLiveReset(token)                for the reset page
 *
 * At most MAX_PER_HOUR links per account per hour; past that, nothing is sent
 * (the forgot-password response doesn't say so — it never reveals anything).
 */
import { Op } from 'sequelize';
import db from '../models/index.js';
import { sendMail } from './mailer.js';
import { passwordResetEmail } from '../templates/passwordResetEmail.js';
import { appBaseUrl } from './invitations.js';
import { newToken, hashToken, looksLikeToken } from '../utils/tokens.js';

const { PasswordReset, UserAccount } = db;

export const RESET_TTL_MS = 60 * 60 * 1000;
export const MAX_PER_HOUR = 3;

/** { status: 'sent'|'captured'|'skipped'|'failed'|'limited', reason? } */
export async function sendPasswordReset(account, { ip = null } = {}) {
  const recent = await PasswordReset.count({
    where: { user_account_id: account.id, createdAt: { [Op.gt]: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_PER_HOUR) {
    return { status: 'limited', reason: `At most ${MAX_PER_HOUR} reset emails an hour. Try again later.` };
  }

  const token = newToken();
  const row = await PasswordReset.create({
    user_account_id: account.id,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + RESET_TTL_MS),
    requested_ip: ip ? String(ip).slice(0, 64) : null,
  });

  const mail = passwordResetEmail({
    name: account.display_name,
    link: appBaseUrl() + '/reset-password?token=' + encodeURIComponent(token),
  });
  const result = await sendMail({ ...mail, to: account.email });
  // A link that never left can't be used: retire it.
  if (result.status !== 'sent' && result.status !== 'captured') await row.update({ used_at: new Date() });
  return result;
}

/** The live reset behind a link token (unused, unexpired, account Active), or null. */
export async function findLiveReset(token) {
  if (!looksLikeToken(token)) return null;
  const reset = await PasswordReset.findOne({
    where: { token_hash: hashToken(token), used_at: null, expires_at: { [Op.gt]: new Date() } },
  });
  if (!reset) return null;
  const account = await UserAccount.findByPk(reset.user_account_id);
  if (!account || account.status !== 'Active') return null;
  return { reset, account };
}
