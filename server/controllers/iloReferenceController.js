// controllers/iloReferenceController.js
const { ILOReference, Reference, IntendedLearningOutcome, sequelize } = require('../models');
const { Op } = require('sequelize');

async function getReferencesByILO(req, res) {
  try {
    const iloId = Number(req.params.iloId);
    if (!iloId) return res.status(400).json({ message: 'iloId is required' });

    // Prefer Sequelize include (works when associations are defined)
    try {
      const rows = await ILOReference.findAll({
        where: { ilo_id: iloId },
        include: [{ model: Reference }],
        order: [['ilo_reference_id', 'ASC']]
      });

      const assigned = rows.map(r => ({
        ilo_reference_id: r.ilo_reference_id,
        reference_id: r.reference_id,
        ilo_id: r.ilo_id,
        reference: r.Reference ? {
          reference_id: r.Reference.reference_id,
          title: r.Reference.title,
          type: r.Reference.type,
          author: r.Reference.author,
          isbn: r.Reference.isbn,
          link: r.Reference.link,
          publication_year: r.Reference.publication_year
        } : null
      }));

      return res.json(assigned);
    } catch (includeErr) {
      // Fallback: raw query using backticks (MySQL compatible quoting)
      const rows = await sequelize.query(
          `SELECT ir.ilo_reference_id,
                ir.reference_id,
                ir.ilo_id,
                r.reference_id   AS ref_reference_id,
                r.title          AS ref_title,
                r.type           AS ref_type,
                r.author         AS ref_author,
                r.isbn           AS ref_isbn,
                r.link           AS ref_link,
                r.publication_year AS ref_publication_year
         FROM \`ILOReferences\` ir
         LEFT JOIN \`References\` r ON r.reference_id = ir.reference_id
         WHERE ir.ilo_id = :iloId
         ORDER BY ir.ilo_reference_id ASC;`,
          { replacements: { iloId }, type: sequelize.QueryTypes.SELECT }
      );

      const assigned = rows.map(r => ({
        ilo_reference_id: r.ilo_reference_id,
        reference_id: r.reference_id,
        ilo_id: r.ilo_id,
        reference: r.ref_reference_id ? {
          reference_id: r.ref_reference_id,
          title: r.ref_title,
          type: r.ref_type,
          author: r.ref_author,
          isbn: r.ref_isbn,
          link: r.ref_link,
          publication_year: r.ref_publication_year
        } : null
      }));

      return res.json(assigned);
    }
  } catch (err) {
    console.error('getReferencesByILO error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function assignReferencesToILO(req, res) {
  const t = await sequelize.transaction();
  try {
    const { ilo_id, reference_ids } = req.body;
    if (!ilo_id || !Array.isArray(reference_ids)) {
      await t.rollback();
      return res.status(400).json({ message: 'ilo_id and reference_ids array are required' });
    }

    // Validate ILO exists (optional but helpful)
    const ilo = await IntendedLearningOutcome.findByPk(ilo_id, { transaction: t });
    if (!ilo) {
      await t.rollback();
      return res.status(404).json({ message: 'ILO not found' });
    }

    // Validate references exist
    if (reference_ids.length > 0) {
      const found = await Reference.findAll({
        where: { reference_id: { [Op.in]: reference_ids } },
        attributes: ['reference_id'],
        transaction: t,
        raw: true
      });
      const foundIds = found.map(r => r.reference_id);
      const missing = reference_ids.filter(id => !foundIds.includes(id));
      if (missing.length) {
        await t.rollback();
        return res.status(400).json({ message: 'Some references not found', missing });
      }
    }

    // Delete existing assignments for this ILO
    await ILOReference.destroy({ where: { ilo_id }, transaction: t });

    // Bulk insert new assignments
    if (reference_ids.length > 0) {
      const inserts = reference_ids.map(rid => ({
        reference_id: rid,
        ilo_id,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      await ILOReference.bulkCreate(inserts, { transaction: t });
    }

    await t.commit();
    return res.json({ message: 'Assigned references updated', assignedCount: reference_ids.length });
  } catch (err) {
    await t.rollback();
    console.error('assignReferencesToILO error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteILOReference(req, res) {
  try {
    const id = Number(req.params.iloReferenceId);
    if (!id) return res.status(400).json({ message: 'iloReferenceId is required' });

    const deleted = await ILOReference.destroy({ where: { ilo_reference_id: id } });
    if (!deleted) return res.status(404).json({ message: 'ILOReference not found' });

    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteILOReference error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { getReferencesByILO, assignReferencesToILO, deleteILOReference };
