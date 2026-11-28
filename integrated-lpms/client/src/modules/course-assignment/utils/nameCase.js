/**
 * Registrar exports write names in ALL CAPS ("DANNY B. CASIMERO"). Shown and
 * stored, a name reads in normal case ("Danny B. Casimero"). A name that already
 * has lowercase letters is left exactly as typed.
 *
 * Kept identical to server/utils/nameCase.js.
 */
const ROMAN = /^(II|III|IV|VI|VII|VIII|IX|X)$/;

function capWord(word) {
  if (!word) return word;
  const bare = word.replace(/[.,]/g, '');
  if (ROMAN.test(bare)) return word;                        // III stays III
  if (/^jr\.?$/i.test(word)) return 'Jr.';
  if (/^sr\.?$/i.test(word)) return 'Sr.';
  const lower = word.toLowerCase();
  // Hyphens and apostrophes start a new capital: Santos-Reyes, O'Brien.
  return lower.replace(/(^|[-'’])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
    .replace(/^Mc(\p{L})/u, (_, ch) => 'Mc' + ch.toUpperCase());
}

export function displayName(name) {
  if (name == null) return name;
  const s = String(name).replace(/\s+/g, ' ').trim();
  if (!s || !/\p{Lu}/u.test(s) || /\p{Ll}/u.test(s)) return s;  // has lowercase already, or no letters
  return s.split(' ').map((w) => capWord(w)).join(' ');
}
