/**
 * People's names → UNC emails, and "is this the same person?".
 *
 * schoolEmail("Dr. Kristine L. San Lorenzo") → "kristine.sanlorenzo@unc.edu.ph"
 *   honorifics stripped; first given-name word; middle names and initials
 *   dropped; surname = last word with any de/dela/delos/del/san/sta particles
 *   before it joined on; lowercase, no accents, no spaces/dots/hyphens.
 *   Mirrors the rule in scripts/make-sample-uploads.js. Returns null when the
 *   name has fewer than two usable words.
 *
 * samePerson(a, b) compares names with honorifics and single-letter initials
 * dropped, so "Danny B. Casimero" = "danny casimero", but "Maria Elena Santos"
 * ≠ "Maria Santos".
 */
import { allowedEmailDomain } from './roles.js';

const HONORIFICS = new Set(['dr', 'engr', 'mr', 'ms', 'mrs', 'prof', 'atty']);
const PARTICLES = new Set(['de', 'dela', 'delos', 'del', 'san', 'sta', 'la', 'los']);
const LEADING_PARTICLES = new Set(['de', 'dela', 'delos', 'del', 'san', 'sta']);

const clean = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');

const nameWords = (fullName) =>
  String(fullName || '').trim().split(/\s+/).filter((w) => w && clean(w) && !HONORIFICS.has(clean(w)));

export function schoolEmail(fullName) {
  const words = nameWords(fullName);
  if (words.length < 2) return null;
  let i = words.length - 1;
  const surname = [words[i]];
  // "la"/"los" only count after another particle ("de la", "de los").
  while (i > 1 && PARTICLES.has(clean(words[i - 1]))) {
    const w = clean(words[i - 1]);
    if (!LEADING_PARTICLES.has(w) && !(i > 2 && LEADING_PARTICLES.has(clean(words[i - 2])))) break;
    surname.unshift(words[--i]);
  }
  return `${clean(words[0])}.${surname.map(clean).join('')}@${allowedEmailDomain()}`;
}

const personKey = (fullName) => nameWords(fullName).map(clean).filter((w) => w.length > 1).join(' ');

export const samePerson = (a, b) => {
  const ka = personKey(a);
  return !!ka && ka === personKey(b);
};
