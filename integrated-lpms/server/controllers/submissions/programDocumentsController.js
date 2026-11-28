'use strict';

const db = require('../../models');
const { syncCoaepToOffering, syncCoPoToOffering } = require('../../services/coaepSyncService');

/**
 * Program Documents, PO-PEO, Front Pages, Course Documents (CO-PO & COAEP), and Form Settings Controller
 * Wired via coaepSyncService so COAEP & CO-PO uploads immediately propagate into Composition!
 */

exports.getProgramOutcomes = async (req, res, next) => {
  try {
    const programId = Number(req.query?.program_id || req.params?.programId || 1);
    const [program, outcomes, peos, frontPage] = await Promise.all([
      db.Program.findByPk(programId, { include: [{ model: db.Department, as: 'department' }] }),
      db.ProgramOutcome.findAll({ where: { program_id: programId }, order: [['po_id', 'ASC']] }),
      db.ProgramEducationalObjective.findAll({ where: { program_id: programId }, order: [['peo_id', 'ASC']] }),
      db.ProgramFrontPage.findByPk(programId, { attributes: ['program_id', 'file_name', 'uploaded_by', 'updatedAt'] }),
    ]);

    return res.json({
      program,
      programOutcomes: outcomes.map((o) => ({
        ...o.toJSON(),
        peo_numbers: safeParseArray(o.peo_numbers),
        ga_numbers: safeParseArray(o.ga_numbers),
      })),
      peos,
      frontPage: frontPage || null,
    });
  } catch (err) {
    return next(err);
  }
};

function safeParseArray(val) {
  if (Array.isArray(val)) return val;
  try {
    const p = JSON.parse(val || '[]');
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

exports.saveProgramOutcomes = async (req, res, next) => {
  try {
    const programId = Number(req.body?.program_id || req.params?.programId || 1);
    const { programOutcomes = [], peos = [] } = req.body || {};

    await db.sequelize.transaction(async (t) => {
      if (Array.isArray(peos) && peos.length > 0) {
        for (const peo of peos) {
          if (peo.peo_id) {
            await db.ProgramEducationalObjective.update(
              { statement: String(peo.statement || '').trim(), mission_aligned: Boolean(peo.mission_aligned ?? true) },
              { where: { peo_id: peo.peo_id, program_id: programId }, transaction: t }
            );
          } else if (peo.statement) {
            await db.ProgramEducationalObjective.create({
              program_id: programId,
              statement: String(peo.statement).trim(),
              mission_aligned: Boolean(peo.mission_aligned ?? true),
            }, { transaction: t });
          }
        }
      }

      if (Array.isArray(programOutcomes) && programOutcomes.length > 0) {
        for (const po of programOutcomes) {
          const payload = {
            program_id: programId,
            description: String(po.description || '').trim(),
            peo_numbers: JSON.stringify(safeParseArray(po.peo_numbers)),
            ga_numbers: JSON.stringify(safeParseArray(po.ga_numbers)),
          };
          if (!payload.description) continue;
          if (po.po_id) {
            await db.ProgramOutcome.update(payload, { where: { po_id: po.po_id, program_id: programId }, transaction: t });
          } else {
            await db.ProgramOutcome.create(payload, { transaction: t });
          }
        }
      }
    });

    return exports.getProgramOutcomes({ query: { program_id: programId } }, res, next);
  } catch (err) {
    return next(err);
  }
};

exports.uploadFrontPage = async (req, res, next) => {
  try {
    const programId = Number(req.params.programId || req.body?.program_id || 1);
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'PDF file upload is required.' });
    }
    await db.ProgramFrontPage.upsert({
      program_id: programId,
      file_name: req.file.originalname || `program_${programId}_front_pages.pdf`,
      pdf: req.file.buffer,
      uploaded_by: req.user?.user_id || null,
      updatedAt: new Date(),
    });
    return res.json({ ok: true, program_id: programId, file_name: req.file.originalname });
  } catch (err) {
    return next(err);
  }
};

