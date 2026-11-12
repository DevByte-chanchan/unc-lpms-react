/**
 * The exam-date reminder: one email per person listing every course they lead.
 *
 *   deadlineReminderEmail({
 *     name, termLabel, examLabel: 'midterm exam', dueText: 'Oct 5, 2026',
 *     daysLeft: 7, courses: [{ code, name }], link,
 *   }) → { subject, text, html, attachments }
 *
 * Signed by the system (no one clicked anything).
 */
import { renderEmail, esc, LOGO_ATTACHMENT, SYSTEM_SIGNATURE } from './emailLayout.js';

const course = (c) => (c.name ? `${c.code} — ${c.name}` : c.code);

export function deadlineReminderEmail({ name, termLabel = '', examLabel, dueText, daysLeft, courses = [], link }) {
  const when = daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
  const subject = `Reminder: Learning Plan / TOS before the ${examLabel} (${dueText})`;
  const intro = `The ${examLabel}${termLabel ? ' for ' + termLabel : ''} is ${when}, on ${dueText}. `
    + `Please submit your Learning Plan / TOS before then for ${courses.length === 1 ? 'the course' : 'these courses'} you lead:`;

  const text = [
    `Hi ${name},`,
    '',
    intro,
    '',
    ...courses.map((c) => '- ' + course(c)),
    '',
    `Sign in: ${link}`,
    '',
    SYSTEM_SIGNATURE,
  ].join('\n');

  const html = renderEmail({
    title: subject,
    greeting: `Hi ${name},`,
    introHtml: `${esc(intro)}<br><br>${courses.map((c) => '• ' + esc(course(c))).join('<br>')}`,
    buttonLabel: 'Sign in',
    link,
    signature: [SYSTEM_SIGNATURE],
  });

  return { subject, text, html, attachments: [{ ...LOGO_ATTACHMENT }] };
}
