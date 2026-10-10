/**
 * The account invitation email: "you've been given access, set your password".
 *
 *   invitationEmail({ name, roles, link, sender?, expiresInDays?, note? })
 *     → { subject, text, html, attachments }
 *
 * `roles` is a list of display strings, e.g. ['Program Head (BSIT)', 'Instructor'].
 * `sender` is whoever's upload (or resend) gave the access — { name, title },
 * e.g. { name: 'Edrian Lait', title: 'Dean, School of Computer & Information
 * Sciences' } — and signs the email. Null signs it as the system.
 * `note` is an optional line under the card (the test command marks tests).
 */
import { renderEmail, esc, LOGO_ATTACHMENT, SYSTEM_SIGNATURE } from './emailLayout.js';

export function invitationEmail({ name, roles = [], link, sender = null, expiresInDays = 7, note } = {}) {
  const roleList = roles.join(', ');
  const subject = 'Your UNC Learning Plan Management System account';
  const expiry = `This link can be used once and expires in ${expiresInDays} days.`;
  const who = sender && sender.name ? sender : null;
  const lead = who ? `${who.name} has given you access` : "You've been given access";
  const signature = who ? ['— ' + who.name, ...(who.title ? [who.title] : [])] : [SYSTEM_SIGNATURE];

  const text = [
    `Hi ${name},`,
    '',
    `${lead} to the UNC Learning Plan Management System (LPMS) as: ${roleList}.`,
    '',
    `Set your password: ${link}`,
    '',
    expiry,
    '',
    ...signature,
    ...(note ? ['', '--', note] : []),
  ].join('\n');

  const html = renderEmail({
    title: subject,
    greeting: `Hi ${name},`,
    introHtml: `${esc(lead)} to the UNC Learning Plan Management System (LPMS) as: <strong style="color:#18191A;">${esc(roleList)}</strong>.`,
    buttonLabel: 'Set your password',
    link,
    smallPrint: [expiry],
    signature,
    note,
  });

  return { subject, text, html, attachments: [{ ...LOGO_ATTACHMENT }] };
}