exports.getFrontPagePdf = async (req, res, next) => {
  try {
    const programId = Number(req.params.programId || 1);
    const row = await db.ProgramFrontPage.findByPk(programId);
    if (!row) return res.status(404).json({ error: 'No front page PDF uploaded for this program.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${row.file_name}"`);
    return res.send(row.pdf);
  } catch (err) {
    return next(err);
  }
};

exports.deleteFrontPage = async (req, res, next) => {
  try {
    const programId = Number(req.params.programId || 1);
    await db.ProgramFrontPage.destroy({ where: { program_id: programId } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// Course Documents (CO-PO & COAEP)
exports.listCourseDocuments = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.pc_offering_id || req.params?.pcId) {
      where.pc_offering_id = Number(req.query?.pc_offering_id || req.params?.pcId);
    }
    if (req.query?.kind) where.kind = String(req.query.kind).toLowerCase();

    const rows = await db.CourseDocument.findAll({
      where,
      attributes: ['course_document_id', 'pc_offering_id', 'kind', 'file_name', 'content_type', 'parsed_json', 'uploaded_by', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
    });

    return res.json({
      documents: rows.map((r) => ({
        ...r.toJSON(),
        parsed: r.parsed_json ? (() => { try { return JSON.parse(r.parsed_json); } catch { return null; } })() : null,
      })),
    });
  } catch (err) {
    return next(err);
  }
};

exports.saveCourseDocument = async (req, res, next) => {
  try {
    const pcOfferingId = Number(req.params?.pcId || req.body?.pc_offering_id);
    const kind = String(req.params?.kind || req.body?.kind || 'coaep').toLowerCase();
    if (!pcOfferingId || !['coaep', 'co-po'].includes(kind)) {
      return res.status(400).json({ error: 'Valid pc_offering_id and kind (coaep | co-po) are required.' });
    }

    const offering = await db.ProgramCourseOffering.findByPk(pcOfferingId);
    if (!offering) return res.status(404).json({ error: 'ProgramCourseOffering not found.' });

    let parsedPayload = req.body?.parsed || req.body?.parsed_data || req.body?.parsed_json || req.body?.data || null;
    if (typeof parsedPayload === 'string') {
      try { parsedPayload = JSON.parse(parsedPayload); } catch { /* keep raw */ }
    }
    if (!parsedPayload && (req.body?.course_outcomes || req.body?.courseOutcomes || req.body?.alignments || req.body?.matrix)) {
      parsedPayload = req.body;
    }

    const fileBuffer = req.file?.buffer || Buffer.from(JSON.stringify(parsedPayload || {}, null, 2), 'utf8');
    const fileName = req.file?.originalname || req.body?.file_name || `${kind}_offering_${pcOfferingId}.json`;
    const contentType = req.file?.mimetype || 'application/json';

    let syncResult = null;

    await db.sequelize.transaction(async (t) => {
      await db.CourseDocument.upsert({
        pc_offering_id: pcOfferingId,
        kind,
        file_name: fileName,
        content_type: contentType,
        data: fileBuffer,
        parsed_json: parsedPayload ? JSON.stringify(parsedPayload) : null,
        uploaded_by: req.user?.user_id || null,
        updatedAt: new Date(),
      }, { transaction: t });

      if (parsedPayload) {
        if (kind === 'coaep') {
          syncResult = await syncCoaepToOffering(pcOfferingId, parsedPayload, t);
        } else if (kind === 'co-po') {
          syncResult = await syncCoPoToOffering(pcOfferingId, parsedPayload, t);
        }
      }
    });

    return res.status(201).json({
      ok: true,
      pc_offering_id: pcOfferingId,
      kind,
      file_name: fileName,
      syncResult,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getCoaepByOffering = async (req, res, next) => {
  try {
    const pcId = Number(req.params.pcId);
    const offering = await db.ProgramCourseOffering.findByPk(pcId, {
      include: [
        { model: db.Course, as: 'course' },
        { model: db.Program, as: 'program' },
        {
          model: db.CourseOutcome,
          as: 'courseOutcomes',
          include: [
            { model: db.IntendedLearningOutcome, as: 'ilos' },
            { model: db.ProgramOutcomeAlignment, as: 'poAlignments' },
          ],
        },
      ],
      order: [
        [{ model: db.CourseOutcome, as: 'courseOutcomes' }, 'co_id', 'ASC'],
      ],
    });
    if (!offering) return res.status(404).json({ error: 'Offering not found.' });

    const doc = await db.CourseDocument.findOne({
      where: { pc_offering_id: pcId, kind: 'coaep' },
      attributes: ['course_document_id', 'file_name', 'updatedAt'],
    });

    return res.json({
      pc_offering_id: pcId,
      course: offering.course,
      program: offering.program,
      document: doc || null,
      courseOutcomes: offering.courseOutcomes || [],
    });
  } catch (err) {
    return next(err);
  }
};

// Form Settings
exports.listFormSettings = async (_req, res, next) => {
  try {
    const rows = await db.FormSetting.findAll({ order: [['form_key', 'ASC']] });
    return res.json({ settings: rows });
  } catch (err) {
    return next(err);
  }
};

exports.updateFormSetting = async (req, res, next) => {
  try {
    const formKey = String(req.params.formKey || req.body?.form_key || '').trim();
    if (!formKey) return res.status(400).json({ error: 'form_key is required.' });
    const [row] = await db.FormSetting.upsert({
      form_key: formKey,
      doc_control_no: String(req.body?.doc_control_no || 'UNC-FM-VPAA-01').trim(),
      revision_no: String(req.body?.revision_no || '01').trim(),
      effectivity: String(req.body?.effectivity || 'June 2026').trim(),
      updated_by_name: req.user?.name || 'VPAA',
    });
    return res.json({ setting: row });
  } catch (err) {
    return next(err);
  }
};
