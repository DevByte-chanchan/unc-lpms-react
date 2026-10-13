/**
 * Mailer — the ONE place the server sends email.
 *
 *   sendMail({ to, subject, text, html, attachments? }) → { status, ... }
 *   mailStatus()                                        → { mode, configured, from }
 *
 * MAIL_MODE picks where mail goes:
 *   capture  Mailpit (http://localhost:8025), whatever SMTP_* says. The default
 *            outside production. Host/port come from MAIL_CAPTURE_HOST /
 *            MAIL_CAPTURE_PORT (docker-compose sets the host to `mailpit`).
 *   live     The real SMTP_* server. Outside production only addresses on
 *            MAIL_DEV_ALLOWLIST are sent; anyone else is skipped.
 *   off      Log and send nothing.
 *
 * sendMail never throws: it resolves to { status: 'captured' | 'sent' |
 * 'skipped' | 'failed', ... } and logs one line per recipient with the local
 * part masked. SMTP_PASS is never logged.
 */
import nodemailer from 'nodemailer';

const MODES = ['capture', 'live', 'off'];

const isProduction = () => process.env.NODE_ENV === 'production';

const currentMode = () => {
  const m = String(process.env.MAIL_MODE || '').trim().toLowerCase();
  if (MODES.includes(m)) return m;
  return isProduction() ? 'live' : 'capture';
};

const fromAddress = () =>
  String(process.env.MAIL_FROM || '').trim() ||
  (process.env.SMTP_USER ? `UNC LPMS <${process.env.SMTP_USER}>` : 'UNC LPMS <no-reply@unc.edu.ph>');

const allowlist = () =>
  String(process.env.MAIL_DEV_ALLOWLIST || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export function mailStatus() {
  const mode = currentMode();
  return {
    mode,
    configured: mode === 'live' ? smtpConfigured() : mode === 'capture',
    from: fromAddress(),
  };
}

/** "kristine.sanlorenzo@unc.edu.ph" → "k***@unc.edu.ph" */
export const maskEmail = (email) => {
  const e = String(email || '');
  const at = e.lastIndexOf('@');
  return at > 0 ? e[0] + '***' + e.slice(at) : '***';
};

function transportFor(mode) {
  const timeouts = { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 };
  if (mode === 'capture') {
    return nodemailer.createTransport({
      host: process.env.MAIL_CAPTURE_HOST || 'localhost',
      port: Number(process.env.MAIL_CAPTURE_PORT || 1025),
      secure: false,
      ignoreTLS: true,
      ...timeouts,
    });
  }
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? String(process.env.SMTP_SECURE).toLowerCase() === 'true' : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    ...timeouts,
  });
}

/** A short reason plus how to fix it, for the common failures. */
export function explainMailError(err, mode) {
  const code = err && err.code;
  if (code === 'EAUTH') {
    return 'Gmail rejected the login — check SMTP_USER and the 16-character app password (2-Step Verification must be on).';
  }
  if (mode === 'capture' && ['ECONNECTION', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ESOCKET'].includes(code)) {
    return `Couldn't reach Mailpit at ${process.env.MAIL_CAPTURE_HOST || 'localhost'}:${process.env.MAIL_CAPTURE_PORT || 1025} — is it running? (docker compose up -d mailpit)`;
  }
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED'].includes(code)) {
    return `Couldn't connect to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 465} — the port may be blocked (try another network) or there's no internet connection.`;
  }
  if (code === 'EDNS' || code === 'ENOTFOUND') {
    return `Couldn't look up ${process.env.SMTP_HOST} — check SMTP_HOST and the network connection.`;
  }
  const message = err && err.message ? String(err.message) : 'Unknown error';
  return process.env.SMTP_PASS ? message.split(process.env.SMTP_PASS).join('***') : message;
}

let testSink = null;
/**
 * Tests only: route every send through `fn(message)` instead of SMTP (and
 * report it as 'captured'). Pass null to restore the real transport. The
 * MAIL_MODE=off and dev-allowlist rules still apply before the sink is reached.
 */
export function setMailSinkForTests(fn) { testSink = typeof fn === 'function' ? fn : null; }

export async function sendMail({ to, subject, text, html, attachments } = {}) {
  const mode = currentMode();
  const recipients = (Array.isArray(to) ? to : [to]).map((s) => String(s || '').trim()).filter(Boolean);
  const log = (list, outcome) => list.forEach((r) => console.log(`[mail] → ${maskEmail(r)} (${outcome})`));

  if (!recipients.length) return { status: 'failed', reason: 'No recipient.' };

  if (mode === 'off') {
    log(recipients, 'skipped: MAIL_MODE=off');
    return { status: 'skipped', reason: 'MAIL_MODE=off', skipped: recipients };
  }

  let allowed = recipients;
  let skipped = [];
  if (mode === 'live' && !isProduction()) {
    const ok = allowlist();
    allowed = recipients.filter((r) => ok.includes(r.toLowerCase()));
    skipped = recipients.filter((r) => !ok.includes(r.toLowerCase()));
    log(skipped, 'skipped: not on MAIL_DEV_ALLOWLIST');
  }
  if (!allowed.length) return { status: 'skipped', reason: 'Not on MAIL_DEV_ALLOWLIST.', skipped };

  if (mode === 'live' && !smtpConfigured()) {
    const reason = 'MAIL_MODE=live but SMTP_HOST, SMTP_USER or SMTP_PASS is empty.';
    log(allowed, 'failed: ' + reason);
    return { status: 'failed', reason, skipped };
  }

  try {
    const message = { from: fromAddress(), to: allowed, subject, text, html, attachments };
    // Tests: an in-process sink instead of SMTP, so a suite can count the
    // messages it caused without a Mailpit. Never installed outside tests.
    const info = testSink ? await testSink(message) || { messageId: 'test-' + Date.now() } : await transportFor(mode).sendMail(message);
    const status = mode === 'capture' || testSink ? 'captured' : 'sent';
    log(allowed, status);
    return { status, messageId: info.messageId, skipped };
  } catch (err) {
    const reason = explainMailError(err, mode);
    log(allowed, 'failed: ' + reason);
    return { status: 'failed', reason, code: err && err.code, skipped };
  }
}
