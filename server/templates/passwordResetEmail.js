/**
 * The "reset your password" email. No personal signature: it's signed by the
 * system, whoever asked for it.
 *
 *   passwordResetEmail({ name, link }) → { subject, text, html, attachments }
 */
import { renderEmail, LOGO_ATTACHMENT, SYSTEM_SIGNATURE } from './emailLayout.js';

export function passwordResetEmail({ name, link } = {}) {
  const subject = 'Reset your LPMS password';
  const intro = 'We received a request to reset the password for your UNC Learning Plan Management System (LPMS) account.';
  const expiry = 'This link can be used once and expires in 1 hour.';
  const ignore = "If you didn't ask for this, ignore this email — your password hasn't changed.";

  const text = [
    `Hi ${name},`,
    '',
    intro,
    '',
    `Choose a new password: ${link}`,
    '',
    expiry,
    ignore,
    '',
    SYSTEM_SIGNATURE,
  ].join('\n');

  const html = renderEmail({
    title: subject,
    greeting: `Hi ${name},`,
    introHtml: intro,
    buttonLabel: 'Choose a new password',
    link,
    smallPrint: [expiry, ignore],
    signature: [SYSTEM_SIGNATURE],
  });

  return { subject, text, html, attachments: [{ ...LOGO_ATTACHMENT }] };
}
