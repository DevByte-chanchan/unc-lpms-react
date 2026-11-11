'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { buildCoaepWorkbook } = require('./coaepWorkbook');
const { parseCourseSheet } = require('./courseDocumentSheets');

const record = {
    header: { course: 'BIT213L - Object-Oriented Programming', facultyName: 'NORTON, MONICA', schoolYear: '2026-2027', semester: '1st' },
    cos: [
        { statement: 'CO1: Apply OOP principles.', ilos: [
            { outcome: 'ILO1: Explain classes.', assessments: [{ name: 'Quiz' }, { name: 'Lab exercise' }], performanceTarget: '' },
            { outcome: 'ILO2: Write classes.', assessments: [{ name: 'Project' }], performanceTarget: '70% of students get 60%' },
        ] },
        { statement: 'CO2: Use interfaces.', ilos: [] },
    ],
    performanceTarget: 'At least 70% of students',
    preparedBy: 'NORTON, MONICA', approvedBy: 'DANILA, JUNAR', approved: false, docControlNo: 'UNC-FM-VPAA-02',
};

const open = async (bytes) => {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(bytes);
    return book.getWorksheet('COAEP');
};
const rowWith = (ws, text) => {
    let found = null;
    ws.eachRow((row, n) => { if (!found && row.values.some(v => String(v?.richText ? v.richText.map(t => t.text).join('') : v ?? '').includes(text))) found = n; });
    return found;
};

test('the COAEP sheet: form header, draft mark, one row per ILO with the CO merged down, bordered', async () => {
    const ws = await open(await buildCoaepWorkbook(record));
    assert.ok(rowWith(ws, 'COURSE ASSESSMENT & EVALUATION PLAN'));
    assert.ok(rowWith(ws, 'DRAFT – NOT APPROVED'), 'a plan not fully approved is marked draft');
    const ilo1 = rowWith(ws, 'ILO1: Explain classes.');
    assert.equal(ws.getCell(`B${ilo1}`).value, 'CO1: Apply OOP principles.');
    assert.equal(ws.getCell(`B${ilo1 + 1}`).master.address, `B${ilo1}`, 'the CO statement spans its two ILO rows');
    assert.equal(ws.getCell(`D${ilo1}`).value, '• Quiz\n• Lab exercise');
    assert.equal(ws.getCell(`E${ilo1}`).value, 'At least 70% of students', 'an ILO without a target uses the plan target');
    assert.equal(ws.getCell(`E${ilo1 + 1}`).value, '70% of students get 60%');
    assert.equal(ws.getCell(`C${ilo1}`).border.top.style, 'thin');
    assert.equal(ws.getCell(`A${ilo1 + 2}`).value, 2, 'a CO without ILOs still gets its row');
});

test('an approved plan has no draft mark', async () => {
    const ws = await open(await buildCoaepWorkbook({ ...record, approved: true }));
    assert.equal(rowWith(ws, 'DRAFT'), null);
});

test('the exported sheet reads back through the COAEP importer', async () => {
    const parsed = parseCourseSheet('coaep', await buildCoaepWorkbook(record));
    assert.equal(parsed.error, undefined);
    assert.deepEqual(parsed.cos.map(co => co.statement), ['CO1: Apply OOP principles.', 'CO2: Use interfaces.']);
    assert.deepEqual(parsed.cos[0].ilos.map(i => i.outcome), ['ILO1: Explain classes.', 'ILO2: Write classes.']);
});
