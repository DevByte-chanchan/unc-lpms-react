/**
 * Schedule conflicts in the registrar's Subject Offerings: the same faculty
 * member (nameMatches) in two classes on the same day at overlapping times.
 * Information only — Compare shows them, it never blocks Apply.
 *
 *   parseTimeRange("05:30PM-08:30PM") → { start: 1050, end: 1230 }  (minutes)
 *   parseDays("TTH")                  → ['T', 'TH']
 *
 * Back-to-back classes (one ends 7:30, the next starts 7:30) don't overlap.
 * Not conflicts either, because they are one class listed more than once:
 *   - the SAME time in the SAME room (codes taught together);
 *   - sections of the SAME course at the SAME time (blocks merged into one
 *     session, often in separate virtual rooms VR1, VR2, ...).
 */
import { nameMatches } from './officialMatch.js';

const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*([AP])?\.?\s*M?\.?$/i;

function parseClock(text) {
  const m = String(text || '').trim().match(TIME_RE);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return { h, min, half: m[3] ? m[3].toUpperCase() : null };
}

const toMinutes = ({ h, min }, half) => {
  let hour = h;
  if (half === 'P' && hour < 12) hour += 12;
  if (half === 'A' && hour === 12) hour = 0;
  return hour * 60 + min;
};

/** "05:30PM-08:30PM", "5:30-8:30PM", "7:30 AM – 9:00 AM" → { start, end } in minutes, or null. */
export function parseTimeRange(text) {
  const parts = String(text || '').replace(/\s+/g, '').split(/[-–—]|to/i);
  if (parts.length !== 2) return null;
  const a = parseClock(parts[0]);
  const b = parseClock(parts[1]);
  if (!a || !b) return null;
  const endHalf = b.half;
  let start;
  if (a.half) start = toMinutes(a, a.half);
  else {
    // "5:30-8:30PM": the start takes the end's AM/PM, unless that puts it after the end.
    start = toMinutes(a, endHalf);
    const end = toMinutes(b, endHalf);
    if (endHalf === 'P' && start > end) start = toMinutes(a, 'A');
  }
  const end = toMinutes(b, endHalf || a.half);
  if (!(end > start)) return null;
  return { start, end };
}

/** Day codes: M T W TH F S SU. "TH" is read before "T" and "SU" before "S". */
export function parseDays(text) {
  const s = String(text || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return null;
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('TH', i)) { out.push('TH'); i += 2; continue; }
    if (s.startsWith('SU', i)) { out.push('SU'); i += 2; continue; }
    const c = s[i];
    if ('MTWFS'.includes(c)) { out.push(c); i += 1; continue; }
    return null; // a letter that isn't a day code: don't guess
  }
  return [...new Set(out)];
}

const fmtClock = (m) => {
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const half = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return h + ':' + String(min).padStart(2, '0') + ' ' + half;
};

/** "6:30–8:30 PM" (one AM/PM when both ends share it). */
export function formatTimeRange({ start, end }) {
  const a = fmtClock(start);
  const b = fmtClock(end);
  return a.slice(-2) === b.slice(-2) ? a.slice(0, -3) + '–' + b : a + '–' + b;
}

const roomKey = (r) => String(r || '').replace(/\s+/g, '').toUpperCase();

/**
 * @param offerings  parseSubjectOfferingsMatrix(...).offerings (the WHOLE file:
 *                   a person may also teach in another program)
 * @param options    relevant(offering) → only report conflicts touching these
 *                   (the program being compared); nameOf(registrarName) → the
 *                   name to show
 * @returns [{ faculty, day, a: { course, code, time, days, room }, b: {…}, text }]
 */
export function findScheduleConflicts(offerings, { relevant = () => true, nameOf = (n) => n } = {}) {
  const slots = [];
  for (const off of offerings || []) {
    const onlyTeacher = (off.facultyNames || []).length === 1 ? off.facultyNames[0] : null;
    for (const s of off.schedules || []) {
      if (!s || typeof s !== 'object') continue;
      const faculty = String(s.faculty || '').trim() || onlyTeacher;
      const range = parseTimeRange(s.time);
      const days = parseDays(s.days);
      if (!faculty || !range || !days) continue;
      slots.push({ off, faculty, range, days, room: s.room || '', time: s.time, dayText: s.days, relevant: !!relevant(off) });
    }
  }
  const out = [];
  const seen = new Set();
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (!a.relevant && !b.relevant) continue;
      if (a.off === b.off && a.range.start === b.range.start) continue;
      if (!(a.range.start < b.range.end && b.range.start < a.range.end)) continue;
      const day = a.days.find((d) => b.days.includes(d));
      if (!day) continue;
      if (!nameMatches(a.faculty, b.faculty)) continue;
      const sameTime = a.range.start === b.range.start && a.range.end === b.range.end;
      const sameBase = a.off.baseCode === b.off.baseCode;
      if (sameTime && roomKey(a.room) && roomKey(a.room) === roomKey(b.room)) continue;
      if (sameTime && sameBase) continue;
      const label = (x) => (sameBase ? x.off.courseNo : x.off.baseCode || x.off.courseNo);
      const key = [nameOf(a.faculty), ...[label(a), label(b)].sort(), day].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const side = (x) => ({ course: label(x), code: x.off.code || null, time: formatTimeRange(x.range), days: x.dayText, room: String(x.room || '').trim() || null });
      const sa = side(a);
      const sb = side(b);
      const faculty = nameOf(a.faculty);
      out.push({
        faculty, day, a: sa, b: sb,
        text: faculty + ' — ' + sa.course + ' (' + day + ' ' + sa.time + ') overlaps ' + sb.course + ' (' + day + ' ' + sb.time + ')',
      });
    }
  }
  return out.sort((x, y) => x.faculty.localeCompare(y.faculty) || x.text.localeCompare(y.text));
}
