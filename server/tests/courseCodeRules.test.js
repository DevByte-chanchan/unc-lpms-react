/**
 * Rules 1–3: reading a program, a year, a semester and a section out of a
 * course code. No I/O, no fixture — these are the primitives everything else
 * in the extraction is built on.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitCourseNo,
  stripLabSuffix,
  normalizeCourseNo,
  looksLikeSection,
  codeDigits,
  yearLevelFromCode,
  semesterFromCode,
  programFromSection,
  programCoursePrefixes,
  programKeyFromPrefixes,
  isOwnedPrefix,
  matchesPrefixes,
} from '../utils/courseCodeRules.js';

test('rule 1 — a prefix names exactly one program', () => {
  assert.deepEqual(programCoursePrefixes('BSIT').sort(), ['BIT', 'BSIT']);
  assert.deepEqual(programCoursePrefixes('BSCS').sort(), ['BCS', 'BSCS']);
  assert.deepEqual(programCoursePrefixes('ACT'), ['ACT']);
  assert.ok(programCoursePrefixes('BLIS').includes('LIS'));

  assert.equal(programKeyFromPrefixes(['BSIT', 'BIT']), 'BSIT');
  assert.equal(programKeyFromPrefixes(['BSCS', 'BCS']), 'BSCS');
  assert.equal(programKeyFromPrefixes(['ACT']), 'ACT');
  assert.equal(programKeyFromPrefixes(['BLIS', 'LIS']), 'LIS');

  // ACT is its own program — never folded into IT or CS.
  assert.ok(matchesPrefixes('ACT111L', ['ACT']));
  assert.ok(!matchesPrefixes('ACT111L', ['BSIT', 'BIT']));
  assert.ok(!matchesPrefixes('BCS111L', ['BSIT', 'BIT']));

  // Owned vs shared.
  for (const owned of ['BIT111L', 'BCS111L', 'ACT111L', 'LIS214L']) {
    assert.ok(isOwnedPrefix(owned), owned + ' should be owned');
  }
  for (const shared of ['MATH311L', 'GEE-LITE']) {
    assert.ok(!isOwnedPrefix(shared), shared + ' should be shared');
  }
});

test('rule 2 — the three digits are [year][semester][subject #]', () => {
  assert.deepEqual(codeDigits('BIT111L'), { year: 1, semester: 1, subject: 1 });
  assert.deepEqual(codeDigits('ACT121L'), { year: 1, semester: 2, subject: 1 });
  assert.deepEqual(codeDigits('BIT213L'), { year: 2, semester: 1, subject: 3 });
  assert.deepEqual(codeDigits('BIT314L'), { year: 3, semester: 1, subject: 4 });
  // A letter prefix of any length reads the same way.
  assert.deepEqual(codeDigits('MATH311L'), { year: 3, semester: 1, subject: 1 });
  // No digits at all.
  assert.deepEqual(codeDigits('GEE-LITE'), { year: null, semester: null, subject: null });

  assert.equal(yearLevelFromCode('BIT111L'), 'FIRST YEAR');
  assert.equal(yearLevelFromCode('BIT213L'), 'SECOND YEAR');
  assert.equal(yearLevelFromCode('BIT314L'), 'THIRD YEAR');
  assert.equal(yearLevelFromCode('BIT412L'), 'FOURTH YEAR');
  assert.equal(yearLevelFromCode('GEE-LITE'), '');

  assert.equal(semesterFromCode('BIT111L'), 1);
  assert.equal(semesterFromCode('ACT121L'), 2);
  assert.equal(semesterFromCode('BIT314L'), 1);
  assert.equal(semesterFromCode('GEE-LITE'), null);
});

test('rule 3 — the section names the program too', () => {
  assert.equal(programFromSection('OAa'), 'ACT');
  assert.equal(programFromSection('OBb'), 'BSIT');
  assert.equal(programFromSection('OCa'), 'BSCS');
  assert.equal(programFromSection('P7a'), 'LIS');
  // The lab form resolves to the same program as its block.
  assert.equal(programFromSection('OBaL'), 'BSIT');
  assert.equal(programFromSection(''), null);
  assert.equal(programFromSection('ZZz'), null);
});

test('rule 3 — a trailing L on the section is a lab, not a new section', () => {
  assert.deepEqual(stripLabSuffix('OBaL'), { section: 'OBa', isLab: true });
  assert.deepEqual(stripLabSuffix('OBa'),  { section: 'OBa', isLab: false });
  assert.deepEqual(stripLabSuffix('P7aL'), { section: 'P7a', isLab: true });
  // One key for a block and its lab, so they group together.
  assert.equal(normalizeCourseNo('BIT111L-OBaL'), normalizeCourseNo('BIT111L-OBa'));
  assert.equal(normalizeCourseNo('BIT111L-OBa'), 'BIT111L-OBA');
});

test('splitting a course no keeps hyphenated codes intact', () => {
  assert.deepEqual(splitCourseNo('BIT314L-OBb'),  { baseCode: 'BIT314L',  section: 'OBb' });
  assert.deepEqual(splitCourseNo('LIS214L-P7a'),  { baseCode: 'LIS214L',  section: 'P7a' });
  // The course code itself contains a hyphen — the section is still the tail.
  assert.deepEqual(splitCourseNo('GEE-LITE-OCa'), { baseCode: 'GEE-LITE', section: 'OCa' });
  assert.deepEqual(splitCourseNo('BIT111L-OBaL'), { baseCode: 'BIT111L',  section: 'OBaL' });
  // ...but a tail that is NOT section-shaped stays part of the code.
  assert.deepEqual(splitCourseNo('GEE-LITE'), { baseCode: 'GEE-LITE', section: '' });
  assert.deepEqual(splitCourseNo('GE-101'),   { baseCode: 'GE-101',   section: '' });
  assert.deepEqual(splitCourseNo('BIT111L'),  { baseCode: 'BIT111L',  section: '' });

  assert.ok(looksLikeSection('OBa'));
  assert.ok(looksLikeSection('P7a'));
  assert.ok(looksLikeSection('OBaL'));
  assert.ok(!looksLikeSection('LITE'));
  assert.ok(!looksLikeSection('101'));
});
