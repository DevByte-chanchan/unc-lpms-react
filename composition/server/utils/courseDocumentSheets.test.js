'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const xlsx = require('xlsx');
const { parseCourseSheet, templateBook } = require('./courseDocumentSheets');

const book = (rows) => {
    const b = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(b, xlsx.utils.aoa_to_sheet(rows), 'Sheet1');
    return xlsx.write(b, { type: 'buffer', bookType: 'xlsx' });
};

test('the CO-PO template reads back as the generated table shape', () => {
    const parsed = parseCourseSheet('co-po', templateBook('co-po'));
    assert.deepEqual(parsed, { cos: [{ description: 'CO1: Explain the core concepts of the course.', poMappings: ['I', 'E', '', 'D', ''] }] });
});

test('CO-PO: a title row above the header, lower-case marks, and an unknown mark ignored', () => {
    const parsed = parseCourseSheet('co-po', book([
        ['IT 101 CO-PO alignment'],
        ['CO', 'Course outcome', 'PO1', 'PO 2', 'PO3'],
        ['CO1', 'Write programs', 'i', 'x', 'Demonstrative'],
    ]));
    assert.deepEqual(parsed.cos, [{ description: 'Write programs', poMappings: ['I', '', 'D'] }]);
});

test('the COAEP template reads back, a blank statement continuing the outcome above', () => {
    const parsed = parseCourseSheet('coaep', templateBook('coaep'));
    assert.equal(parsed.cos.length, 1);
    assert.deepEqual(parsed.cos[0].ilos.map(i => i.outcome), ['ILO1: Describe …', 'ILO2: Apply …']);
    assert.deepEqual(parsed.cos[0].ilos[0].assessments, [{ name: 'Quiz' }, { name: 'Laboratory exercise' }]);
    assert.equal(parsed.cos[0].ilos[1].performanceTarget, '70% of the students get at least 70%');
});

test('a sheet in another layout, or not a spreadsheet, is refused with a reason', () => {
    assert.match(parseCourseSheet('co-po', book([['Name', 'Grade'], ['A', 1]])).error, /template/);
    assert.match(parseCourseSheet('coaep', book([['Name', 'Grade'], ['A', 1]])).error, /template/);
    assert.ok(parseCourseSheet('coaep', Buffer.from('not a spreadsheet at all')).error);
});
