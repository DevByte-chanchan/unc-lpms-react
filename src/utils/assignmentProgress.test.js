import test from 'node:test';
import assert from 'node:assert/strict';
import { progressOf, matchesProgress } from './assignmentProgress.js';

const row = (code, status, lead, state, programId = 1) => ({
  course_code: code, status, faculty_name: lead, program_id: programId,
  delivery: state ? { lead: { state }, contributors: {} } : null,
});

const rows = [
  row('A', 'Active', 'Ana Cruz', 'sent'),
  row('B', 'Active', 'Ben Uy', 'told'),
  row('C', 'On Leave', 'Cy Lim', 'bell'),
  row('D', 'Active', 'Di Go', 'queued'),           // assigned, not notified yet
  row('E', 'Active', 'Ed Sy', 'held'),
  row('F', 'Active', '', null),                    // no Lead: not assigned
  row('G', 'Archived', 'Gi Ong', 'sent'),          // archived: not counted
  row('H', 'Pending Match', 'Ho Tan', 'sent'),     // not Active / On Leave
  row('I', 'Active', 'Iz Paz', 'sent', 2),         // another program
];

test('progressOf: assigned of offered, notified, not notified', () => {
  assert.deepEqual(progressOf(rows, { programId: 1, offered: 7 }), { assigned: 5, offered: 7, notified: 3, notNotified: 2 });
});

test('matchesProgress: each count is the filter the table uses', () => {
  const mine = rows.filter((r) => r.program_id === 1);
  const codes = (key) => mine.filter((r) => matchesProgress(r, key)).map((r) => r.course_code).join('');
  assert.equal(codes('assigned'), 'ABCDE');
  assert.equal(codes('notified'), 'ABC');
  assert.equal(codes('not_notified'), 'DE');
  assert.equal(codes(null), 'ABCDEFGH');
  const p = progressOf(rows, { programId: 1 });
  assert.equal(p.assigned, codes('assigned').length);
  assert.equal(p.notified, codes('notified').length);
  assert.equal(p.notNotified, codes('not_notified').length);
});
