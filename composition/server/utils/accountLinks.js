'use strict';

// The e-mailed account links of feature/course-assignment:
//   invitations  "set your password" for a new (or not yet activated) account; 7 days; a newer one cancels older
//   resets       "forgot password" / "send password reset"; 1 hour; at most 3 an hour per account
// Only the SHA-256 of a token is stored. Every link is single use, and using one retires the account's others.
//
// Delivery: by e-mail when SMTP is set up. Without it the link cannot be e-mailed; for an administrator's action
// the link is returned once so they can hand it over (like the temporary password in userController.js), and
// the public "forgot password" form says delivery is not configured.

const { Op } = require('sequelize');
const { createToken, hashToken } = require('./resetToken');
const { mailer, invitationEmail, resetLinkEmail, appUrl } = require('./mailer');

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const MAX_RESETS_PER_HOUR = 3;

const models = () => require('../models');
const looksLikeToken = (token) => typeof token === 'string' && /^[0-9a-f]{64}$/i.test(token);
const invitationLink = (token) => `${appUrl()}/set-password?token=${encodeURIComponent(token)}`;
const resetLink = (token) => `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;

// Sends `message`; { delivered: true } or { delivered: false, reason }.
const deliver = async (to, message) => {
    if (!mailer.configured()) return { delivered: false, reason: 'E-mail (SMTP) is not configured on this server.' };
    const sent = await mailer.send({ to, ...message });
    return sent.ok ? { delivered: true } : { delivered: false, reason: sent.error || 'The e-mail could not be sent.' };
};

// ---------------------------------------------------------------- invitations

// A new invitation for `user` (cancelling the earlier unaccepted ones), e-mailed now.
// Returns { delivered, reason?, link? (only when not e-mailed, for the administrator), invitation }.
const sendInvitation = async (user, { senderId = null, roleLabels = [] } = {}) => {
    const { AccountInvitation } = models();
    await AccountInvitation.update(
        { status: 'cancelled', token_hash: null },
        { where: { user_id: user.user_id, status: { [Op.in]: ['sent', 'failed'] } } }
    );
    const token = createToken();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const invitation = await AccountInvitation.create({
        user_id: user.user_id,
        email: user.email,
        sent_by_user_id: senderId,
        status: 'sent',
        sent_at: new Date(),
        token_hash: hashToken(token),
        expires_at: expiresAt
    });
    const result = await deliver(user.email, invitationEmail({ name: user.name, roles: roleLabels, token, expiresAt }));
    if (!result.delivered) {
        await invitation.update({ last_error: String(result.reason).slice(0, 255) });
        return { ...result, link: invitationLink(token), invitation };
    }
    return { ...result, invitation };
};

// The live invitation behind a link token (sent, unexpired, account active), or null.
const findLiveInvitation = async (token) => {
    if (!looksLikeToken(token)) return null;
    const { AccountInvitation, User } = models();
    const invitation = await AccountInvitation.findOne({
        where: { token_hash: hashToken(token), status: 'sent', expires_at: { [Op.gt]: new Date() } }
    });
    if (!invitation) return null;
    const user = await User.findByPk(invitation.user_id);
    if (!user || !user.is_active) return null;
    return { invitation, user };
};

// Claims the invitation (so the same link cannot be used twice) and retires the account's other ones.
const acceptInvitation = async (invitation) => {
    const { AccountInvitation } = models();
    const [claimed] = await AccountInvitation.update(
        { status: 'accepted', accepted_at: new Date(), token_hash: null },
        { where: { account_invitation_id: invitation.account_invitation_id, status: 'sent' } }
    );
    if (!claimed) return false;
    await AccountInvitation.update(
        { status: 'cancelled', token_hash: null },
        { where: { user_id: invitation.user_id, status: { [Op.in]: ['sent', 'failed'] } } }
    );
    return true;
};

// The latest invitation of each account: { [userId]: { status, sentAt, expiresAt, acceptedAt } }.
const invitationSummaries = async (userIds) => {
    const { AccountInvitation } = models();
    if (!userIds.length) return {};
    const rows = await AccountInvitation.findAll({
        where: { user_id: { [Op.in]: userIds } },
        order: [['account_invitation_id', 'ASC']]
    });
    const latest = {};
    for (const row of rows) {
        latest[row.user_id] = {
            status: row.status === 'sent' && row.expires_at && new Date(row.expires_at) <= new Date() ? 'expired' : row.status,
            sentAt: row.sent_at,
            expiresAt: row.expires_at,
            acceptedAt: row.accepted_at,
            lastError: row.last_error
        };
    }
    return latest;
};

// "Send me a new link" from a dead invitation link: only for an active account still waiting to set its password
// (it has an invitation that was never accepted). The caller answers the same way whatever happens.
const requestInvitation = async (email) => {
    const { AccountInvitation, User } = models();
    if (!email || !mailer.configured()) return null;
    const user = await User.findOne({ where: { email } });
    if (!user || !user.is_active || !user.must_change_password) return null;
    const waiting = await AccountInvitation.count({ where: { user_id: user.user_id, status: { [Op.ne]: 'accepted' } } });
    if (!waiting) return null;
    return sendInvitation(user, {});
};

// ------------------------------------------------------------------- resets

// A new one-hour reset link for `user`, e-mailed now. { limited: true } past MAX_RESETS_PER_HOUR.
// Returns { delivered, reason?, token? (only when not e-mailed, for the caller to hand over) }.
const sendPasswordReset = async (user, { ip = null } = {}) => {
    const { PasswordReset } = models();
    const recent = await PasswordReset.count({
        where: { user_id: user.user_id, createdAt: { [Op.gt]: new Date(Date.now() - 60 * 60 * 1000) } }
    });
    if (recent >= MAX_RESETS_PER_HOUR) {
        return { limited: true, delivered: false, reason: `At most ${MAX_RESETS_PER_HOUR} reset e-mails an hour. Try again later.` };
    }
    const token = createToken();
    const row = await PasswordReset.create({
        user_id: user.user_id,
        token_hash: hashToken(token),
        expires_at: new Date(Date.now() + RESET_TTL_MS),
        requested_ip: ip ? String(ip).slice(0, 64) : null
    });
    const result = await deliver(user.email, resetLinkEmail({ name: user.name, token }));
    if (!result.delivered) return { ...result, token, link: resetLink(token), row };
    return { ...result, row };
};

// The live reset behind a link token (unused, unexpired, account active), or null.
const findLiveReset = async (token) => {
    if (!looksLikeToken(token)) return null;
    const { PasswordReset, User } = models();
    const reset = await PasswordReset.findOne({
        where: { token_hash: hashToken(token), used_at: null, expires_at: { [Op.gt]: new Date() } }
    });
    if (!reset) return null;
    const user = await User.findByPk(reset.user_id);
    if (!user || !user.is_active) return null;
    return { reset, user };
};

// Uses the link (once) and retires the account's other outstanding links.
const useReset = async (reset) => {
    const { PasswordReset } = models();
    const [claimed] = await PasswordReset.update(
        { used_at: new Date() },
        { where: { password_reset_id: reset.password_reset_id, used_at: null } }
    );
    if (!claimed) return false;
    await PasswordReset.update({ used_at: new Date() }, { where: { user_id: reset.user_id, used_at: null } });
    return true;
};

module.exports = {
    INVITATION_TTL_MS, RESET_TTL_MS, MAX_RESETS_PER_HOUR,
    sendInvitation, findLiveInvitation, acceptInvitation, invitationSummaries, requestInvitation,
    sendPasswordReset, findLiveReset, useReset, looksLikeToken
};
