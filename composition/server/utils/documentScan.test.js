'use strict';

// Scanning Program Documents (utils/documentScan.js). The fixtures are the app's own export pages: a COAEP made as a
// text PDF, and pictures of the PO, CO-PO and COAEP tables (one of them tilted and saved as a JPEG, as a phone photo).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { scanDocument, frontPageCheck, linesOf, readPoPeo, readCoPo, fromAi, closeOcr, ScanError } = require('./documentScan');
const { bookFromData, parseCourseSheet } = require('./courseDocumentSheets');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', 'scan', name));
const noAi = { ai: null };
test.after(() => closeOcr());

const EXPECTED_PEOS = { 1: [1], 2: [1, 2], 7: [1, 2], 8: [1, 3], 10: [1, 3], 12: [1, 3], 13: [1, 2] };
const checkPoTable = (data) => {
    assert.equal(data.outcomes.length, 13, 'all 13 POs');
    assert.match(data.outcomes[0].text, /^Apply knowledge in computing, science, and mathematics/);
    assert.match(data.outcomes[5].text, /^Integrate IT-based solutions/);
    for (const [n, peos] of Object.entries(EXPECTED_PEOS)) assert.deepEqual(data.outcomes[n - 1].peos, peos, `PO${n} ticks`);
    assert.ok(data.outcomes.every(o => !/\b(EC|CL|ERC)\b/.test(o.text)), 'no column headings inside a statement');
};

test('a COAEP text PDF is read exactly: every CO, ILO, assessment and target', async () => {
    const { data, source } = await scanDocument(fixture('coaep.pdf'), 'coaep', noAi);
    assert.equal(source, 'pdf');
    assert.deepEqual(data.cos.map(c => c.ilos.length), [4, 3, 3, 3]);
    assert.match(data.cos[0].statement, /^Analyze integrative programming paradigms/);
    assert.equal(data.cos[0].ilos[0].assessments.length, 0, 'an empty cell ("—") is no assessment');
    assert.deepEqual(data.cos[2].ilos[1].assessments.map(a => a.name), ['Third-Party SDK & Webhook Integration Lab'], 'a wrapped name stays one assessment');
    assert.ok(data.cos.every(c => c.ilos.every(i => /^At least 90% of enrolled students/.test(i.performanceTarget))));
});

test('a picture of the PO table is read by OCR: statements and PO-PEO ticks', async () => {
    const { data, source, warnings } = await scanDocument(fixture('po-table.png'), 'po-peo', noAi);
    assert.equal(source, 'ocr');
    assert.ok(warnings.some(w => /check every tick before saving/.test(w)));
    checkPoTable(data);
});

test('a tilted JPEG photo of the same page is straightened first and reads the same', async () => {
    const { data } = await scanDocument(fixture('po-table-tilted.jpg'), 'po-peo', noAi);
    checkPoTable(data);
});

test('a picture of the CO-PO table: each CO with its I / E / D marks under the right PO', async () => {
    const { data } = await scanDocument(fixture('co-po.png'), 'co-po', noAi);
    assert.deepEqual(data.cos.map(c => c.description.slice(0, 4)), ['CO1:', 'CO2:', 'CO3:', 'CO4:']);
    assert.deepEqual(data.cos.map(c => c.poMappings.join(',')), [
        'I,E,,,D,,,,,', ',,E,D,,E,,,,', ',,,,D,,E,D,,', ',,,,,D,,,E,D',
    ]);
});

test('a picture of a COAEP page: the CO and its four ILOs, without the bullet glyphs OCR picks up', async () => {
    const { data } = await scanDocument(fixture('coaep-page1.png'), 'coaep', noAi);
    assert.equal(data.cos.length, 1);
    assert.equal(data.cos[0].ilos.length, 4);
    assert.deepEqual(data.cos[0].ilos.slice(1).map(i => i.assessments.map(a => a.name).join('; ')),
        ['Objective-Type Quiz', 'Polyglot Data Serialization Practicum', 'Cross-Runtime Interoperability Utility']);
    assert.ok(data.cos[0].ilos.every(i => !/[«»•+]/.test(i.outcome)));
});

test('the AI reader, when set, answers first; its answer is cleaned to what the import accepts', async () => {
    const ai = async (buf, mime, kind) => {
        assert.equal(mime, 'image/png');
        assert.equal(kind, 'po-peo');
        return { peos: [{ statement: ' First ' }, { statement: 'Second' }], outcomes: [{ text: 'PO one', peos: [1, 2, 7, 'x'], gas: [4, 9] }, { text: '' }] };
    };
    const { data, source } = await scanDocument(fixture('po-table.png'), 'po-peo', { ai });
    assert.equal(source, 'ai');
    assert.deepEqual(data, { peos: [{ statement: 'First', missionAligned: true }, { statement: 'Second', missionAligned: true }], outcomes: [{ text: 'PO one', peos: [1, 2], gas: [4] }] });
});

