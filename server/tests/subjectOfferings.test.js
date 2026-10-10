/**
 * SUBJECT OFFERINGS extraction, against the real school export
 * (tests/fixtures/CS_26271-Course-OFferings.xls).
 *
 * The fixture is one term of the School of Computer and Information Sciences:
 * four programs (ACT, BSIT, BSCS, LIS) in one sheet, with lab rows, split
 * lecture days, shared GEE / MATH courses and plenty of blank faculty cells.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  looksLikeSubjectOfferings,
  looksLikeTeachingAssignment,
  parseSubjectOfferings,
  extractProgramAssignments,
  offeringRowsFromSubjectOfferings,
  collapseFlatOfferingRows,
} from '../utils/teachingAssignmentParser.js';
import { programCoursePrefixes, programKeyFromPrefixes } from '../utils/courseCodeRules.js';

const FIXTURE = fileURLToPath(new URL('./fixtures/CS_26271-Course-OFferings.xls', import.meta.url));

const parsed = parseSubjectOfferings(FIXTURE);

const forProgram = (programCode) => {
  const prefixes = programCoursePrefixes(programCode);
  return extractProgramAssignments(parsed, prefixes, {
    programKey: programKeyFromPrefixes(prefixes),
  });
};

const index = (rows) => new Map(rows.map((r) => [r.course_code, r]));
const sorted = (a) => [...a].sort();

const bsit = forProgram('BSIT');
const bscs = forProgram('BSCS');
const act  = forProgram('ACT');
const lis  = forProgram('BLIS');

const offeringByCourseNo = (courseNo) =>
  parsed.offerings.find((o) => o.courseNo === courseNo);

test('the layout is detected, and not mistaken for a STRAP export', () => {
  assert.equal(looksLikeSubjectOfferings(FIXTURE), true);
  assert.equal(looksLikeTeachingAssignment(FIXTURE), false);
  assert.equal(parsed.layout, 'subject-offerings');
  // Data lives on the second worksheet; the first is empty.
  assert.ok(parsed.offerings.length > 0);
});

test('the term comes from the title row, not a column', () => {
  assert.equal(parsed.term, 'First Sem S/Y 2026-2027');
  assert.equal(parsed.termSemester, 1);
  assert.deepEqual(parsed.headers, [
    'CODE', 'COURSE NO', 'DESCRIPTION', 'UNIT(S)', 'TIME', 'DAYS', 'FACULTY', 'ROOM',
  ]);
});

test('BSIT gets BIT111L with 4 sections, not 8 — lab rows are not sections', () => {
  const row = index(bsit).get('BIT111L');
  assert.ok(row, 'BIT111L should be in the BSIT extraction');
  assert.deepEqual(sorted(row.sections), ['OBa', 'OBb', 'OBc', 'OBd']);
  assert.equal(row.sections.length, 4);
  assert.equal(row.course_name, 'Introduction to Computing');
});

test('rule 3 — shared MATH311L follows its section, so BSIT gets OB and BSCS gets OC', () => {
  const bsitMath = index(bsit).get('MATH311L');
  assert.ok(bsitMath, 'MATH311L should reach BSIT through its section');
  assert.deepEqual(sorted(bsitMath.sections), ['OBa', 'OBb', 'OBc']);
  assert.ok(!bsitMath.sections.includes('OCa'), 'OCa is BSCS, not BSIT');
  assert.equal(bsitMath.shared, true);

  const bscsMath = index(bscs).get('MATH311L');
  assert.deepEqual(bscsMath.sections, ['OCa']);

  // GEE-LITE is shared three ways in this sheet.
  assert.deepEqual(sorted(index(bsit).get('GEE-LITE').sections), ['OBa', 'OBb', 'OBc', 'OBd']);
  assert.deepEqual(index(bscs).get('GEE-LITE').sections, ['OCa']);
  assert.deepEqual(index(act).get('GEE-LITE').sections, ['OAa']);
});

test('rule 1 — programs never bleed into each other', () => {
  const codes = (rows) => rows.map((r) => r.course_code);

  for (const code of codes(bsit)) {
    assert.ok(!/^(BCS|ACT|LIS)/.test(code), 'BSIT must not contain ' + code);
  }
  for (const code of codes(bscs)) {
    assert.ok(!/^(BIT|ACT|LIS)/.test(code), 'BSCS must not contain ' + code);
  }
  for (const code of codes(act)) {
    assert.ok(!/^(BIT|BCS|LIS)/.test(code), 'ACT must not contain ' + code);
  }
  for (const code of codes(lis)) {
    assert.ok(!/^(BIT|BCS|ACT)/.test(code), 'LIS must not contain ' + code);
  }

  // Each program really did get its own courses.
  assert.ok(codes(bsit).includes('BIT111L'));
  assert.ok(codes(bscs).includes('BCS111L'));
  assert.ok(codes(act).includes('ACT111L'));
  assert.ok(codes(lis).includes('LIS111L'));

  // Same title, different program — BCS111L and BIT111L never merge.
  assert.equal(index(bsit).get('BIT111L').course_name, 'Introduction to Computing');
  assert.equal(index(bscs).get('BCS111L').course_name, 'Introduction to Computing');
  assert.equal(index(bsit).has('BCS111L'), false);

  // 15 BIT courses plus the two shared ones attributed by section.
  assert.equal(bsit.length, 17);
});

test('rule 4 — BIT213L-OBa keeps 1 lecture + 2 labs and one contributor', () => {
  const off = offeringByCourseNo('BIT213L-OBa');
  assert.ok(off, 'BIT213L-OBa should be one offering');
  assert.equal(off.schedules.length, 3);
  assert.equal(off.schedules.filter((s) => s.type === 'lecture').length, 1);
  assert.equal(off.schedules.filter((s) => s.type === 'lab').length, 2);
  // The lecture row's faculty cell is blank; both lab rows name the same person.
  assert.deepEqual(off.facultyNames, ['CASIMERO DANNY BOY']);
  assert.equal(off.units, 4);
  // The lab rows are NOT offerings of their own.
  assert.equal(offeringByCourseNo('BIT213L-OBaL'), undefined);
});

test('rule 4 — a repeated course no is a second lecture day, not a lab', () => {
  const off = offeringByCourseNo('BIT215L-OBa');
  assert.ok(off);
  assert.equal(off.schedules.length, 2);
  assert.deepEqual(off.schedules.map((s) => s.type), ['lecture', 'lecture']);
  assert.deepEqual(off.schedules.map((s) => s.days), ['W', 'M']);
});

test('rule 4 — nothing is orphaned in this export', () => {
  assert.deepEqual(parsed.orphans, []);
});

test('rule 2 — year level from the code, semester agrees with the term', () => {
  assert.equal(index(bsit).get('BIT314L').year_level, 'THIRD YEAR');
  assert.equal(index(bsit).get('BIT412L').year_level, 'FOURTH YEAR');
  assert.equal(index(bsit).get('BIT111L').year_level, 'FIRST YEAR');
  assert.equal(index(bsit).get('BIT213L').year_level, 'SECOND YEAR');

  // Every BSIT code that carries a semester digit reads as the sheet's own
  // semester, so this upload produces no semester warnings.
  const mismatched = bsit.filter((r) => r.semester && r.semester !== parsed.termSemester);
  assert.deepEqual(mismatched, []);
  assert.equal(bsit.every((r) => r.semester === 1 || r.semester === null), true);

  // GEE-LITE has no digits at all — explicitly unknown, to be filled from the
  // catalog or warned about.
  assert.equal(index(bsit).get('GEE-LITE').year_level, null);
  assert.equal(index(bsit).get('GEE-LITE').semester, null);
});

test('rule 5 — a blank faculty cell is never a contributor', () => {
  for (const row of [...bsit, ...bscs, ...act, ...lis]) {
    for (const name of row.contributor_names) {
      assert.notEqual(name, '', row.course_code + ' has an empty contributor');
      assert.equal(name, name.trim(), row.course_code + ' has an untrimmed contributor');
    }
  }
  // BIT312L has no faculty on any of its six rows.
  assert.deepEqual(index(bsit).get('BIT312L').contributor_names, []);
  // BIT111L names one person, once, across four sections and four lab rows.
  assert.deepEqual(index(bsit).get('BIT111L').contributor_names, ['ROBLES JR. ROBERTO']);
});

test('rule 5 — the room column arrives trimmed and units are numeric', () => {
  const off = offeringByCourseNo('BIT111L-OBa');
  assert.equal(off.schedules[0].room, 'JH-32');
  assert.equal(off.units, 3);
  assert.equal(typeof off.units, 'number');
});

test('Path A rows carry the course code, not the numeric offer id', () => {
  const prefixes = programCoursePrefixes('BSIT');
  const rows = offeringRowsFromSubjectOfferings(parsed, {
    prefixes, programKey: programKeyFromPrefixes(prefixes),
  });
  const row = rows.find((r) => r.code === 'BIT111L');
  assert.ok(row, 'BIT111L should be one Course Offerings row');
  assert.equal(row.description, 'Introduction to Computing');
  assert.equal(row.units, 3);
  assert.equal(row.term, 'First Sem S/Y 2026-2027');
  assert.equal(row.yearlevel, 'FIRST YEAR');
  assert.equal(row.instructor, 'ROBLES JR. ROBERTO');
  assert.equal(row._meta.sections.length, 4);
  // Nothing numeric from the CODE column leaks in as a course code.
  assert.ok(rows.every((r) => !/^\d+$/.test(String(r.code))));
});

test('a flat sheet still collapses its continuation rows', () => {
  const headers = ['CODE', 'COURSE NO', 'DESCRIPTION', 'UNIT(S)', 'TIME', 'DAYS', 'FACULTY', 'ROOM'];
  const { rows, orphans } = collapseFlatOfferingRows([
    { code: 3009, courseno: 'BIT111L-OBa', description: 'Introduction to Computing', units: 3, time: '02:00PM-04:00PM', days: 'T',  faculty: '', room: 'JH-32   ' },
    { code: '',   courseno: 'BIT111L-OBaL', description: '',                         units: '', time: '02:00PM-05:00PM', days: 'TH', faculty: 'ROBLES JR. ROBERTO', room: 'JH-28   ' },
  ], headers);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].code, 'BIT111L');              // not 3009
  assert.equal(rows[0].instructor, 'ROBLES JR. ROBERTO');
  assert.deepEqual(rows[0]._meta.sections, ['OBa']);
  assert.deepEqual(rows[0]._meta.schedules.map((s) => s.type), ['lecture', 'lab']);
  assert.deepEqual(orphans, []);
});

test('a flat sheet with no COURSE NO column is left alone', () => {
  const { rows } = collapseFlatOfferingRows(
    [{ code: 'BIT111L', coursetitle: 'Introduction to Computing', yearlevel: 'FIRST YEAR', instructor: 'ROBLES JR. ROBERTO' }],
    ['Code', 'Course Title', 'Year Level', 'Instructor'],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].code, 'BIT111L');
  assert.equal(rows[0].instructor, 'ROBLES JR. ROBERTO');
});

test('an orphan continuation row is reported, never invented as a course', () => {
  const headers = ['CODE', 'COURSE NO', 'FACULTY'];
  const { rows, orphans } = collapseFlatOfferingRows([
    { code: '', courseno: 'BIT111L-OBaL', faculty: 'ROBLES JR. ROBERTO' },
  ], headers);
  assert.deepEqual(rows, []);
  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].reason, 'no-parent');
  assert.equal(orphans[0].row, 2);
});
