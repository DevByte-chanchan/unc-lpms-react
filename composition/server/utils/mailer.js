'use strict';

// Outgoing mail for credentials and password-reset links.
//
// SMTP comes from the environment (LPMS_SMTP_HOST, LPMS_SMTP_PORT, LPMS_SMTP_USER,
// LPMS_SMTP_PASS, LPMS_SMTP_FROM). Host and from are required; user/pass are optional (some
// relays are open). With no SMTP configured, `configured()` is false and callers fall back to
// showing the secret once to the superuser. Mail failures never throw out of `send`.
//
// Never log message bodies: they contain passwords and reset tokens.

const smtpConfig = (env) => {
    const host = String(env.LPMS_SMTP_HOST || '').trim();
    const from = String(env.LPMS_SMTP_FROM || '').trim();
    if (!host || !from) return null;
    const port = Number(env.LPMS_SMTP_PORT) || 587;
    return {
        host,
        port,
        secure: port === 465,
        auth: env.LPMS_SMTP_USER ? { user: env.LPMS_SMTP_USER, pass: env.LPMS_SMTP_PASS || '' } : undefined,
        from
    };
};

const createMailer = ({ getEnv = () => process.env, createTransport } = {}) => {
    let injected = null;
    const transportFor = (config) => {
        if (injected) return injected;
        const factory = createTransport || require('nodemailer').createTransport;
        return factory({ host: config.host, port: config.port, secure: config.secure, auth: config.auth });
    };

    return {
        configured: () => smtpConfig(getEnv()) !== null,
        // Resolves { ok: true } or { ok: false, error }. Never rejects.
        async send({ to, subject, text }) {
            const config = smtpConfig(getEnv());
            if (!config) return { ok: false, error: 'SMTP is not configured.' };
            try {
                await transportFor(config).sendMail({ from: config.from, to, subject, text });
                return { ok: true };
            } catch (error) {
                return { ok: false, error: error.message };
            }
        },
        _setTransport(transport) { injected = transport; }
    };
};

const appUrl = (env = process.env) => String(env.LPMS_APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

const credentialsEmail = ({ name, email, password, expiresAt }) => ({
    subject: 'Your LPMS account',
    text: [
        `Hello ${name},`,
        '',
        'An account has been created for you on the UNC Learning Plan Management System.',
        '',
        `Sign in at: ${appUrl()}`,
        `Email: ${email}`,
        `Temporary password: ${password}`,
        '',
        `You must change this password when you first sign in. It stops working on ${expiresAt.toUTCString()}.`
    ].join('\n')
});

const resetEmail = ({ name, email, token }) => ({
    subject: 'Reset your LPMS password',
    text: [
        `Hello ${name},`,
        '',
        'Use this link to choose a new password. It expires in 30 minutes and works once:',
        `${appUrl()}/?reset=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
        '',
        'If you did not ask for this, ignore this message.'
    ].join('\n')
});

const mailer = createMailer();

module.exports = { createMailer, smtpConfig, credentialsEmail, resetEmail, mailer };
