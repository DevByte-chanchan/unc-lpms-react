/**
 * Teaching load: units from the catalog's credit string, Lead units only,
 * Contributors listed, inactive rows ignored, names matched across ALL CAPS
 * and middle initials, sorted highest first, "over by" above the limit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { creditUnits, sectionCount, computeTeachingLoad, maxTeachingUnits } from '../utils/teachingLoad.js';

test('creditUnits: the Course Offerings credit string', () => {
  assert.equal(creditUnits('2 LEC, 1 LAB'), 3);
  assert.equal(creditUnits('3 LEC, 0 LAB'), 3);
  assert.equal(creditUnits('3 LEC'), 3);
  assert.equal(creditUnits('(2) LEC, 0 LAB'), 0, 'non-credit');
  assert.equal(creditUnits('3'), 3);
  assert.equal(creditUnits(''), null);
  assert.equal(creditUnits('three'), null);
});

test('maxTeachingUnits: env or 24', () => {
  assert.equal(maxTeachingUnits({}), 24);
  assert.equal(maxTeachingUnits({ MAX_TEACHING_UNITS: '21' }), 21);
  assert.equal(maxTeachingUnits({ MAX_TEACHING_UNITS: 'lots' }), 24);
});

test('sectionCount: distinct official sections', () => {
  assert.equal(sectionCount({ sections: [{ faculty_name: 'A', sections: ['X-1', 'X-2'] }, { faculty_name: 'B', sections: ['X-2'] }] }), 2);
  assert.equal(sectionCount({ sections: null }), null);
});

const courses = [
  { course_id: 1, course_no: 'BIT101', credit: '2 LEC, 1 LAB' },
  { course_id: 2, course_no: 'BIT102', credit: '3 LEC, 0 LAB' },
  { course_id: 3, course_no: 'BIT103', credit: '(2) LEC, 0 LAB' },
  { course_id: 4, course_no: 'BIT104', credit: '3 LEC, 0 LAB' },
  { course_id: 5, course_no: 'BIT105', credit: '3 LEC, 0 LAB' },
];
const row = (id, code, lead, extra = {}) => ({
  id, course_code: code, course_id: courses.find((c) => c.course_no === code).course_id,
  faculty_name: lead, faculty_id: null, contributors: [], status: 'Active', program_id: 1, ...extra,
});

test('computeTeachingLoad: who carries what', () => {
  const rows = [
    row(1, 'BIT101', 'Harold T. Lim', { faculty_id: 7, sections: [{ sections: ['BIT101-A', 'BIT101-B'] }] }),
    row(2, 'BIT102', 'HAROLD T. LIM', { faculty_id: 7 }),
    row(3, 'BIT103', 'Harold Lim', { status: 'On Leave' }),                 // non-credit: 0 units, still listed
    row(4, 'BIT104', 'Ana Cruz', { contributors: [{ faculty_id: 7, faculty_name: 'Harold T. Lim' }, { faculty_id: null, faculty_name: 'Ana Cruz' }] }),
    row(5, 'BIT105', 'Ana Cruz', { status: 'Archived' }),                     // not counted
    row(6, 'BIT105', 'Ben Uy', { program_id: 2 }),                            // other program
  ];
  const load = computeTeachingLoad(rows, courses, { programId: 1, maxUnits: 5 });
  assert.equal(load.max_units, 5);
  assert.deepEqual(load.faculty.map((f) => [f.name, f.units, f.over_by]), [['Harold T. Lim', 6, 1], ['Ana Cruz', 3, 0]]);
  const harold = load.faculty[0];
  assert.deepEqual(harold.courses.map((c) => c.course_code + ':' + c.role), ['BIT101:Lead', 'BIT102:Lead', 'BIT103:Lead', 'BIT104:Contributor']);
  assert.equal(harold.sections, 2);
  const ana = load.faculty[1];
  assert.deepEqual(ana.courses.map((c) => c.role), ['Lead'], 'a Lead listed as Contributor of the same course counts once');
  assert.equal(load.course_units.BIT103, 0);
  assert.ok(!load.faculty.some((f) => f.name === 'Ben Uy'), 'only people on this program');
});

test('computeTeachingLoad: units across programs for people in this one', () => {
  const rows = [row(1, 'BIT101', 'Ben Uy'), row(2, 'BIT102', 'Ben Uy', { program_id: 2 })];
  const [ben] = computeTeachingLoad(rows, courses, { programId: 1 }).faculty;
  assert.equal(ben.units, 6);
  assert.equal(ben.courses.length, 2);
});
