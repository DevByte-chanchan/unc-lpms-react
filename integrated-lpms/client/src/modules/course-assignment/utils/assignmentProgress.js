/**
 * The Course Assignment progress strip:
 *   "32 of 35 courses assigned · 30 notified · 2 not notified"
 *
 *   assigned      Active / On Leave rows with a Lead, out of the program's
 *                 course offerings this term (GET /course-offering-assignments/offered)
 *   notified      assigned rows whose Lead's delivery state is sent, told or bell
 *                 (server/services/assignmentDelivery.js)
 *   not notified  assigned rows whose Lead hasn't been told (any other state)
 *
 * Learning plans submitted: not shown — this module keeps no submission data
 * (requirement tracking lives in the Learning Plan Approval system).
 *
 * Each count is also a filter: matchesProgress(row, key) is the table filter
 * for a click on that part, so the strip and the filtered table always agree.
 */
export const COUNTED_STATUSES = ['Active', 'On Leave'];
export const NOTIFIED_STATES = ['sent', 'told', 'bell'];

const inProgram = (row, programId) => !programId || !row.program_id || Number(row.program_id) === Number(programId);
const leadState = (row) => (row && row.delivery && row.delivery.lead ? row.delivery.lead.state : null);

export const isAssigned = (row) => COUNTED_STATUSES.includes(row.status) && !!String(row.faculty_name || '').trim();
export const isNotified = (row) => isAssigned(row) && NOTIFIED_STATES.includes(leadState(row));

/** True when `row` belongs under the strip filter `key` ('assigned' | 'notified' | 'not_notified'). */
export function matchesProgress(row, key) {
  if (key === 'assigned') return isAssigned(row);
  if (key === 'notified') return isNotified(row);
  if (key === 'not_notified') return isAssigned(row) && !isNotified(row);
  return true;
}

/** { assigned, offered, notified, notNotified } for the program's rows. */
export function progressOf(rows, { programId = null, offered = null } = {}) {
  const mine = (rows || []).filter((r) => inProgram(r, programId));
  const assigned = mine.filter(isAssigned);
  const notified = assigned.filter(isNotified).length;
  return { assigned: assigned.length, offered, notified, notNotified: assigned.length - notified };
}
