'use strict';

// Reading a Program Head's CO-PO or COAEP spreadsheet into the shape the generated tables use, so an uploaded
// Excel file is shown and exported in the same format as the table built from the plan.
//
//   co-po:  { cos: [{ description, poMappings: ['I', '', 'E', …] }] }      poMappings[i] is PO(i+1)
//   coaep:  { cos: [{ statement, ilos: [{ outcome, assessments: [{ name }], performanceTarget }] }] }
//
// Either answers { error } when the sheet is not in the template's layout.

const xlsx = require('xlsx');

const canonical = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

const sheetsOf = (bytes) => {
    const book = xlsx.read(bytes, { type: 'buffer' });
    return book.SheetNames.map(name => xlsx.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: '', blankrows: false, raw: false }));
};

// The first row (of the first 20) of any sheet that passes `test`, with its sheet.
const findHeader = (sheets, test) => {
    for (const rows of sheets) {
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const cells = (rows[i] || []).map(canonical);
            if (test(cells)) return { rows, index: i, cells };
        }
    }
    return null;
};

const parseCoPo = (sheets) => {
    const h = findHeader(sheets, cells => cells.some(c => /^po\d+$/.test(c)));
    if (!h) return { error: 'Use the CO and PO template: a header row with the outcome column and PO1, PO2, … columns.' };
    const poCols = h.cells.map((c, i) => ({ i, n: Number((c.match(/^po(\d+)$/) || [])[1]) })).filter(x => x.n);
    // The outcome text: a column named for it, else the first column that is not a PO.
    let descCol = h.cells.findIndex(c => /outcome|description|statement|student/.test(c));
    if (descCol < 0) descCol = h.cells.findIndex((c, i) => !poCols.some(x => x.i === i) && !/^(co|no|#|)$/.test(c));
    const width = Math.max(...poCols.map(x => x.n));
    const cos = h.rows.slice(h.index + 1).map(r => {
        const poMappings = Array(width).fill('');
        for (const x of poCols) {
            const level = clean((r || [])[x.i]).toUpperCase().charAt(0);
            if (['I', 'E', 'D'].includes(level)) poMappings[x.n - 1] = level;
        }
        return { description: clean((r || [])[descCol]), poMappings };
    }).filter(co => co.description);
    if (!cos.length) return { error: 'The sheet has no course outcomes under its header row.' };
    return { cos };
};

const parseCoaep = (sheets) => {
    const h = findHeader(sheets, cells => cells.some(c => c.includes('courseoutcome')) && cells.some(c => c.includes('assessment')));
    if (!h) return { error: 'Use the COAEP template: Course Outcome Statement, Intended Learning Outcome, Assessment Tool, Performance Target.' };
    const at = (test) => h.cells.findIndex(test);
    const coCol = at(c => c.includes('courseoutcome'));
    const iloCol = at(c => c.includes('intendedlearning') || c.includes('ilo'));
    const toolCol = at(c => c.includes('assessment'));
    const targetCol = at(c => c.includes('performance') || c.includes('target'));
    const cos = [];
    for (const r of h.rows.slice(h.index + 1)) {
        // '—' is how the exported form writes an empty cell.
        const cell = (i) => { const v = i < 0 ? '' : clean((r || [])[i]); return v === '—' ? '' : v; };
        // The signature block under the table ends it.
        if (/^(prepared by|date submitted|reminders)\b/i.test(cell(coCol))) break;
        // The official form (and our export) puts the CO number in its own column under the merged header, the
        // statement in the column beside it.
        const statement = /^\d+$/.test(cell(coCol)) && coCol + 1 !== iloCol ? cell(coCol + 1) : cell(coCol);
        const ilo = {
            outcome: cell(iloCol),
            // One tool per line, or separated by semicolons; the export's bullets dropped.
            assessments: String((r || [])[toolCol] ?? '').split(/[\n;]+/)
                .map(t => clean(t).replace(/^[•*-]\s*/, '')).filter(t => t && t !== '—').map(name => ({ name })),
            performanceTarget: cell(targetCol),
        };
        const empty = !ilo.outcome && !ilo.assessments.length && !ilo.performanceTarget;
        // A blank statement continues the CO above (merged cells in the form).
        if (statement) cos.push({ statement, ilos: empty ? [] : [ilo] });
        else if (cos.length && !empty) cos[cos.length - 1].ilos.push(ilo);
    }
    if (!cos.length) return { error: 'The sheet has no course outcomes under its header row.' };
    return { cos };
};

const PARSERS = { 'co-po': parseCoPo, coaep: parseCoaep };

// bytes: an .xlsx / .xls file. Never throws.
const parseCourseSheet = (kind, bytes) => {
    try { return PARSERS[kind](sheetsOf(bytes)); } catch { return { error: 'This file could not be read as a spreadsheet.' }; }
};

const TEMPLATES = {
    'co-po': [
        ['After completion of the course, the student should be able to:', 'PO1', 'PO2', 'PO3', 'PO4', 'PO5'],
        ['CO1: Explain the core concepts of the course.', 'I', 'E', '', 'D', ''],
    ],
    coaep: [
        ['Course Outcome Statement', 'Intended Learning Outcome', 'Assessment Tool', 'Performance Target'],
        ['CO1: Explain the core concepts of the course.', 'ILO1: Describe …', 'Quiz; Laboratory exercise', '70% of the students get at least 70%'],
        ['', 'ILO2: Apply …', 'Project', '70% of the students get at least 70%'],
    ],
};

const templateBook = (kind) => {
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(TEMPLATES[kind]), kind === 'coaep' ? 'COAEP' : 'CO-PO');
    return xlsx.write(book, { type: 'buffer', bookType: 'xlsx' });
};

// A reviewed scan (the shapes above) as a workbook in the template's layout, so it is stored and read back exactly like
// an uploaded spreadsheet. Answers { error } when there is nothing to save.
const bookFromData = (kind, data) => {
    const cos = Array.isArray(data?.cos) ? data.cos : [];
    let rows;
    if (kind === 'co-po') {
        const width = Math.min(30, Math.max(0, ...cos.map(c => (Array.isArray(c.poMappings) ? c.poMappings.length : 0))));
        rows = [['After completion of the course, the student should be able to:', ...Array.from({ length: width }, (_, i) => `PO${i + 1}`)]];
        for (const c of cos) {
            const description = clean(c.description);
            if (!description) continue;
            rows.push([description, ...Array.from({ length: width }, (_, i) => (/^[IED]$/i.test(clean((c.poMappings || [])[i])) ? clean(c.poMappings[i]).toUpperCase() : ''))]);
        }
    } else if (kind === 'coaep') {
        rows = [TEMPLATES.coaep[0]];
        for (const c of cos) {
            const statement = clean(c.statement);
            const ilos = (Array.isArray(c.ilos) ? c.ilos : []).filter(i => clean(i.outcome) || clean(i.performanceTarget));
            if (!statement && !ilos.length) continue;
            if (!ilos.length) { rows.push([statement, '', '', '']); continue; }
            ilos.forEach((i, k) => rows.push([k === 0 ? statement : '', clean(i.outcome),
                (Array.isArray(i.assessments) ? i.assessments : []).map(a => clean(a?.name ?? a)).filter(Boolean).join('; '),
                clean(i.performanceTarget)]));
        }
    } else return { error: 'Unknown course document.' };
    if (rows.length < 2) return { error: 'There is nothing to save.' };
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(rows), kind === 'coaep' ? 'COAEP' : 'CO-PO');
    return { bytes: xlsx.write(book, { type: 'buffer', bookType: 'xlsx' }) };
};

module.exports = { parseCourseSheet, templateBook, sheetsOf, bookFromData };
