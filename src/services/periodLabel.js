/**
 * Academic-period label helpers.
 *
 * Canonical format: "1st Semester YYYY-YYYY" | "2nd Semester YYYY-YYYY"
 * | "Summer YYYY-YYYY". Older formats stored as
 *   "YYYY-YYYY Semester 1" / "YYYY-YYYY 1st Semester" / "Semester 1 YYYY-YYYY"
 * are normalized on display via prettifyLabel so the UI is uniform
 * without a DB migration.
 */

export const formatSemester = (s) => {
  const v = String(s || '').trim();
  if (v.toLowerCase() === 'summer' || v === '3') return 'Summer';
  if (v === '1') return '1st Semester';
  if (v === '2') return '2nd Semester';
  return v;
};

// Build a fresh label from {school_year, semester} — semester first.
export const formatPeriodLabel = (p) => {
  if (!p) return '';
  const sy = (p.school_year || '').trim();
  const sem = formatSemester(p.semester);
  return (sem + (sy ? ' ' + sy : '')).trim();
};

// Normalize any stored label to the canonical "<Semester> YYYY-YYYY"
// form. Handles three legacy shapes:
//   "YYYY-YYYY Semester 1"    → "1st Semester YYYY-YYYY"
//   "YYYY-YYYY 1st Semester"  → "1st Semester YYYY-YYYY"
//   "YYYY-YYYY Summer"        → "Summer YYYY-YYYY"
// Idempotent on already-correct strings.
const YEAR_RX = /(\d{4}\s*-\s*\d{4})/;
const SEM_AFTER_YEAR_RX = /^(.*?)\s+(1st Semester|2nd Semester|Summer|Semester\s*[12])$/i;

export const prettifyLabel = (label) => {
  if (!label) return label;
  let s = String(label).trim();

  // Step 1: turn raw "Semester N" into the ordinal form, regardless of position.
  s = s.replace(/\bSemester\s*1\b/gi, '1st Semester')
       .replace(/\bSemester\s*2\b/gi, '2nd Semester');

  // Step 2: if a year range still trails the semester, flip the order.
  const m = s.match(SEM_AFTER_YEAR_RX);
  if (m) {
    const left = m[1].trim();
    const sem  = m[2];
    if (YEAR_RX.test(left)) {
      // "YYYY-YYYY 1st Semester"  → "1st Semester YYYY-YYYY"
      return (sem + ' ' + left).trim();
    }
  }
  return s;
};

// A term that opened by itself when the previous one ended: no Start / End of
// Semester yet (the OVPAA sets them later from the dashboard). It is still the
// current, editable term.
export const termDatesPending = (p) => !!p && !p.start_date && !p.end_date;
