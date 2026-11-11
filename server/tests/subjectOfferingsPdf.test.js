/**
 * The registrar's SUBJECT OFFERINGS as a PDF must read exactly like the
 * spreadsheet it came from.
 *
 *   CS_26271-Course-Offerings.pdf  the real .xls fixture printed to PDF
 *                                  (landscape, fit to width, 5 pages)
 *   subject_offerings_wrapped.pdf  centred headers, a wrapped course title,
 *                                  the header repeated on every page, page numbers
 *   scanned_page.pdf               no text at all
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  readSubjectOfferingsPdf,
  parseSubjectOfferingsMatrix,
  parseSubjectOfferings,
  looksLikeSubjectOfferingsMatrix,
  extractProgramAssignments,
} from '../utils/teachingAssignmentParser.js';
import { PdfTableError } from '../utils/pdfTable.js';
import { programCoursePrefixes, programKeyFromPrefixes } from '../utils/courseCodeRules.js';

const fixture = (name) => fileURLToPath(new URL('./fixtures/' + name, import.meta.url));
const shape = (parsed) => parsed.offerings.map((o) => ({
  courseNo: o.courseNo, title: o.title, units: o.units, faculty: o.facultyNames,
  schedules: o.schedules.map((s) => [s.type, s.time, s.days, s.room, s.faculty].join('|')),
}));

test('the real export as a PDF reads the same as the .xls', async () => {
  const matrix = await readSubjectOfferingsPdf(fixture('CS_26271-Course-Offerings.pdf'));
  assert.ok(looksLikeSubjectOfferingsMatrix(matrix));
  const pdf = parseSubjectOfferingsMatrix(matrix);
  const xls = parseSubjectOfferings(fixture('CS_26271-Course-OFferings.xls'));
  assert.equal(pdf.term, xls.term);
  assert.equal(pdf.termSemester, xls.termSemester);
  assert.equal(pdf.orphans.length, 0);
  assert.deepEqual(shape(pdf), shape(xls));
});

test('the PDF gives the same Lead per course as the .xls', async () => {
  const pdf = parseSubjectOfferingsMatrix(await readSubjectOfferingsPdf(fixture('CS_26271-Course-Offerings.pdf')));
  const xls = parseSubjectOfferings(fixture('CS_26271-Course-OFferings.xls'));
  for (const code of ['BSIT', 'BSCS']) {
    const prefixes = programCoursePrefixes(code);
    const opts = { programKey: programKeyFromPrefixes(prefixes) };
    const pick = (p) => extractProgramAssignments(p, prefixes, opts).map((e) => [e.course_code, e.lead_name, e.other_names]);
    assert.deepEqual(pick(pdf), pick(xls), code);
  }
});

test('centred headers, wrapped titles and repeated headers', async () => {
  const parsed = parseSubjectOfferingsMatrix(await readSubjectOfferingsPdf(fixture('subject_offerings_wrapped.pdf')));
  assert.equal(parsed.term, 'Second Sem S/Y 2026-2027');
  assert.equal(parsed.orphans.length, 0);
  assert.equal(parsed.offerings.length, 39);             // 13 courses × 3 sections, 3 pages
  const ds = parsed.offerings.find((o) => o.courseNo === 'BIT123L-OBa');
  assert.equal(ds.title, 'Data Structures and Algorithms with an Extremely Long Course Title That Wraps');
  assert.equal(ds.units, 3);
  assert.deepEqual(ds.facultyNames, ['HAROLD T. LIM']);
  assert.equal(ds.schedules.length, 2);                   // the lab row folded in
  const ip = parsed.offerings.find((o) => o.courseNo === 'BIT122L-OBc');
  assert.deepEqual(ip.facultyNames, ['DENNIS IGNACIO', 'BOWEN HIGGINS']);
});

test('a scanned PDF is refused with a clear message', async () => {
  await assert.rejects(readSubjectOfferingsPdf(fixture('scanned_page.pdf')),
    (err) => err instanceof PdfTableError && err.code === 'scanned' && /scanned/.test(err.message));
});

test('the Program of Study PDF is not mistaken for Subject Offerings', async () => {
  const matrix = await readSubjectOfferingsPdf(fixture('programOfStudy/Rev-2-_BSIT-_-PROGRAM-OF-STUDY-1.pdf'));
  assert.equal(looksLikeSubjectOfferingsMatrix(matrix), false);
});
