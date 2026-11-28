/**
 * Plain helpers for the Course Assignment page and its history timeline
 * (components/AssignmentTracking.jsx). Kept out of the component file so React
 * Fast Refresh keeps working there.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' is a calendar day — read it as one, never through UTC.
const asDate = (v) => {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Oct 12" (with the year when it isn't this year). */
export const fmtDay = (v) => {
  const d = asDate(v);
  if (!d) return '';
  const base = MONTHS[d.getMonth()] + ' ' + d.getDate();
  return d.getFullYear() === new Date().getFullYear() ? base : base + ', ' + d.getFullYear();
};

/** "Oct 12, 3:40 PM" */
export const fmtDayTime = (v) => {
  const d = asDate(v);
  if (!d) return '';
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return fmtDay(d) + ', ' + h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ampm;
};

/** "Oct 12 · by Kristine San Lorenzo" from the newest history entry. */
export const lastUpdatedText = (lc) => (lc ? fmtDay(lc.at) + (lc.by ? ' · by ' + lc.by : '') : '');
