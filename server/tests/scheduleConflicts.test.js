/**
 * Schedule conflicts (Compare with official offerings): time ranges, day codes
 * with the TH/T and SU/S traps, overlap vs back-to-back, different days, and
 * combined classes (same time, same room) that are not conflicts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeRange, parseDays, formatTimeRange, findScheduleConflicts } from '../utils/scheduleConflicts.js';

test('parseTimeRange: registrar formats', () => {
  assert.deepEqual(parseTimeRange('05:30PM-08:30PM'), { start: 17 * 60 + 30, end: 20 * 60 + 30 });
  assert.deepEqual(parseTimeRange('07:30AM-10:30AM'), { start: 450, end: 630 });
  assert.deepEqual(parseTimeRange('11:00AM-01:00PM'), { start: 660, end: 780 });
  assert.deepEqual(parseTimeRange('12:00PM-01:30PM'), { start: 720, end: 810 });
  assert.deepEqual(parseTimeRange('5:30-8:30PM'), { start: 1050, end: 1230 }, 'start takes the end\'s PM');
  assert.deepEqual(parseTimeRange('10:30-1:00PM'), { start: 630, end: 780 }, 'unless that puts it after the end');
  assert.deepEqual(parseTimeRange('7:30 AM – 9:00 AM'), { start: 450, end: 540 });
  assert.equal(parseTimeRange('TBA'), null);
  assert.equal(parseTimeRange(''), null);
  assert.equal(parseTimeRange('08:30PM-05:30PM'), null, 'ends before it starts');
});

test('formatTimeRange', () => {
  assert.equal(formatTimeRange({ start: 1110, end: 1230 }), '6:30–8:30 PM');
  assert.equal(formatTimeRange({ start: 630, end: 780 }), '10:30 AM–1:00 PM');
});

test('parseDays: TH before T, SU before S', () => {
  assert.deepEqual(parseDays('M'), ['M']);
  assert.deepEqual(parseDays('TH'), ['TH'], 'Thursday, not Tuesday + H');
  assert.deepEqual(parseDays('TTH'), ['T', 'TH']);
  assert.deepEqual(parseDays('MW'), ['M', 'W']);
  assert.deepEqual(parseDays('MWF'), ['M', 'W', 'F']);
  assert.deepEqual(parseDays('SU'), ['SU']);
  assert.deepEqual(parseDays('S'), ['S']);
  assert.deepEqual(parseDays('th'), ['TH']);
  assert.equal(parseDays('XYZ'), null);
  assert.equal(parseDays(''), null);
});

const off = (baseCode, section, schedules, facultyNames = []) => ({
  code: baseCode + '-' + section, courseNo: baseCode + '-' + section, baseCode, section, schedules, facultyNames,
});
const sched = (time, days, faculty, room = '') => ({ type: 'lecture', time, days, faculty, room });

test('findScheduleConflicts: overlap on a shared day', () => {
  const offerings = [
    off('BIT123L', 'OBa', [sched('06:30PM-08:30PM', 'W', 'LIM, HAROLD T.')]),
    off('BIT222L', 'OBa', [sched('06:00PM-07:30PM', 'MW', 'Harold T. Lim')]),
  ];
  const nameOf = () => 'Harold T. Lim';
  const out = findScheduleConflicts(offerings, { nameOf });
  assert.equal(out.length, 1);
  assert.equal(out[0].text, 'Harold T. Lim — BIT123L (W 6:30–8:30 PM) overlaps BIT222L (W 6:00–7:30 PM)');
});

test('findScheduleConflicts: back-to-back is not a conflict', () => {
  const offerings = [
    off('BIT123L', 'OBa', [sched('05:30PM-07:30PM', 'M', 'Harold T. Lim')]),
    off('BIT222L', 'OBa', [sched('07:30PM-09:00PM', 'M', 'Harold T. Lim')]),
  ];
  assert.deepEqual(findScheduleConflicts(offerings), []);
});

test('findScheduleConflicts: same time, different days', () => {
  const offerings = [
    off('BIT123L', 'OBa', [sched('05:30PM-08:30PM', 'M', 'Harold T. Lim')]),
    off('BIT222L', 'OBa', [sched('05:30PM-08:30PM', 'W', 'Harold T. Lim')]),
  ];
  assert.deepEqual(findScheduleConflicts(offerings), []);
});

test('findScheduleConflicts: the TH / T trap', () => {
  // Tuesday vs Thursday: no conflict. Read wrongly ("TH" = T + H) it would be one.
  const offerings = [
    off('BIT123L', 'OBa', [sched('05:30PM-08:30PM', 'T', 'Harold T. Lim')]),
    off('BIT222L', 'OBa', [sched('05:30PM-08:30PM', 'TH', 'Harold T. Lim')]),
  ];
  assert.deepEqual(findScheduleConflicts(offerings), []);
  // TTH meets on Thursday too: that one is a conflict, on TH.
  const both = [
    off('BIT123L', 'OBa', [sched('05:30PM-08:30PM', 'TTH', 'Harold T. Lim')]),
    off('BIT222L', 'OBa', [sched('06:00PM-07:00PM', 'TH', 'Harold T. Lim')]),
  ];
  const out = findScheduleConflicts(both);
  assert.equal(out.length, 1);
  assert.equal(out[0].day, 'TH');
});

test('findScheduleConflicts: different people, combined classes, other programs', () => {
  // Different faculty: never a conflict.
  assert.deepEqual(findScheduleConflicts([
    off('BIT123L', 'OBa', [sched('05:30PM-08:30PM', 'M', 'Harold T. Lim')]),
    off('BIT222L', 'OBa', [sched('05:30PM-08:30PM', 'M', 'Ana Cruz')]),
  ]), []);
  // Same time and room: one combined class listed under two codes.
  assert.deepEqual(findScheduleConflicts([
    off('BIT123L', 'OBa', [sched('05:30PM-08:30PM', 'M', 'Harold T. Lim', 'CL 3')]),
    off('BCS123L', 'OBa', [sched('05:30PM-08:30PM', 'M', 'Harold T. Lim', 'CL  3')]),
  ]), []);
  // Sections of one course at the same time (merged blocks, separate virtual rooms).
  assert.deepEqual(findScheduleConflicts([
    off('BIT213L', 'OBa', [sched('06:30PM-08:30PM', 'W', 'Danny B. Casimero', 'VR1')]),
    off('BIT213L', 'OBb', [sched('06:30PM-08:30PM', 'W', 'Danny B. Casimero', 'VR2')]),
  ]), []);
  // ...but the same course at overlapping, not identical, times is reported.
  assert.equal(findScheduleConflicts([
    off('BIT213L', 'OBa', [sched('06:30PM-08:30PM', 'W', 'Danny B. Casimero', 'VR1')]),
    off('BIT213L', 'OBb', [sched('07:00PM-09:00PM', 'W', 'Danny B. Casimero', 'VR2')]),
  ])[0].text, 'Danny B. Casimero — BIT213L-OBa (W 6:30–8:30 PM) overlaps BIT213L-OBb (W 7:00–9:00 PM)');
  // Only conflicts touching the program being compared.
  const other = [
    off('BCS101', 'A', [sched('05:30PM-08:30PM', 'M', 'Harold T. Lim')]),
    off('BCS102', 'A', [sched('06:00PM-07:00PM', 'M', 'Harold T. Lim')]),
  ];
  assert.deepEqual(findScheduleConflicts(other, { relevant: (o) => o.baseCode.startsWith('BIT') }), []);
  // A row with no faculty name uses the offering's only teacher.
  const lab = [
    off('BIT123L', 'OBa', [sched('05:30PM-08:30PM', 'F', '')], ['Harold T. Lim']),
    off('BIT222L', 'OBa', [sched('07:00PM-09:00PM', 'F', 'Harold T. Lim')]),
  ];
  assert.equal(findScheduleConflicts(lab).length, 1);
});
