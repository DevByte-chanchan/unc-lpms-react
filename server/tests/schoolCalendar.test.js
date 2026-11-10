/**
 * The term's calendar order (utils/schoolCalendar.js). Pure: no database needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarOrderError, isValidDay, ymd } from '../utils/schoolCalendar.js';

test('calendar order: blanks skipped, the two fields named', () => {
  assert.equal(calendarOrderError({}), null);
  assert.equal(calendarOrderError({ start_date: '2026-08-01', classes_start: '2026-08-10', final_exam: '2026-12-07', end_date: '2026-12-20' }), null);
  assert.equal(
    calendarOrderError({ prelim_exam: '2026-09-01', midterm_exam: '2026-08-20' }),
    'Midterm exam must be on or after Prelim exam.',
  );
  // Compared with the nearest PRESENT date before it.
  assert.equal(
    calendarOrderError({ start_date: '2026-08-01', semifinal_exam: '2026-07-30' }),
    'Semi-final exam must be on or after Start of semester.',
  );
  assert.equal(
    calendarOrderError({ final_exam: '2026-12-21', end_date: '2026-12-20' }),
    'End of semester must be on or after Final exam.',
  );
  assert.equal(calendarOrderError({ classes_start: '2026-02-30' }), 'Start of classes is not a valid date.');
  // Same day is fine.
  assert.equal(calendarOrderError({ start_date: '2026-08-10', classes_start: '2026-08-10' }), null);
});

test('day helpers', () => {
  assert.equal(ymd('2026-08-10T12:00:00Z'), '2026-08-10');
  assert.equal(ymd(''), null);
  assert.equal(isValidDay('2026-02-28'), true);
  assert.equal(isValidDay('2026-02-30'), false);
});
