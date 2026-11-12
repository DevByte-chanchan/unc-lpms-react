'use strict';

// The Program Head's program documents:
//
//   GET    /api/program-outcomes/:programId/front-pages      the uploaded front pages (PDF), for the export; 204 if none
//   PUT    /api/program-outcomes/:programId/front-pages      body: the PDF as raw bytes (Program Head of the program)
//   DELETE /api/program-outcomes/:programId/front-pages
//   GET    /api/program-outcomes/template.xlsx               the PO / PEO spreadsheet layout to fill in
//   POST   /api/program-outcomes/:programId/import           body: that spreadsheet; answers { peos, outcomes } in the
//                                                            shape PUT /api/program-outcomes/:programId saves. Nothing is
//                                                            saved here: the page shows it in the editor to check first.

const xlsx = require('xlsx');
const { sequelize, Sequelize, Program } = require('../models');
const { GRADUATE_ATTRIBUTES } = require('./programOutcomeController');
const { scanDocument, frontPageCheck, frontPagesProblem, ScanError } = require('../utils/documentScan');

const asInt = (value) => (/^\d+$/.test(String(value ?? '')) ? Number(value) : null);
const select = (sql, r = []) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });
const MAX_PDF_BYTES = 10 * 1024 * 1024;

// The program, when the signed-in Program Head heads it; otherwise the error response is already sent.
const ownProgram = async (req, res) => {
    const programId = asInt(req.params.programId);
    const program = programId && await Program.findByPk(programId);
    if (!program) { res.status(404).json({ error: 'Program not found.' }); return null; }
    if (String(program.stakeholder_id) !== String(req.user.id)) {
        res.status(403).json({ error: 'Only the Program Head of this program can change it.' });
        return null;
    }
    return program;
};

const getFrontPages = async (req, res, next) => {
    try {
        const [row] = await select('SELECT pdf, file_name, updatedAt FROM ProgramFrontPages WHERE program_id = ?', [asInt(req.params.programId)]);
        // None uploaded is a normal answer, not an error: 204, so the export simply uses the generated pages.
        if (!row) return res.status(204).end();
        res.set('Content-Type', 'application/pdf');
        res.set('X-File-Name', encodeURIComponent(row.file_name || 'front-pages.pdf'));
        res.set('Last-Modified', new Date(row.updatedAt).toUTCString());
        return res.send(Buffer.from(row.pdf));
    } catch (err) { return next(err); }
};

const putFrontPages = async (req, res, next) => {
    try {
        const program = await ownProgram(req, res);
        if (!program) return undefined;
        const bytes = req.body;
        if (!Buffer.isBuffer(bytes) || !bytes.length) return res.status(400).json({ error: 'Choose a PDF file.' });
        if (bytes.length > MAX_PDF_BYTES) return res.status(400).json({ error: 'The PDF is larger than 10 MB.' });
        if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return res.status(400).json({ error: 'This file is not a PDF.' });
        // It has to be the front pages (vision, mission, PEOs, POs; at most a few pages), not any PDF.
        const problem = await frontPagesProblem(bytes);
        if (problem) return res.status(400).json({ error: problem });
        const fileName = String(req.get('X-File-Name') ? decodeURIComponent(req.get('X-File-Name')) : 'front-pages.pdf').slice(0, 200);
        await sequelize.query('DELETE FROM ProgramFrontPages WHERE program_id = ?', { replacements: [program.program_id] });
        await sequelize.getQueryInterface().bulkInsert('ProgramFrontPages', [{
            program_id: program.program_id, file_name: fileName, pdf: bytes, uploaded_by: req.user.id, updatedAt: new Date(),
        }]);
        return res.status(201).json({ fileName });
    } catch (err) { return next(err); }
};

const deleteFrontPages = async (req, res, next) => {
    try {
        const program = await ownProgram(req, res);
        if (!program) return undefined;
        await sequelize.query('DELETE FROM ProgramFrontPages WHERE program_id = ?', { replacements: [program.program_id] });
        return res.json({ removed: true });
    } catch (err) { return next(err); }
};

// ------------------------------------------------------------------ PO / PEO spreadsheet

const canonical = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (v) => String(v ?? '').trim();
// A tick in the form: any mark at all (✓, x, 1, yes) except "no" / "0".
const ticked = (v) => { const t = clean(v).toLowerCase(); return t !== '' && t !== '0' && t !== 'no' && t !== 'false'; };

