'use strict';

// A Program Head's uploaded CO-PO or COAEP file for one course offering (migrations/20261113000000-course-documents).
//
//   GET    /api/course-documents/template/:kind      the spreadsheet layout to fill in (kind co-po or coaep)
//   GET    /api/course-documents/:pcId               { 'co-po': { fileName, contentType, updatedAt, parsed? } | null, coaep: … }
//                                                    parsed: an Excel file read into the generated table's shape
//   GET    /api/course-documents/:pcId/:kind         the file
//   PUT    /api/course-documents/:pcId/:kind         body: the file as raw bytes (PDF, XLSX or XLS); X-File-Name header
//   DELETE /api/course-documents/:pcId/:kind
// Only the Program Head of the offering's program uploads or removes; reading follows the offering access rules.

const { sequelize, Sequelize } = require('../models');
const { parseCourseSheet, templateBook } = require('../utils/courseDocumentSheets');
const { buildCoaepWorkbook } = require('../utils/coaepWorkbook');

const KINDS = ['co-po', 'coaep'];
const MAX_BYTES = 10 * 1024 * 1024;
const select = (sql, r = []) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });
const asInt = (value) => (/^\d+$/.test(String(value ?? '')) ? Number(value) : null);

// What the bytes are, by their signature (never by the name the browser sent).
const sniff = (bytes) => {
    if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return { type: 'application/pdf', ext: 'pdf' };
    if (bytes.subarray(0, 4).toString('hex') === '504b0304') return { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' };
    if (bytes.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1') return { type: 'application/vnd.ms-excel', ext: 'xls' };
    return null;
};

const params = (req, res) => {
    const pcId = asInt(req.params.pcId);
    const kind = String(req.params.kind || '');
    if (!pcId || !KINDS.includes(kind)) { res.status(400).json({ error: 'Unknown course document.' }); return null; }
    return { pcId, kind };
};

const headsOffering = async (req, res, pcId) => {
    const [row] = await select(
        `SELECT p.stakeholder_id FROM ProgramCourseOfferings pco INNER JOIN Programs p ON p.program_id = pco.program_id
         WHERE pco.pc_offering_id = ?`, [pcId]);
    if (!row) { res.status(404).json({ error: 'Course offering not found.' }); return false; }
    if (String(row.stakeholder_id) !== String(req.user.id)) {
        res.status(403).json({ error: 'Only the Program Head of this course\'s program can change its documents.' });
        return false;
    }
    return true;
};

const info = async (req, res, next) => {
    try {
        const pcId = asInt(req.params.pcId);
        const rows = await select('SELECT kind, file_name, content_type, data, updatedAt FROM CourseDocuments WHERE pc_offering_id = ?', [pcId]);
        const out = Object.fromEntries(KINDS.map(k => [k, null]));
        for (const r of rows) {
            const parsed = r.content_type === 'application/pdf' ? null : parseCourseSheet(r.kind, Buffer.from(r.data));
            out[r.kind] = { fileName: r.file_name, contentType: r.content_type, updatedAt: r.updatedAt, parsed: parsed && !parsed.error ? parsed : null };
        }
        return res.json(out);
    } catch (err) { return next(err); }
};

const download = async (req, res, next) => {
    try {
        const p = params(req, res);
        if (!p) return undefined;
        const [row] = await select('SELECT file_name, content_type, data FROM CourseDocuments WHERE pc_offering_id = ? AND kind = ?', [p.pcId, p.kind]);
        if (!row) return res.status(404).json({ error: 'No file uploaded.' });
        res.set('Content-Type', row.content_type);
        res.set('Content-Disposition', `attachment; filename="${String(row.file_name).replace(/[^\w.\- ]/g, '_')}"`);
        return res.send(Buffer.from(row.data));
    } catch (err) { return next(err); }
};

const upload = async (req, res, next) => {
    try {
        const p = params(req, res);
        if (!p || !(await headsOffering(req, res, p.pcId))) return undefined;
        const bytes = req.body;
        if (!Buffer.isBuffer(bytes) || !bytes.length) return res.status(400).json({ error: 'Choose a file.' });
        if (bytes.length > MAX_BYTES) return res.status(400).json({ error: 'The file is larger than 10 MB.' });
        const kind = sniff(bytes);
        if (!kind) return res.status(400).json({ error: 'Upload a PDF or an Excel file (.xlsx or .xls).' });
        // An Excel file has to be readable: it replaces the generated table on the page and in the export.
        if (kind.ext !== 'pdf') {
            const parsed = parseCourseSheet(p.kind, bytes);
            if (parsed.error) return res.status(400).json({ error: parsed.error });
        }
        const sent = req.get('X-File-Name') ? decodeURIComponent(req.get('X-File-Name')) : '';
        const fileName = (sent.replace(/\.[^.]*$/, '') || p.kind).slice(0, 180) + '.' + kind.ext;
        await sequelize.transaction(async (transaction) => {
            await sequelize.query('DELETE FROM CourseDocuments WHERE pc_offering_id = ? AND kind = ?', { replacements: [p.pcId, p.kind], transaction });
            await sequelize.getQueryInterface().bulkInsert('CourseDocuments', [{
                pc_offering_id: p.pcId, kind: p.kind, file_name: fileName, content_type: kind.type, data: bytes,
                uploaded_by: req.user.id, updatedAt: new Date(),
            }], { transaction });
        });
        return res.status(201).json({ fileName, contentType: kind.type });
    } catch (err) { return next(err); }
};

const remove = async (req, res, next) => {
    try {
        const p = params(req, res);
        if (!p || !(await headsOffering(req, res, p.pcId))) return undefined;
        await sequelize.query('DELETE FROM CourseDocuments WHERE pc_offering_id = ? AND kind = ?', { replacements: [p.pcId, p.kind] });
        return res.json({ removed: true });
    } catch (err) { return next(err); }
};

const template = (req, res) => {
    const kind = String(req.params.kind || '').replace(/\.xlsx$/, '');
    if (!KINDS.includes(kind)) return res.status(404).json({ error: 'Unknown template.' });
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="${kind === 'coaep' ? 'COAEP' : 'CO-PO'}-template.xlsx"`);
    return res.send(templateBook(kind));
};

// POST /api/course-documents/export/coaep   body: { record } as the page shows it   answers the form as .xlsx
const exportCoaep = async (req, res, next) => {
    try {
        const record = req.body?.record;
        if (!record || !Array.isArray(record.cos) || !record.cos.length) return res.status(400).json({ error: 'There is no COAEP to export.' });
        const bytes = await buildCoaepWorkbook(record);
        const name = String(req.body?.fileName || 'COAEP').replace(/[^\w.\- ]/g, '_').slice(0, 120);
        res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.set('Content-Disposition', `attachment; filename="${name}.xlsx"`);
        return res.send(bytes);
    } catch (err) { return next(err); }
};

module.exports = { info, download, upload, remove, template, exportCoaep };
