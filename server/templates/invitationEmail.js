/**
 * The account invitation email: "you've been given access, set your password".
 *
 *   invitationEmail({ name, roles, courses?, deadlines?, link, sender?, expiresInDays?, note? })
 *     → { subject, text, html, attachments }
 *
 * `roles` is a list of display strings, e.g. ['Program Head (BSIT)', 'Instructor'].
 * `courses` is { lead: [code], contributor: [code], consultant: [code] } — the
 * person's courses right now; empty lists are left out. `deadlines` is
 * { midterm, finals } (YYYY-MM-DD or null); an unset deadline is left out.
 * `sender` is whoever's upload (or resend) gave the access — { name, title },
 * e.g. { name: 'Edrian Lait', title: 'Dean, School of Computer & Information
 * Sciences' } — and signs the email. Null signs it as the system.
 * `note` is an optional line under the card (the test command marks tests).
 */
import { renderEmail, esc, LOGO_ATTACHMENT, SYSTEM_SIGNATURE } from './emailLayout.js';

export function formatDeadline(value) {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** The "You lead: …" lines, as [{ label, value }] — only the non-empty ones. */
export function courseLines(courses = {}, deadlines = {}) {
  const lines = [];
  const list = (codes) => (Array.isArray(codes) ? codes.filter(Boolean) : []);
  if (list(courses.lead).length) lines.push({ label: 'You lead', value: list(courses.lead).join(', ') });
  if (list(courses.contributor).length) lines.push({ label: 'You contribute to', value: list(courses.contributor).join(', ') });
  if (list(courses.consultant).length) lines.push({ label: 'You consult on', value: list(courses.consultant).join(', ') });
  const dl = deadlineLine(deadlines);
  if (dl) lines.push({ label: null, value: dl });
  return lines;
}

/** "Midterm deadline: 15 Dec 2026 · Finals deadline: 30 Apr 2027", or null. */
export function deadlineLine(deadlines = {}) {
  const parts = [];
  if (deadlines && deadlines.midterm) parts.push('Midterm deadline: ' + formatDeadline(deadlines.midterm));
  if (deadlines && deadlines.finals) parts.push('Finals deadline: ' + formatDeadline(deadlines.finals));
  return parts.length ? parts.join(' · ') : null;
}

export function invitationEmail({ name, roles = [], courses = null, deadlines = null, link, sender = null, expiresInDays = 7, note } = {}) {
  const roleList = roles.join(', ');
  const subject = 'Your UNC Learning Plan Management System account';
  const expiry = `This link can be used once and expires in ${expiresInDays} days.`;
  const who = sender && sender.name ? sender : null;
  const lead = who ? `${who.name} has given you access` : "You've been given access";
  const signature = who ? ['— ' + who.name, ...(who.title ? [who.title] : [])] : [SYSTEM_SIGNATURE];
  const lines = courseLines(courses || {}, deadlines || {});

  const text = [
    `Hi ${name},`,
    '',
    `${lead} to the UNC Learning Plan Management System (LPMS) as: ${roleList}.`,
    ...(lines.length ? ['', ...lines.map((l) => (l.label ? `${l.label}: ${l.value}` : l.value))] : []),
    '',
    `Set your password: ${link}`,
    '',
    expiry,
    '',
    ...signature,
    ...(note ? ['', '--', note] : []),
  ].join('\n');

  const linesHtml = lines.length
    ? '<br><br>' + lines.map((l) => (l.label
      ? `${esc(l.label)}: <strong style="color:#18191A;">${esc(l.value)}</strong>`
      : `<span style="color:#6B7280;">${esc(l.value)}</span>`)).join('<br>')
    : '';

  const html = renderEmail({
    title: subject,
    greeting: `Hi ${name},`,
    introHtml: `${esc(lead)} to the UNC Learning Plan Management System (LPMS) as: <strong style="color:#18191A;">${esc(roleList)}</strong>.${linesHtml}`,
    buttonLabel: 'Set your password',
    link,
    smallPrint: [expiry],
    signature,
    note,
  });

  return { subject, text, html, attachments: [{ ...LOGO_ATTACHMENT }] };
}
