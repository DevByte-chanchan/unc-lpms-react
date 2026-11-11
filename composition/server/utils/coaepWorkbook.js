'use strict';

// The COAEP as an Excel file in the layout of the official form (UNC-FM-VPAA-02), the same content as the PDF
// export (client: utils/syllabusPdfHtml.js buildCoaepHtml): the UNC header, the faculty / course block, one row per
// ILO with its CO number and statement merged down, the signatures and the reminders. A plan that is not fully
// approved is marked DRAFT at the top.

const path = require('path');
const ExcelJS = require('exceljs');

const LOGO = path.join(__dirname, '..', 'assets', 'unclogo.png');
const DEFAULT_TARGET = 'At least 90% of enrolled students with a rating of at least 60% of the total score';
const REMINDERS = 'This template should be accomplished for each course handled by the faculty.';
const NOTES = 'Course Outcomes and ILOs must be SMART; Each CO should be granularized into an introductory, enabling and demonstrative ILO; ILOs should NOT be teaching learning activities; Sample Performance target:  At least 70% of students with 60% proficiency or score 12 out of 20.';

const text = (v, max = 4000) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const thin = { style: 'thin', color: { argb: 'FF000000' } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const FONT = 'Arial';

// The record the page shows (client: utils/generatedCoaepRecord.js), checked and trimmed: it comes from the browser.
const cleanRecord = (raw) => {
    const r = raw && typeof raw === 'object' ? raw : {};
    const h = r.header && typeof r.header === 'object' ? r.header : {};
    const cos = (Array.isArray(r.cos) ? r.cos : []).slice(0, 60).map(co => ({
        statement: text(co?.statement),
        ilos: (Array.isArray(co?.ilos) ? co.ilos : []).slice(0, 40).map(ilo => ({
            outcome: text(ilo?.outcome),
            assessments: (Array.isArray(ilo?.assessments) ? ilo.assessments : []).slice(0, 30).map(a => text(a?.name, 300)).filter(Boolean),
            performanceTarget: text(ilo?.performanceTarget, 600),
        })),
    }));
    return {
        header: { course: text(h.course, 300), facultyName: text(h.facultyName, 200), schoolYear: text(h.schoolYear, 40), semester: text(h.semester, 40) },
        cos,
        performanceTarget: text(r.performanceTarget, 600),
        preparedBy: text(r.preparedBy, 200), dateSubmitted: text(r.dateSubmitted, 60),
        approvedBy: text(r.approvedBy, 200), approvedByDate: text(r.approvedByDate, 60),
        approved: r.approved === true,
        docControlNo: text(r.docControlNo, 60) || 'UNC-FM-VPAA-02',
    };
};

const buildCoaepWorkbook = async (raw) => {
    const r = cleanRecord(raw);
    const book = new ExcelJS.Workbook();
    book.creator = 'UNC LPMS';
    const ws = book.addWorksheet('COAEP', {
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    });
    // A: CO number, B: CO statement, C: ILO, D: assessment tool, E: performance target.
    ws.columns = [{ width: 6 }, { width: 34 }, { width: 42 }, { width: 30 }, { width: 32 }];
    const font = (extra = {}) => ({ name: FONT, size: 10, ...extra });
    const set = (ref, value, style = {}) => {
        const c = ws.getCell(ref);
        c.value = value;
        c.font = font(style.font);
        c.alignment = { vertical: 'top', wrapText: true, ...(style.alignment || {}) };
        if (style.border) c.border = box;
        if (style.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
        return c;
    };

    // ---- form header (rows 1-4): logo | title block | document control number
    ws.mergeCells('A1:A4');
    ws.mergeCells('B1:D4');
    ws.mergeCells('E1:E4');
    for (let row = 1; row <= 4; row++) ws.getRow(row).height = 18;
    set('A1', '', { border: true });
    set('B1', {
        richText: [
            { text: 'UNIVERSITY OF NUEVA CACERES\n', font: font({ bold: true, size: 11 }) },
            { text: 'COURSE ASSESSMENT & EVALUATION PLAN\n', font: font({ bold: true, size: 14 }) },
            { text: 'Form\n', font: font() },
            { text: 'Office of the Vice President for Academic Affairs', font: font({ bold: true }) },
        ],
    }, { border: true, alignment: { horizontal: 'center', vertical: 'middle' } });
    set('E1', { richText: [{ text: 'Doc. Control No.:\n', font: font({ bold: true, size: 9 }) }, { text: r.docControlNo, font: font({ bold: true, size: 9 }) }] },
        { border: true, alignment: { vertical: 'middle' } });
    try {
        const logo = book.addImage({ filename: LOGO, extension: 'png' });
        ws.addImage(logo, { tl: { col: 0.15, row: 0.4 }, ext: { width: 52, height: 52 } });
    } catch { /* the form is still complete without the picture */ }

    let row = 6;
    if (!r.approved) {
        ws.mergeCells(`A${row}:E${row}`);
        set(`A${row}`, 'DRAFT – NOT APPROVED. This plan has not been fully approved; this COAEP is not final.',
            { font: { bold: true, color: { argb: 'FF78350F' } }, fill: 'FFFEF3C7', border: true, alignment: { horizontal: 'center', vertical: 'middle' } });
        row += 2;
    }

    // ---- faculty / course block
    const meta = (label, value, rightLabel, rightValue) => {
        set(`A${row}`, label, { font: { bold: true } });
        ws.mergeCells(`A${row}:B${row}`);
        set(`C${row}`, value, { alignment: { vertical: 'middle' } });
        ws.getCell(`C${row}`).border = { bottom: thin };
        set(`D${row}`, rightLabel, { font: { bold: true }, alignment: { horizontal: 'right' } });
        set(`E${row}`, rightValue);
        ws.getCell(`E${row}`).border = { bottom: thin };
        row += 1;
    };
    meta('Name of Faculty:', r.header.facultyName, 'School Year', r.header.schoolYear);
    meta('Course:', r.header.course, 'Semester', r.header.semester);
    row += 1;

    // ---- the table
    ws.mergeCells(`A${row}:B${row}`);
    const head = { font: { bold: true }, border: true, fill: 'FFEDEFF2', alignment: { horizontal: 'center', vertical: 'middle' } };
    set(`A${row}`, 'Course Outcome Statement', head);
    set(`C${row}`, 'Intended Learning Outcome', head);
    set(`D${row}`, 'Assessment Tool', head);
    set(`E${row}`, 'Performance Target', head);
    ws.getRow(row).height = 22;
    const headerRow = row;
    row += 1;

    r.cos.forEach((co, index) => {
        const ilos = co.ilos.length ? co.ilos : [{ outcome: '', assessments: [], performanceTarget: '' }];
        const first = row;
        for (const ilo of ilos) {
            set(`C${row}`, ilo.outcome || '—', { border: true });
            set(`D${row}`, ilo.assessments.length ? ilo.assessments.map(a => `• ${a}`).join('\n') : '—', { border: true });
            set(`E${row}`, ilo.performanceTarget || r.performanceTarget || DEFAULT_TARGET, { border: true });
            // Excel does not grow a row for wrapped text by itself: an estimate from the longest cell.
            const lines = Math.max(
                Math.ceil((ilo.outcome || '').length / 46),
                ilo.assessments.reduce((n, a) => n + Math.ceil(a.length / 32), 0),
                Math.ceil((ilo.performanceTarget || r.performanceTarget || DEFAULT_TARGET).length / 34),
                // The merged CO statement shares the height of its ILO rows.
                Math.ceil(co.statement.length / 38 / ilos.length),
                1);
            ws.getRow(row).height = Math.max(18, lines * 13 + 6);
            row += 1;
        }
        if (row - 1 > first) {
            ws.mergeCells(`A${first}:A${row - 1}`);
            ws.mergeCells(`B${first}:B${row - 1}`);
        }
        set(`A${first}`, index + 1, { border: true, font: { bold: true }, alignment: { horizontal: 'center' } });
        set(`B${first}`, co.statement, { border: true });
    });
    // Repeat the column titles on every printed page.
    ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;

    // ---- signatures and reminders
    row += 1;
    set(`A${row}`, 'Prepared by:', { font: { bold: true } });
    ws.mergeCells(`A${row}:B${row}`);
    set(`C${row}`, r.preparedBy);
    ws.getCell(`C${row}`).border = { bottom: thin };
    set(`D${row}`, 'Approved by:', { font: { bold: true }, alignment: { horizontal: 'right' } });
    set(`E${row}`, r.approvedBy, { font: { bold: true } });
    row += 1;
    set(`A${row}`, 'Date Submitted:', { font: { bold: true } });
    ws.mergeCells(`A${row}:B${row}`);
    set(`C${row}`, r.dateSubmitted);
    set(`D${row}`, 'Date:', { font: { bold: true }, alignment: { horizontal: 'right' } });
    set(`E${row}`, r.approvedByDate);
    row += 2;
    ws.mergeCells(`A${row}:E${row}`);
    set(`A${row}`, { richText: [{ text: 'Reminders:  ', font: font({ bold: true, italic: true, size: 9 }) }, { text: `${REMINDERS}\n${NOTES}`, font: font({ italic: true, size: 9 }) }] });
    ws.getRow(row).height = 42;

    return Buffer.from(await book.xlsx.writeBuffer());
};

module.exports = { buildCoaepWorkbook, cleanRecord };
