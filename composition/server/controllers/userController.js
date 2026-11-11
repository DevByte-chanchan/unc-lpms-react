'use strict';

// The credential helpers of the User Accounts API (controllers/userAccountController.js): a temporary password,
// handing it over (emailed, or shown once), and the audit entries. The superuser's older /api/users routes that
// lived here were removed: no page used them, and they could overwrite an account's several roles with one.

const { Op } = require('sequelize');
const { User } = require('../models');
const { hashPassword } = require('../utils/password');
const { generatePassword } = require('../utils/generatedPassword');
const { record: audit } = require('../utils/audit');
const { mailer, credentialsEmail } = require('../utils/mailer');

const TEMP_PASSWORD_TTL_MS = 72 * 60 * 60 * 1000;

const auditChange = (req, action, target, details) => audit({
    actor: req.user, action, entityType: 'users', entityId: target.user_id,
    details: { target_user_id: target.user_id, ...details }, ip: req.ip
});

const activeSuperuserCountExcluding = (userId) => User.count({
    where: { role: 'superuser', is_active: true, user_id: { [Op.ne]: userId } }
});

// Generates a temporary password. Returns the hashed fields to store plus the plain password,
// which exists only in memory: it is either emailed or shown once, never stored or logged.
const newTemporaryCredential = async () => {
    const password = generatePassword();
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_MS);
    return {
        password,
        expiresAt,
        fields: {
            password_hash: await hashPassword(password),
            must_change_password: true,
            temp_password_expires_at: expiresAt,
            // A new password (even a temporary one) voids the account's signed-in sessions (utils/jwtSession.js).
            password_changed_at: new Date(),
            reset_token_hash: null,
            reset_expires_at: null
        }
    };
};

// Hands the temporary password over: emailed when SMTP is configured, otherwise (or if the
// email fails) returned once so the superuser can pass it on. Audited without the password.
const deliverCredentials = async (req, target, credential) => {
    await auditChange(req, 'TEMP_PASSWORD_ISSUED', target, { expires_at: credential.expiresAt.toISOString() });
    const expiresAt = credential.expiresAt.toISOString();
    if (mailer.configured()) {
        const message = credentialsEmail({ name: target.name, email: target.email, password: credential.password, expiresAt: credential.expiresAt });
        const sent = await mailer.send({ to: target.email, ...message });
        if (sent.ok) {
            await auditChange(req, 'CREDENTIALS_SENT', target, { delivery: 'email' });
            return { delivery: 'emailed', expiresAt };
        }
        await auditChange(req, 'CREDENTIALS_SHOWN', target, { reason: 'email-failed' });
        return { delivery: 'shown', temporaryPassword: credential.password, expiresAt, mailError: 'The email could not be sent.' };
    }
    await auditChange(req, 'CREDENTIALS_SHOWN', target, { reason: 'smtp-not-configured' });
    return { delivery: 'shown', temporaryPassword: credential.password, expiresAt };
};

module.exports.helpers = { newTemporaryCredential, deliverCredentials, auditChange, activeSuperuserCountExcluding, TEMP_PASSWORD_TTL_MS };
