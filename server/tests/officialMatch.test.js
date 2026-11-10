/**
 * Pre-assignment vs. the registrar's Subject Offerings (utils/officialMatch.js).
 * Pure — no database needed.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nameMatches, matchFacultyName, buildOfficialCourses, compareWithOfficial } from '../utils/officialMatch.js';

const FACULTY = [
  { id: 1, name: 'Danny B. Casimero' },
  { id: 2, name: 'June Arreb Danila' },
  { id: 3, name: 'Maria Arka Danila' },
  { id: 4, name: 'Jake De Guzman' },
  { id: 5, name: 'Dennis Ignacio' },
];

test('registrar surname-first names match the faculty list', () => {
  assert.ok(nameMatches('June Arreb Danila', 'DANILA JUNE ARREB'));
  assert.ok(nameMatches('Jake De Guzman', 'DE GUZMAN JAKE'));
  assert.ok(nameMatches('Danny B. Casimero', 'CASIMERO DANNY BOY'));     // middle initial vs. name
  assert.ok(nameMatches('Danny B. Casimero', 'DANNY B. CASIMERO'));
  assert.ok(!nameMatches('June Arreb Danila', 'DANILA MARIA ARKA'));
  assert.ok(!nameMatches('Danny B. Casimero', 'CASIMERO DANNY CRUZ'));   // C is not B
  assert.ok(!nameMatches('Dennis Ignacio', 'IGNACIO'));                  // one word is never enough
});

test('a registrar name resolves to exactly one faculty row', () => {
  assert.equal(matchFacultyName('DANILA JUNE ARREB', FACULTY).id, 2);
  assert.equal(matchFacultyName('DANILA MARIA ARKA', FACULTY).id, 3);
  assert.equal(matchFacultyName('REYES AGNES', FACULTY), null);
});

const OFFERINGS = [
  { baseCode: 'BIT213L', courseNo: 'BIT213L-OBa', facultyNames: ['CASIMERO DANNY BOY'] },
  { baseCode: 'BIT213L', courseNo: 'BIT213L-OBb', facultyNames: ['CASIMERO DANNY BOY', 'DANILA JUNE ARREB'] },
  { baseCode: 'BIT311L', courseNo: 'BIT311L-OAa', facultyNames: ['IGNACIO DENNIS'] },
  { baseCode: 'BIT999L', courseNo: 'BIT999L-OAa', facultyNames: ['REYES AGNES'] },
];
const COURSES = [
  { course_code: 'BIT213L', course_name: 'OOP', contributor_names: ['CASIMERO DANNY BOY', 'DANILA JUNE ARREB'] },
  { course_code: 'BIT311L', course_name: 'Networks', contributor_names: ['IGNACIO DENNIS'] },
  { course_code: 'BIT999L', course_name: 'New one', contributor_names: ['REYES AGNES'] },
];

test('official courses carry each person and their sections', () => {
  const [oop] = buildOfficialCourses(COURSES, OFFERINGS, FACULTY);
  assert.deepEqual(oop.people.map((p) => [p.faculty_id, p.faculty_name, p.sections]), [
    [1, 'Danny B. Casimero', ['BIT213L-OBa', 'BIT213L-OBb']],
    [2, 'June Arreb Danila', ['BIT213L-OBb']],
  ]);
  const unmatched = buildOfficialCourses(COURSES, OFFERINGS, FACULTY)[2].people[0];
  assert.equal(unmatched.matched, false);
  assert.equal(unmatched.faculty_name, 'REYES AGNES');
});

const pre = (code, lead, contributors = []) => ({
  id: code.length, course_code: code, course_name: code,
  faculty_id: lead ? lead.id : null, faculty_name: lead ? lead.name : null,
  contributors: contributors.map((c) => ({ faculty_id: c.id, faculty_name: c.name })),
});
const [CASIMERO, DANILA, , , IGNACIO] = FACULTY;

test('the five cases', () => {
  const official = buildOfficialCourses(COURSES, OFFERINGS, FACULTY);
  const rows = compareWithOfficial([
    pre('BIT213L', CASIMERO, [DANILA]),   // confirmed
    pre('BIT311L', CASIMERO),             // Lead not official → differs, needs a Lead
    pre('BIT100L', IGNACIO),              // not offered
  ], official);
  const by = Object.fromEntries(rows.map((r) => [r.course_code, r]));

  assert.equal(by.BIT213L.case, 'confirmed');

  assert.equal(by.BIT311L.case, 'differs');
  assert.deepEqual(by.BIT311L.add.map((p) => p.faculty_id), [5]);
  assert.deepEqual(by.BIT311L.remove.map((p) => p.faculty_id), [1]);
  assert.equal(by.BIT311L.lead_removed, true);
  assert.equal(by.BIT311L.needs_lead, true);
  assert.deepEqual(by.BIT311L.proposed, { lead: null, contributors: [{ faculty_id: 5, faculty_name: 'Dennis Ignacio' }] });

  assert.equal(by.BIT100L.case, 'not_offered');

  assert.equal(by.BIT999L.case, 'new');
  assert.equal(by.BIT999L.proposed.lead, null);
  assert.deepEqual(by.BIT999L.proposed.contributors.map((p) => p.faculty_name), ['REYES AGNES']);
});

test('extra official people → differs, add as Contributors, Lead kept', () => {
  const official = buildOfficialCourses(COURSES, OFFERINGS, FACULTY);
  const [row] = compareWithOfficial([pre('BIT213L', CASIMERO)], official).filter((r) => r.course_code === 'BIT213L');
  assert.equal(row.case, 'differs');
  assert.deepEqual(row.add.map((p) => p.faculty_id), [2]);
  assert.equal(row.remove.length, 0);
  assert.equal(row.needs_lead, false);
  assert.equal(row.proposed.lead.faculty_id, 1);
  assert.deepEqual(row.proposed.contributors.map((p) => p.faculty_id), [2]);
});

test('the right people but no Lead yet → differs, needs a Lead', () => {
  const official = buildOfficialCourses(COURSES, OFFERINGS, FACULTY);
  const row = compareWithOfficial([pre('BIT213L', null, [CASIMERO, DANILA])], official).find((r) => r.course_code === 'BIT213L');
  assert.equal(row.case, 'differs');
  assert.equal(row.add.length + row.remove.length, 0);
  assert.equal(row.needs_lead, true);
});

test('offered with no faculty named yet: no fix suggested', () => {
  const official = buildOfficialCourses([{ course_code: 'BIT215L', course_name: 'x', contributor_names: [] }], [], FACULTY);
  const [row] = compareWithOfficial([pre('BIT215L', CASIMERO)], official);
  assert.equal(row.case, 'differs');
  assert.equal(row.no_official_faculty, true);
  assert.equal(row.needs_lead, false);
  assert.deepEqual([row.add, row.remove, row.proposed], [[], [], null]);
});

test('unresolved ids still compare by name (registrar spelling)', () => {
  const official = buildOfficialCourses(COURSES, OFFERINGS, []);   // empty faculty list: nothing resolves
  const row = compareWithOfficial([{
    id: 9, course_code: 'BIT311L', faculty_id: null, faculty_name: 'Dennis Ignacio', contributors: [],
  }], official).find((r) => r.course_code === 'BIT311L');
  assert.equal(row.case, 'confirmed');
});
