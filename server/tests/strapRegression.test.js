/**
 * Regression: the STRAP "TEACHING ASSIGNMENT" export must parse exactly as it
 * did before SUBJECT OFFERINGS support was added.
 *
 * The matrix below is the shape documented in teachingAssignmentParser.js —
 * title rows, a "#### - NAME" faculty header, a per-block column header, course
 * rows keyed by a numeric Code, and continuation rows that carry only an extra
 * schedule in column J. Driving the matrix-level parser directly keeps this test
 * independent of any .xls file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTeachingAssignmentMatrix,
  looksLikeTeachingAssignmentMatrix,
  looksLikeSubjectOfferingsMatrix,
  extractProgramAssignments,
} from '../utils/teachingAssignmentParser.js';
import { programCoursePrefixes, programKeyFromPrefixes } from '../utils/courseCodeRules.js';

const HEADER = ['', 'Code', 'Course No', 'Course Description', 'Units', '', '', '', '', 'Schedule', 'Room'];

const MATRIX = [
  ['SCHOOL OF COMPUTER AND INFORMATION SCIENCES'],
  ['TEACHING ASSIGNMENT (AS OF Jul 15 2026)'],
  ['1st Sem S/Y 2026-2027'],
  ['0675 - ALEGRE AMY A.', 'Category: PART TIME B'],
  HEADER,
  ['', 3152, 'LIS214L-P7a', 'Organization of Information Resources I', 3, '', '', '', '', 'F 05:30PM-08:30PM', 'JH-35A'],
  // Continuation: a split class, schedule only.
  ['', '', '', '', '', '', '', '', '', 'S 08:00AM-11:00AM', 'JH-35A'],
  [''],
  ['0680 - REQUINTA LOURDES B.', 'Category: FULL TIME'],
  HEADER,
  // The SAME offering under a second faculty block — co-teaching.
  ['', 3152, 'LIS214L-P7a', 'Organization of Information Resources I', 3, '', '', '', '', 'TTH 05:30PM-07:00PM', 'LIBMEZB'],
  ['', 3037, 'LIS111L-P7a', 'Introduction to Library and Information Science', 3, '', '', '', '', 'M 05:30PM-08:30PM', 'LIBMEZB'],
];

test('STRAP is still detected, and is not read as SUBJECT OFFERINGS', () => {
  assert.equal(looksLikeTeachingAssignmentMatrix(MATRIX), true);
  assert.equal(looksLikeSubjectOfferingsMatrix(MATRIX), false);
});

test('STRAP parses to the same intermediate shape as before', () => {
  const parsed = parseTeachingAssignmentMatrix(MATRIX);

  assert.equal(parsed.term, '1st Sem S/Y 2026-2027');
  assert.deepEqual(parsed.faculty, ['ALEGRE AMY A.', 'REQUINTA LOURDES B.']);
  assert.deepEqual(parsed.orphans, []);

  // Schedules stay plain strings here: this export draws no lecture/lab
  // distinction, so there is none to record.
  assert.deepEqual(parsed.offerings, [
    {
      code: '3152',
      courseNo: 'LIS214L-P7a',
      baseCode: 'LIS214L',
      section: 'P7a',
      title: 'Organization of Information Resources I',
      units: '3',
      schedules: ['F 05:30PM-08:30PM', 'S 08:00AM-11:00AM', 'TTH 05:30PM-07:00PM'],
      facultyNames: ['ALEGRE AMY A.', 'REQUINTA LOURDES B.'],
    },
    {
      code: '3037',
      courseNo: 'LIS111L-P7a',
      baseCode: 'LIS111L',
      section: 'P7a',
      title: 'Introduction to Library and Information Science',
      units: '3',
      schedules: ['M 05:30PM-08:30PM'],
      facultyNames: ['REQUINTA LOURDES B.'],
    },
  ]);
});

test('STRAP extraction still yields the documented per-course shape', () => {
  const parsed = parseTeachingAssignmentMatrix(MATRIX);
  const prefixes = programCoursePrefixes('BLIS');
  const rows = extractProgramAssignments(parsed, prefixes, {
    programKey: programKeyFromPrefixes(prefixes),
  });

  // The five keys the upload consumes, unchanged.
  const documented = rows.map((r) => ({
    course_code: r.course_code,
    course_name: r.course_name,
    contributor_names: r.contributor_names,
    year_level: r.year_level,
    sections: r.sections,
  }));

  assert.deepEqual(documented, [
    {
      course_code: 'LIS214L',
      course_name: 'Organization of Information Resources I',
      contributor_names: ['ALEGRE AMY A.', 'REQUINTA LOURDES B.'],
      year_level: 'SECOND YEAR',
      sections: ['P7a'],
    },
    {
      course_code: 'LIS111L',
      course_name: 'Introduction to Library and Information Science',
      contributor_names: ['REQUINTA LOURDES B.'],
      year_level: 'FIRST YEAR',
      sections: ['P7a'],
    },
  ]);

  // Lead faculty is never invented from a block — that stays the Program
  // Head's call, in the system.
  assert.equal(rows.some((r) => 'faculty_name' in r || 'lead' in r), false);
});

test('another program gets none of these courses', () => {
  const parsed = parseTeachingAssignmentMatrix(MATRIX);
  const prefixes = programCoursePrefixes('BSIT');
  const rows = extractProgramAssignments(parsed, prefixes, {
    programKey: programKeyFromPrefixes(prefixes),
  });
  assert.deepEqual(rows, []);
});
