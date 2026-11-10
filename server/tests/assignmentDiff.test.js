/**
 * History actions from before/after states (utils/assignmentDiff.js). Pure —
 * no database needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { describeChange, diffLists, contributorChanges, courseKey, sameLead } from '../utils/assignmentDiff.js';

const row = (over = {}) => ({
  period_id: 5, program_id: 2, course_code: 'BIT 101', course_name: 'Intro',
  faculty_id: 11, faculty_name: 'Danny B. Casimero',
  contributors: [{ faculty_id: 12, faculty_name: 'June Arreb Danila' }],
  status: 'Active',
  ...over,
});

test('create and delete', () => {
  assert.equal(describeChange(null, row()), 'assigned');
  assert.equal(describeChange(row(), null), 'removed');
  assert.equal(describeChange(row({ status: 'Archived' }), null), null);   // already removed
  assert.equal(describeChange(null, null), null);
});

test('archive and un-archive', () => {
  assert.equal(describeChange(row(), row({ status: 'Archived' })), 'removed');
  assert.equal(describeChange(row({ status: 'Archived' }), row({ status: 'Active' })), 'restored');
});

test('lead, contributors and course changes', () => {
  assert.equal(describeChange(row(), row({ faculty_id: 12, faculty_name: 'June Arreb Danila', contributors: [] })), 'lead_changed');
  assert.equal(describeChange(row(), row({ faculty_id: null, faculty_name: null })), 'lead_changed');
  assert.equal(describeChange(row(), row({ contributors: [] })), 'contributors_changed');
  assert.equal(describeChange(row(), row({ course_code: 'BIT 102' })), 'course_changed');
});

test('not a change: status mirroring the faculty, year level, a resolved id, honorifics', () => {
  assert.equal(describeChange(row(), row({ status: 'On Leave' })), null);
  assert.equal(describeChange(row(), row({ year_level: 'SECOND YEAR' })), null);
  assert.equal(describeChange(row({ faculty_id: null }), row()), null);
  assert.equal(describeChange(row(), row({ faculty_name: 'Dr. danny b casimero' })), null);
  assert.equal(describeChange(row(), row({ course_code: ' bit 101 ' })), null);
  assert.equal(describeChange(row(), row({ contributors: [{ faculty_id: null, faculty_name: 'June Arreb Danila' }] })), null);
});

test('contributor adds and removes', () => {
  const { added, removed } = contributorChanges(row(), row({ contributors: [{ faculty_id: 13, faculty_name: 'Ana Cruz' }] }));
  assert.deepEqual(added.map((c) => c.faculty_name), ['Ana Cruz']);
  assert.deepEqual(removed.map((c) => c.faculty_name), ['June Arreb Danila']);
});

test('courseKey: program null is 0, code trimmed and case-folded', () => {
  assert.equal(courseKey({ program_id: null, course_code: ' BIT 101 ' }), '0|bit 101');
  assert.equal(courseKey(row()), '2|bit 101');
  assert.equal(sameLead(row(), row({ faculty_name: 'DANNY B. CASIMERO' })), true);
});

test('re-uploading the same list writes nothing', () => {
  const list = [row(), row({ course_code: 'BIT 102', faculty_name: 'Ana Cruz', faculty_id: 13 })];
  // New rows (new ids, re-stamped) — same courses, same people.
  const again = list.map((r, i) => ({ ...r, id: 100 + i, date_assigned: new Date() }));
  assert.deepEqual(diffLists(list, again), []);
});

test('an upload records only the real changes', () => {
  const before = [
    row(),
    row({ course_code: 'BIT 102' }),
    row({ course_code: 'BIT 103' }),
    row({ course_code: 'BIT 104', status: 'Archived' }),
  ];
  const after = [
    row(),                                                                        // unchanged
    row({ course_code: 'BIT 102', faculty_name: 'Ana Cruz', faculty_id: 13 }),    // lead changed
    row({ course_code: 'BIT 105' }),                                              // new
    row({ course_code: 'BIT 104' }),                                              // back from the archive
  ];                                                                              // BIT 103 gone
  const changes = diffLists(before, after).map((c) => [c.key, c.action]);
  assert.deepEqual(changes, [
    ['2|bit 102', 'lead_changed'],
    ['2|bit 103', 'removed'],
    ['2|bit 104', 'restored'],
    ['2|bit 105', 'assigned'],
  ]);
});

test('the same code in two programs is two courses', () => {
  const changes = diffLists([row({ program_id: 1 })], [row({ program_id: 1 }), row({ program_id: 2 })]);
  assert.deepEqual(changes.map((c) => [c.key, c.action]), [['2|bit 101', 'assigned']]);
});
