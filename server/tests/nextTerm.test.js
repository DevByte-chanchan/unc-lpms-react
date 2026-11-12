/** The semester that opens by itself when the current one ends. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTermOf, periodLabelOf } from '../controllers/academicPeriodController.js';

test('1st Semester → 2nd Semester of the same school year', () => {
  const n = nextTermOf({ school_year: '2026-2027', semester: '1' });
  assert.deepEqual(n, { school_year: '2026-2027', semester: '2' });
  assert.equal(periodLabelOf(n), '2nd Semester 2026-2027');
});

test('2nd Semester (or Summer) → 1st Semester of the next school year', () => {
  for (const semester of ['2', 'Summer']) {
    const n = nextTermOf({ school_year: '2026-2027', semester });
    assert.deepEqual(n, { school_year: '2027-2028', semester: '1' });
    assert.equal(periodLabelOf(n), '1st Semester 2027-2028');
  }
});

test('no school year → nothing to open', () => {
  assert.equal(nextTermOf({ school_year: '', semester: '1' }), null);
});
