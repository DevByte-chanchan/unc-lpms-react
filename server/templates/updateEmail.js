/**
 * The update email — for someone who already has a password: what changed
 * for them this term (roles, courses, consulting), the deadlines, and a
 * "Sign in" button. No token.
 *
 *   updateEmail({
 *     name, termLabel,
 *     rolesAdded: ['Program Head (BSIT)'], rolesRemoved: ['Program Head'],
 *     lead: [{ code, name }], contributor: [{ code, name }],
 *     consultant: [{ code, name }], consultantRemoved: [code], removed: [code],
 *     deadlineReminders: [{ label: 'Midterm', days: 7, date }],   (the daily deadline notice)
 *     deadlines: { midterm, finals }, link, sender, note?
 *   }) → { subject, text, html, attachments }
 *
 * Only the non-empty lines appear. `sender` ({ name, title }) signs it; null
 * signs it as the system.
 */
import { renderEmail, esc, LOGO_ATTACHMENT, SYSTEM_SIGNATURE } from './emailLayout.js';
import { deadlineLine, formatDeadline } from './invitationEmail.js';

const course = (c) => (c && typeof c === 'object' ? (c.name ? `${c.code} — ${c.name}` : c.code) : String(c));
const join = (list, f = course) => (Array.isArray(list) ? list : []).map(f).join(', ');
const has = (list) => Array.isArray(list) && list.length > 0;

export function updateEmail({
  name, termLabel = '', rolesAdded = [], rolesRemoved = [], lead = [], contributor = [],
  consultant = [], consultantRemoved = [], removed = [], deadlineReminders = [], deadlines = null,
  link, sender = null, note,
} = {}) {
  const who = sender && sender.name ? sender : null;
  const by = who ? `${who.name} has` : "You've been";
  const courseChange = has(lead) || has(contributor) || has(consultant) || has(consultantRemoved) || has(removed);
  const subject = has(deadlineReminders) && !courseChange && !has(rolesAdded) && !has(rolesRemoved)
    ? `LPMS deadline reminder${termLabel ? ' — ' + termLabel : ''}`
    : courseChange
      ? `Your LPMS courses${termLabel ? ' for ' + termLabel : ''}`
      : 'Your LPMS access has changed';

  // [{ text, html }] — the same line twice, once plain and once marked up.
  const lines = [];
  const add = (text, html) => lines.push({ text, html });
  const strong = (s) => `<strong style="color:#18191A;">${esc(s)}</strong>`;

  for (const role of rolesAdded) {
    add(`${who ? who.name + ' has given you' : "You've been given"} the ${role} role.`,
      `${esc(who ? who.name + ' has given you' : "You've been given")} the ${strong(role)} role.`);
  }
  for (const role of rolesRemoved) {
    add(`You no longer have the ${role} role.`, `You no longer have the ${strong(role)} role.`);
  }
  if (has(lead)) add(`${by} assigned you as Lead Faculty for: ${join(lead)}.`, `${esc(by)} assigned you as ${strong('Lead Faculty')} for: ${esc(join(lead))}.`);
  if (has(contributor)) add(`${by} added you as a Contributor to: ${join(contributor)}.`, `${esc(by)} added you as a ${strong('Contributor')} to: ${esc(join(contributor))}.`);
  if (has(consultant)) add(`You're now the Industry Consultant for: ${join(consultant)}.`, `You're now the ${strong('Industry Consultant')} for: ${esc(join(consultant))}.`);
  if (has(consultantRemoved)) add(`You're no longer the consultant for: ${join(consultantRemoved)}.`, `You're no longer the consultant for: ${esc(join(consultantRemoved))}.`);
  if (has(removed)) add(`You've been removed from: ${join(removed)}.`, `You've been removed from: ${esc(join(removed))}.`);
  for (const r of deadlineReminders) {
    const t = `${r.label} deadline in ${r.days} ${r.days === 1 ? 'day' : 'days'}${r.date ? ' (' + formatDeadline(r.date) + ')' : ''}.`;
    add(t, esc(t));
  }
  const dl = deadlineLine(deadlines || {});
  if (dl) add(dl, `<span style="color:#6B7280;">${esc(dl)}</span>`);

  const signature = who ? ['— ' + who.name, ...(who.title ? [who.title] : [])] : [SYSTEM_SIGNATURE];
  const intro = termLabel ? `Here's what changed for you in LPMS for ${termLabel}:` : "Here's what changed for you in LPMS:";

  const text = [
    `Hi ${name},`,
    '',
    intro,
    '',
    ...lines.map((l) => '- ' + l.text),
    '',
    `Sign in: ${link}`,
    '',
    ...signature,
    ...(note ? ['', '--', note] : []),
  ].join('\n');

  const html = renderEmail({
    title: subject,
    greeting: `Hi ${name},`,
    introHtml: `${esc(intro)}<br><br>${lines.map((l) => l.html).join('<br>')}`,
    buttonLabel: 'Sign in',
    link,
    signature,
    note,
  });

  return { subject, text, html, attachments: [{ ...LOGO_ATTACHMENT }] };
}
