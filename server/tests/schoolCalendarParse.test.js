/**
 * Reading a school calendar's rows into term dates (utils/schoolCalendarParse.js).
 * Pure: no database, no files. The rows are the sample picture's, typed by hand
 * (fixtures/schoolCalendar2026Rows.js).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTranscript, fieldsFor, parseDateText, parseRange, yearFor, fieldOfEvent,
  monthOf, blockFromLines, splitRowLine,
} from '../utils/schoolCalendarParse.js';
import { CALENDAR_2026_ROWS, EXPECTED_2026 } from './fixtures/schoolCalendar2026Rows.js';

const parsed = parseTranscript(CALENDAR_2026_ROWS);
const clone = (o) => JSON.parse(JSON.stringify(o));

test('1. every value of the sample, for 1st, 2nd and Summer', () => {
  assert.equal(parsed.schoolYear, '2026-2027');
  assert.deepEqual(parsed.blocks.map((b) => b.key), ['1st', '2nd', 'Summer']);
  for (const sem of ['1', '2', 'Summer']) {
    const r = fieldsFor(parsed, sem, { schoolYear: '2026-2027' });
    assert.deepEqual(r.fields, EXPECTED_2026[sem], 'semester ' + sem);
    assert.deepEqual(r.warnings, [], 'semester ' + sem);
  }
  const first = fieldsFor(parsed, '1', { schoolYear: '2026-2027' });
  assert.equal(first.sources.midterm_exam.text, 'Sept 25-29 · Midterm Examination');
  assert.equal(first.sources.midterm_exam.source, 'pdf');
  assert.equal(first.sources.start_date.text, 'July 20 to Nov 25, 2026 (start)');
  // The other rows are kept as events, in date order; field rows are not repeated.
  const ev = first.events.map((e) => e.event);
  assert.ok(ev.includes('Peñafrancia Fiesta'));
  assert.ok(ev.includes('Last day of classes'));
  assert.ok(!ev.includes('Midterm Examination'));
  assert.equal(first.events.find((e) => e.event === 'Start of Enrollment').date, '2026-04-15');
  assert.equal(first.events.find((e) => e.event === 'Faculty Retooling').date, null);
  assert.deepEqual(first.blocksFound, ['1st', '2nd', 'Summer']);
});

test('2. years come from the range line', () => {
  const second = parsed.blocks.find((b) => b.key === '2nd');
  const row = (dateText) => second.rows.find((r) => r.dateText === dateText).dates;
  assert.equal(row('Jan 15-19').first, '2027-01-15');
  assert.equal(row('Dec 9').first, '2026-12-09');
  assert.equal(row('Nov 15').first, '2026-11-15'); // enrollment, before the range
  assert.equal(row('May 4').first, '2027-05-04'); // deadline, after the range
  assert.deepEqual(row('Apr 26-May 3'), { first: '2027-04-26', last: '2027-05-03' });
  const range = parseRange('Dec 9, 2026 to Apr 24, 2027');
  assert.deepEqual([range.start, range.end], ['2026-12-09', '2027-04-24']);
  assert.equal(yearFor(1, range), 2027);
  assert.equal(yearFor(12, range), 2026);
  assert.deepEqual([parseRange('July 20 to Nov 25, 2026').start, parseRange('May 4 to Jun 14, 2027').end], ['2026-07-20', '2027-06-14']);
});

test('3. lists and ranges', () => {
  const first = (t) => parseDateText(t).spans[0].start;
  assert.deepEqual(first('Aug 20, 22, 24-25'), { m: 8, d: 20 });
  assert.equal(parseDateText('Aug 20, 22, 24-25').spans.length, 3);
  assert.deepEqual(first('Jun 10-11,14'), { m: 6, d: 10 });
  assert.equal(parseDateText('Jun 10-11,14').spans.length, 2);
  assert.deepEqual(parseDateText('Nov 26-Dec 7').spans, [{ start: { m: 11, d: 26 }, end: { m: 12, d: 7 } }]);
  assert.deepEqual(parseDateText('Sept 11, 16-19, 21').spans.map((s) => [s.start.d, s.end.d]), [[11, 11], [16, 19], [21, 21]]);
  assert.deepEqual(parseDateText('May to Jun'), { spans: [], monthsOnly: true });
  assert.equal(monthOf('Sept'), 9);
  assert.equal(monthOf('Sep'), 9);
  assert.equal(monthOf('April'), 4);
  const first1 = parsed.blocks[0];
  assert.deepEqual(first1.rows.find((r) => r.dateText === 'Nov 26-Dec 7').dates, { first: '2026-11-26', last: '2026-12-07' });
});

test('4. two finals: Undergrad by default, Graduating offered', () => {
  const r = fieldsFor(parsed, '2', { schoolYear: '2026-2027' });
  assert.equal(r.fields.final_exam, '2027-04-21');
  assert.match(r.sources.final_exam.text, /Undergrad/);
  const alts = r.alternatives.final_exam;
  assert.deepEqual(alts.map((a) => [a.label, a.value]), [['Undergrad', '2027-04-21'], ['Graduating', '2027-04-12']]);
  // The order no longer matters: Undergrad listed first in the file still wins.
  const swapped = clone(CALENDAR_2026_ROWS);
  const rows = swapped.blocks[1].rows;
  const g = rows.findIndex((x) => /Graduating\)$/.test(x.event) && /Final/.test(x.event));
  rows.push(rows.splice(g, 1)[0]);
  assert.equal(fieldsFor(parseTranscript(swapped), '2').fields.final_exam, '2027-04-21');
});

test('5. Summer: no prelim or semi-final, and no warning about it', () => {
  const r = fieldsFor(parsed, 'Summer', { schoolYear: '2026-2027' });
  assert.equal(r.fields.prelim_exam, '');
  assert.equal(r.fields.semifinal_exam, '');
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.optionalMissing, ['prelim_exam', 'semifinal_exam']);
});

test('6. wording variants', () => {
  assert.equal(fieldOfEvent('Opening of Classes'), 'classes_start');
  assert.equal(fieldOfEvent('Classes begin'), 'classes_start');
  assert.equal(fieldOfEvent('Preliminary Examinations'), 'prelim_exam');
  assert.equal(fieldOfEvent('PRELIMS'), 'prelim_exam');
  assert.equal(fieldOfEvent('Midterms'), 'midterm_exam');
  assert.equal(fieldOfEvent('Semifinals'), 'semifinal_exam');
  assert.equal(fieldOfEvent('Semi Final Exam'), 'semifinal_exam');
  assert.equal(fieldOfEvent('Finals'), 'final_exam');
  assert.equal(fieldOfEvent('Final Exams'), 'final_exam');
  // Not exams:
  assert.equal(fieldOfEvent('Deadline of Submission of Midterm Grade'), null);
  assert.equal(fieldOfEvent('Deadline of Submission Final Grades'), null);
  assert.equal(fieldOfEvent('Semi-Final Examination'), 'semifinal_exam');

  const variant = clone(CALENDAR_2026_ROWS);
  const rows = variant.blocks[0].rows;
  const rename = (from, to) => { rows.find((r) => r.event === from).event = to; };
  rename('First day of Classes', 'Opening of Classes');
  rename('Prelim Examination', 'Preliminary Examinations');
  rename('Semi-Final Examination', 'Semifinals');
  rename('Final Examination', 'Finals');
  assert.deepEqual(fieldsFor(parseTranscript(variant), '1').fields, EXPECTED_2026['1']);
});

test('7. a calendar for another school year is flagged', () => {
  const old = clone(CALENDAR_2026_ROWS);
  old.schoolYear = 'ACADEMIC YEAR 2025-2026';
  old.blocks[0].title = 'FIRST SEMESTER SY 2025-2026';
  old.blocks[0].rangeText = 'July 21 to Nov 26, 2025';
  const r = fieldsFor(parseTranscript(old), '1', { schoolYear: '2026-2027' });
  assert.ok(r.warnings.includes("This calendar is for 2025-2026; you're creating 2026-2027."), JSON.stringify(r.warnings));
  assert.equal(r.fields.midterm_exam, '2025-09-25');
  const e = fieldsFor(parseTranscript(old), '1', { schoolYear: '2026-2027', purpose: 'edit' });
  assert.ok(e.warnings.some((w) => /you're editing 2026-2027/.test(w)));
});

test('a missing block, a missing range line, and the order check', () => {
  const onlyFirst = { blocks: [CALENDAR_2026_ROWS.blocks[0]] };
  const r = fieldsFor(parseTranscript(onlyFirst), '2');
  assert.equal(r.block, null);
  assert.deepEqual(r.blocksFound, ['1st']);

  const noRange = clone(CALENDAR_2026_ROWS);
  noRange.blocks[0].rangeText = '';
  const n = fieldsFor(parseTranscript(noRange), '1', { schoolYear: '2026-2027' });
  assert.equal(n.fields.start_date, '2026-07-20'); // start of classes
  assert.equal(n.fields.end_date, '2026-11-25'); // last day of classes
  assert.equal(n.fields.prelim_exam, '2026-08-20');

  const bad = clone(CALENDAR_2026_ROWS);
  bad.blocks[0].rows.find((x) => x.event === 'Midterm Examination').dateText = 'Aug 1';
  const b = fieldsFor(parseTranscript(bad), '1');
  assert.ok(b.warnings.includes('Midterm exam must be on or after Prelim exam.'), JSON.stringify(b.warnings));
});

test('OCR mode: a letter off is tolerated, an ambiguous word is not', () => {
  assert.equal(monthOf('Sopt', { lenient: true }), 9);
  assert.equal(monthOf('Fob', { lenient: true }), 2);
  assert.equal(monthOf('0ct', { lenient: true }), 10);
  assert.equal(monthOf('Mary', { lenient: true }), 0); // May or Mar?
  assert.equal(monthOf('Sopt'), 0);
  assert.equal(fieldOfEvent('Mdterm Examinason', { lenient: true }), 'midterm_exam');
  assert.equal(fieldOfEvent('Semi-Final Exarnination', { lenient: true }), 'semifinal_exam');
  assert.equal(fieldOfEvent('Deadire of Submession of Mdlerm Grade', { lenient: true }), null);
});

test('plain text lines (a text PDF column) → a block', () => {
  const b = blockFromLines([
    'FIRST SEMESTER SY 2026-2027',
    'July 20 to Nov 25, 2026',
    'Apr 15   Start of Enrollment',
    'May to Jun   Faculty Retooling',
    'Aug 20, 22, 24-25 Prelim Examination',
    'Sept 25-29 Midterm Examination',
  ]);
  assert.equal(b.title, 'FIRST SEMESTER SY 2026-2027');
  assert.equal(b.rangeText, 'July 20 to Nov 25, 2026');
  assert.deepEqual(b.rows, [
    { dateText: 'Apr 15', event: 'Start of Enrollment' },
    { dateText: 'May to Jun', event: 'Faculty Retooling' },
    { dateText: 'Aug 20, 22, 24-25', event: 'Prelim Examination' },
    { dateText: 'Sept 25-29', event: 'Midterm Examination' },
  ]);
  assert.deepEqual(splitRowLine('May 22-25 Midterm Examination'), { dateText: 'May 22-25', event: 'Midterm Examination' });
});
