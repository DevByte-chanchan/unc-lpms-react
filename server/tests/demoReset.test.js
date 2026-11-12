/**
 * npm run demo:reset: the term it creates (the current school year's 1st
 * Semester, the sample calendar's dates moved to that year) and the sample
 * files it needs. The full reset is a script against a whole database, run by
 * hand (README: "Reset the demo"); importing it here runs nothing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { schoolYearOf, demoTerm, DEMO_FILES } from '../scripts/demoReset.js';

test('schoolYearOf: a school year starts in June', () => {
  assert.equal(schoolYearOf(new Date('2026-11-12T00:00:00Z')), '2026-2027');
  assert.equal(schoolYearOf(new Date('2027-03-01T00:00:00Z')), '2026-2027');
  assert.equal(schoolYearOf(new Date('2027-06-15T00:00:00Z')), '2027-2028');
});

test('demoTerm: the sample dates, moved to the school year', () => {
  const t = demoTerm('2026-2027', new Date('2026-08-01T00:00:00Z'));
  assert.equal(t.label, '1st Semester 2026-2027');
  assert.equal(t.semester, '1');
  assert.equal(t.midterm_exam, '2026-09-25');
  assert.equal(t.end_date, '2026-11-25');
  const later = demoTerm('2028-2029', new Date('2028-08-01T00:00:00Z'));
  assert.equal(later.final_exam, '2028-11-21');
});

test('demoTerm: an end date already past is left empty (the term stays open)', () => {
  assert.equal(demoTerm('2026-2027', new Date('2026-12-01T00:00:00Z')).end_date, null);
});

test('DEMO_FILES: every sample file is in the repository', () => {
  const all = [DEMO_FILES.departments, DEMO_FILES.faculty, DEMO_FILES.programs, ...DEMO_FILES.courses, DEMO_FILES.assignments, DEMO_FILES.consultants];
  for (const f of all) assert.ok(fs.existsSync(f), f);
});
