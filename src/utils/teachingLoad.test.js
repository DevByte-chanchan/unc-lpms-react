import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEntryFor, leadLoadWarning, personKey } from './teachingLoad.js';

const load = {
  max_units: 24,
  course_units: { BIT101: 3, BIT102: 6, BIT103: 0 },
  faculty: [
    { name: 'Bowen Higgins', names: ['BOWEN HIGGINS'], units: 24, courses: [{ role: 'Lead', course_code: 'BIT102', units: 6, assignment_id: 9 }] },
    { name: 'Ana Cruz', names: ['Ana Cruz'], units: 3, courses: [] },
  ],
};

test('personKey: case, punctuation and word order', () => {
  assert.equal(personKey('HIGGINS, BOWEN'), personKey('Bowen Higgins'));
});

test('loadEntryFor: matches an ALL CAPS registrar name', () => {
  assert.equal(loadEntryFor(load, 'bowen higgins').name, 'Bowen Higgins');
  assert.equal(loadEntryFor(load, 'Nobody Here'), null);
});

test('leadLoadWarning: over the limit warns, at or under says nothing', () => {
  assert.equal(leadLoadWarning(load, { name: 'BOWEN HIGGINS', courseCode: 'bit101' }), 'Bowen Higgins would have 27 units (limit 24)');
  assert.equal(leadLoadWarning(load, { name: 'Ana Cruz', courseCode: 'BIT101' }), null);
  assert.equal(leadLoadWarning(load, { name: 'Bowen Higgins', courseCode: 'BIT103' }), null, 'a non-credit course adds 0');
  assert.equal(leadLoadWarning(load, { name: 'New Person', courseCode: 'BIT102' }), null);
  assert.equal(leadLoadWarning(load, { name: '', courseCode: 'BIT101' }), null);
});

test('leadLoadWarning: editing the row they already lead does not count it twice', () => {
  // Bowen already leads row 9 (BIT102, 6 units): re-saving it keeps 24.
  assert.equal(leadLoadWarning(load, { name: 'Bowen Higgins', courseCode: 'BIT102', editingId: 9 }), null);
  // Switching row 9 to BIT101 (3 units): 24 − 6 + 3 = 21.
  assert.equal(leadLoadWarning(load, { name: 'Bowen Higgins', courseCode: 'BIT101', editingId: 9 }), null);
});