test('an AI reader that fails falls back to OCR and says so', async () => {
    const { source, warnings } = await scanDocument(fixture('co-po.png'), 'co-po', { ai: async () => { throw new Error('offline'); } });
    assert.equal(source, 'ocr');
    assert.ok(warnings.some(w => /could not be reached/.test(w)));
});

test('what is not a PDF or a picture, or is empty, is refused with a message', async () => {
    await assert.rejects(scanDocument(Buffer.from('hello there, not a file at all'), 'co-po', noAi), (e) => e instanceof ScanError && /PDF or a picture/.test(e.message));
    await assert.rejects(scanDocument(Buffer.alloc(0), 'co-po', noAi), /Choose a file/);
    await assert.rejects(scanDocument(fixture('co-po.png'), 'nope', noAi), /Unknown document/);
});

test('fromAi keeps CO-PO marks to I / E / D and COAEP assessments as names', () => {
    assert.deepEqual(fromAi('co-po', { cos: [{ description: 'CO1: x', poMappings: ['i', 'Z', 'E'] }, { description: 'CO2: y', poMappings: ['D'] }] }),
        { cos: [{ description: 'CO1: x', poMappings: ['I', '', 'E'] }, { description: 'CO2: y', poMappings: ['D', '', ''] }] });
    assert.deepEqual(fromAi('coaep', { cos: [{ statement: 'S', ilos: [{ outcome: 'O', assessments: ['Quiz', ''], performanceTarget: 'T' }] }] }),
        { cos: [{ statement: 'S', ilos: [{ outcome: 'O', assessments: [{ name: 'Quiz' }], performanceTarget: 'T' }] }] });
});

test('lines and cells from positioned words; a reading stops at the next section heading', () => {
    const w = (text, x0, y) => ({ text, x0, x1: x0 + text.length * 6, y, h: 10 });
    const lines = linesOf([
        w('PROGRAM', 0, 0), w('OUTCOMES', 50, 0),
        w('1', 0, 20), w('2', 20, 20), w('3', 40, 20), w('By', 100, 20),
        w('✓', 0, 40), w('✓', 40, 40), w('PO1', 70, 40), w('Do', 100, 40), w('things.', 118, 40),
        w('COURSE', 0, 60), w('DETAILS', 50, 60), w('HERE', 100, 60),
        w('PO2', 70, 80), w('Not', 100, 80), w('this.', 120, 80),
    ]);
    assert.deepEqual(readPoPeo(lines).outcomes, [{ text: 'Do things.', peos: [1, 3], gas: [] }]);
    const coLines = linesOf([w('PO1', 200, 0), w('PO2', 260, 0), w('CO1:', 0, 20), w('Explain.', 30, 20), w('E', 262, 20)]);
    assert.deepEqual(readCoPo(coLines).cos, [{ description: 'CO1: Explain.', poMappings: ['', 'E'] }]);
});

test('a reviewed scan is saved as a template workbook that reads back to the same data', () => {
    const copo = { cos: [{ description: 'CO1: Explain', poMappings: ['I', '', 'D'] }, { description: 'CO2: Apply', poMappings: ['', 'E', ''] }] };
    assert.deepEqual(parseCourseSheet('co-po', bookFromData('co-po', copo).bytes), copo);
    const coaep = { cos: [{ statement: 'Explain', ilos: [
        { outcome: 'Describe', assessments: [{ name: 'Quiz' }, { name: 'Lab' }], performanceTarget: '70% get 70%' },
        { outcome: 'Apply', assessments: [], performanceTarget: '70%' },
    ] }] };
    assert.deepEqual(parseCourseSheet('coaep', bookFromData('coaep', coaep).bytes), coaep);
    assert.match(bookFromData('coaep', { cos: [] }).error, /nothing to save/);
});

test('front pages are checked against the program: vision, mission, each PEO and PO', () => {
    const text = 'VISION STATEMENT Our vision ... MISSION ... 1. Utilize competently the acquired skills. PO1 Apply knowledge in computing.';
    const r = frontPageCheck(text, { peos: [{ statement: 'Utilize competently the acquired skills.' }, { statement: 'Advance one\'s skills.' }], outcomes: [{ text: 'Apply knowledge in computing.' }] });
    assert.equal(r.vision, true);
    assert.equal(r.mission, true);
    assert.deepEqual(r.peos.map(p => p.found), [true, false]);
    assert.deepEqual(r.outcomes.map(o => o.found), [true]);
});