// The workbook's PEO and PO sheets: { peos, outcomes } or { error }.
const parseProgramOutcomes = (matrices) => {
    const headerIn = (matrix, test) => {
        for (let i = 0; i < Math.min(matrix.length, 20); i++) {
            const cells = (matrix[i] || []).map(canonical);
            if (test(cells)) return { index: i, cells };
        }
        return null;
    };
    let peoSheet = null;
    let poSheet = null;
    for (const matrix of matrices) {
        if (!peoSheet) {
            const h = headerIn(matrix, cells => cells.includes('statement') || cells.some(c => c.startsWith('programeducationalobjective')));
            if (h) { peoSheet = { matrix, ...h }; continue; }
        }
        if (!poSheet) {
            const h = headerIn(matrix, cells => cells.includes('description') || cells.some(c => c.startsWith('programoutcome')));
            if (h) poSheet = { matrix, ...h };
        }
    }
    if (!peoSheet || !poSheet) return { error: 'Use the template: a PEO sheet (Statement, UNC Mission) and a PO sheet (Description, PEO1…, EC, CL, ERC, LL).' };

    const col = (cells, test) => cells.findIndex(test);
    const statementCol = col(peoSheet.cells, c => c === 'statement' || c.startsWith('programeducationalobjective'));
    const missionCol = col(peoSheet.cells, c => c.includes('mission'));
    const peos = peoSheet.matrix.slice(peoSheet.index + 1)
        .map(r => ({ statement: clean((r || [])[statementCol]), missionAligned: missionCol < 0 ? true : ticked((r || [])[missionCol]) }))
        .filter(p => p.statement);

    const descCol = col(poSheet.cells, c => c === 'description' || c.startsWith('programoutcome'));
    const peoCols = poSheet.cells.map((c, i) => ({ i, n: Number((c.match(/^peo(\d+)$/) || [])[1]) })).filter(x => x.n);
    const gaCols = GRADUATE_ATTRIBUTES.map((ga, k) => ({ i: poSheet.cells.indexOf(ga.toLowerCase()), n: k + 1 })).filter(x => x.i >= 0);
    const outcomes = poSheet.matrix.slice(poSheet.index + 1)
        .map(r => ({
            text: clean((r || [])[descCol]),
            peos: peoCols.filter(x => x.n <= peos.length && ticked((r || [])[x.i])).map(x => x.n),
            gas: gaCols.filter(x => ticked((r || [])[x.i])).map(x => x.n),
        }))
        .filter(o => o.text);
    if (!peos.length || !outcomes.length) return { error: 'The sheets have no PEOs or no program outcomes.' };
    return { peos, outcomes };
};

const allSheets = (bytes) => {
    const workbook = xlsx.read(bytes, { type: 'buffer' });
    return workbook.SheetNames.map(name => xlsx.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', blankrows: false }));
};

const importProgramOutcomes = async (req, res, next) => {
    try {
        const program = await ownProgram(req, res);
        if (!program) return undefined;
        if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Choose the PO / PEO spreadsheet.' });
        let parsed;
        try { parsed = parseProgramOutcomes(allSheets(req.body)); } catch { parsed = { error: 'This file could not be read as a spreadsheet.' }; }
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        return res.json(parsed);
    } catch (err) { return next(err); }
};

const template = (req, res) => {
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet([
        ['PEO', 'Statement', 'UNC Mission'],
        [1, 'Utilize competently the acquired technical and non-technical skills in practicing a career in Information Technology.', '✓'],
    ]), 'PEOs');
    xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet([
        ['PO', 'Description', 'PEO1', 'PEO2', 'PEO3', ...GRADUATE_ATTRIBUTES],
        ['PO1', 'Apply knowledge in computing, science, and mathematics in developing IT solutions.', '✓', '✓', '', '', '✓', '✓', '✓'],
    ]), 'POs');
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename="PO-PEO-template.xlsx"');
    return res.send(xlsx.write(book, { type: 'buffer', bookType: 'xlsx' }));
};

// POST /:programId/scan   body: a picture or PDF of the program's PEO / PO tables
// answers { peos, outcomes, source, warnings }: the import's shape, shown in the editor to check before Save.
const scanProgramOutcomes = async (req, res, next) => {
    try {
        const program = await ownProgram(req, res);
        if (!program) return undefined;
        const { data, source, warnings } = await scanDocument(req.body, 'po-peo');
        return res.json({ ...data, source, warnings });
    } catch (err) {
        // Nothing read = not the PO and PEO table (any other PDF or picture): say so.
        if (err instanceof ScanError && /^Nothing could be read/.test(err.message)) {
            return res.status(err.status).json({ error: 'This does not look like the PO and PEO table: no PEOs or program outcomes were found. Upload that table, or use the Excel template.' });
        }
        if (err instanceof ScanError) return res.status(err.status).json({ error: err.message });
        return next(err);
    }
};

// POST /:programId/front-pages/check   reads the uploaded front pages and says whether the vision, the mission and
// each of the program's PEO and PO statements are in them.
const checkFrontPages = async (req, res, next) => {
    try {
        const program = await ownProgram(req, res);
        if (!program) return undefined;
        const [row] = await select('SELECT pdf FROM ProgramFrontPages WHERE program_id = ?', [program.program_id]);
        if (!row) return res.status(404).json({ error: 'No front pages are uploaded.' });
        const { data, source, warnings } = await scanDocument(Buffer.from(row.pdf), 'front');
        const [peos, outcomes] = await Promise.all([
            select('SELECT statement FROM ProgramEducationalObjectives WHERE program_id = ? ORDER BY peo_id', [program.program_id]),
            select('SELECT description AS text FROM ProgramOutcomes WHERE program_id = ? ORDER BY po_id', [program.program_id]),
        ]);
        return res.json({ ...frontPageCheck(data.text, { peos, outcomes }), source, warnings });
    } catch (err) {
        if (err instanceof ScanError) return res.status(err.status).json({ error: err.message });
        return next(err);
    }
};

module.exports = { getFrontPages, putFrontPages, deleteFrontPages, importProgramOutcomes, template, parseProgramOutcomes, scanProgramOutcomes, checkFrontPages };
