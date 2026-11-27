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

const load = async (bytes) => { const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes); return book; };
const open = async (bytes) => (await load(bytes)).getWorksheet('COAEP');
// More than the official form's 4 COs, so it gets the drawn sheet.
const big = { ...record, cos: [...record.cos, ...[3, 4, 5].map(n => ({ statement: `CO${n}: More.`, ilos: [] }))] };
const rowWith = (ws, text) => {
    let found = null;
    ws.eachRow((row, n) => { if (!found && row.values.some(v => String(v?.richText ? v.richText.map(t => t.text).join('') : v ?? '').includes(text))) found = n; });
    return found;
};

test('a plan that fits the official form is written into the university workbook, every sheet kept', async () => {
    const book = await load(await buildCoaepWorkbook(record));
    assert.deepEqual(book.worksheets.map(w => w.name), ['1_PO Assess Plan Template', 'Course AssessPlan', '3_CO Assess Data', '4_Course Assess Report Template', '5_PO Assess Report Template']);
    const plan = book.getWorksheet('Course AssessPlan');
    assert.equal(plan.getCell('D7').value, 'NORTON, MONICA');
    assert.equal(plan.getCell('D8').value, 'BIT213L - Object-Oriented Programming');
    assert.equal(plan.getCell('G7').value, '2026-2027');
    assert.equal(plan.getCell('C11').value, 'CO1: Apply OOP principles.');
    assert.equal(plan.getCell('E12').value, 'ILO2: Write classes.');
    assert.equal(plan.getCell('F11').value, 'Quiz\nLab exercise');
    assert.equal(plan.getCell('G11').value, 'At least 70% of students', 'an ILO without a target uses the plan target');
    assert.equal(plan.getCell('G12').value, '70% of students get 60%');
    assert.equal(plan.getCell('E13').value, null, 'an unused ILO row is blank');
    assert.equal(plan.getCell('B14').value, 2);
    assert.equal(plan.getCell('B17').value, null, 'CO 3 and 4 rows are blank');
    assert.equal(plan.getCell('G17').value, null);
    assert.match(plan.getCell('B6').value, /DRAFT – NOT APPROVED/);
    assert.equal(plan.getCell('F25').value, 'Approved by:   DANILA, JUNAR', 'the sample approver is replaced');
    assert.equal(book.getWorksheet('4_Course Assess Report Template').getCell('G25').value, 'DANILA, JUNAR');
    assert.equal(book.getWorksheet('4_Course Assess Report Template').getCell('D12').formula, "'Course AssessPlan'!E12", 'the report reads the plan by formula');
    assert.equal(plan.getImages().length, 1, 'the logo is kept');
});

test('the drawn COAEP sheet (a plan larger than the form): header, draft mark, one row per ILO with the CO merged down', async () => {
    const ws = await open(await buildCoaepWorkbook(big));
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
    const ws = await open(await buildCoaepWorkbook({ ...big, approved: true }));
    assert.equal(rowWith(ws, 'DRAFT'), null);
    const plan = (await load(await buildCoaepWorkbook({ ...record, approved: true }))).getWorksheet('Course AssessPlan');
    assert.equal(plan.getCell('B6').value, null);
});

test('both exports read back through the COAEP importer', async () => {
    const drawn = await parseCourseSheet('coaep', await buildCoaepWorkbook(big));
    assert.equal(drawn.cos.length, 5);
    const parsed = await parseCourseSheet('coaep', await buildCoaepWorkbook(record));
    assert.equal(parsed.error, undefined);
    assert.deepEqual(parsed.cos.map(co => co.statement), ['CO1: Apply OOP principles.', 'CO2: Use interfaces.']);
    assert.deepEqual(parsed.cos[0].ilos.map(i => i.outcome), ['ILO1: Explain classes.', 'ILO2: Write classes.']);
});
