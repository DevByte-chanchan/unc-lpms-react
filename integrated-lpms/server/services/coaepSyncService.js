'use strict';

const db = require('../models');

/**
 * Cross-Module COAEP & CO-PO Sync Service (M3 Submissions -> M2 Composition)
 *
 * Whenever a Program Head saves/uploads structured COAEP or CO-PO data on a
 * ProgramCourseOffering, this service syncs the authoritative CourseOutcomes,
 * ProgramOutcomeAlignments, IntendedLearningOutcomes (weights, tools, targets, IED),
 * and Weeks into the shared tables so Composition immediately reflects them.
 */

async function syncCoaepToOffering(pcOfferingId, parsedCoaep, transaction = null) {
  const txOpt = transaction ? { transaction } : {};
  if (!pcOfferingId || !parsedCoaep) return { synced: false };

  const offering = await db.ProgramCourseOffering.findByPk(Number(pcOfferingId), txOpt);
  if (!offering) return { synced: false, error: 'Offering not found' };

  const coItems = Array.isArray(parsedCoaep.course_outcomes)
    ? parsedCoaep.course_outcomes
    : Array.isArray(parsedCoaep.courseOutcomes)
      ? parsedCoaep.courseOutcomes
      : Array.isArray(parsedCoaep.cos)
        ? parsedCoaep.cos
        : [];

  if (coItems.length === 0) return { synced: false, reason: 'no_cos_in_payload' };

  const existingCos = await db.CourseOutcome.findAll({
    where: { pc_offering_id: offering.pc_offering_id },
    order: [['co_id', 'ASC']],
    ...txOpt,
  });

  const syncedCos = [];

  for (let idx = 0; idx < coItems.length; idx++) {
    const coInput = coItems[idx];
    const coDesc = String(coInput.co_description || coInput.description || coInput.statement || coInput.title || `CO${idx + 1}`).trim();

    let coRow = existingCos[idx] || null;
    if (coRow) {
      await coRow.update({ co_description: coDesc }, txOpt);
    } else {
      coRow = await db.CourseOutcome.create({
        pc_offering_id: offering.pc_offering_id,
        co_description: coDesc,
      }, txOpt);
    }
    syncedCos.push(coRow);

    // Ensure 4 weeks exist under each CO
    const weekCount = await db.Week.count({ where: { co_id: coRow.co_id }, ...txOpt });
    if (weekCount === 0) {
      await db.Week.bulkCreate([1, 2, 3, 4].map(() => ({ co_id: coRow.co_id, hours: 5.0 })), txOpt);
    }

    // Sync ILOs if provided
    const iloInputs = Array.isArray(coInput.ilos) ? coInput.ilos : [];
    if (iloInputs.length > 0) {
      const existingIlos = await db.IntendedLearningOutcome.findAll({
        where: { co_id: coRow.co_id },
        order: [['ilo_id', 'ASC']],
        ...txOpt,
      });

      for (let j = 0; j < iloInputs.length; j++) {
        const item = iloInputs[j];
        const desc = String(item.description || item.ilo_description || item.statement || '').trim();
        if (!desc) continue;

        const payload = {
          co_id: coRow.co_id,
          description: desc,
          assessment_tool: item.assessment_tool || item.assessmentTool || null,
          is_orientation: Boolean(item.is_orientation),
          prelim_weight: item.prelim_weight != null ? Number(item.prelim_weight) : (idx === 0 ? Number(item.weight || 0) : 0),
          midterm_weight: item.midterm_weight != null ? Number(item.midterm_weight) : (idx === 1 ? Number(item.weight || 0) : 0),
          semi_weight: item.semi_weight != null ? Number(item.semi_weight) : (idx === 2 ? Number(item.weight || 0) : 0),
          final_weight: item.final_weight != null ? Number(item.final_weight) : (idx === 3 ? Number(item.weight || 0) : 0),
          target: item.target != null ? String(item.target) : '60',
          ied_level: ['I', 'E', 'D'].includes(String(item.ied_level || '').toUpperCase())
            ? String(item.ied_level).toUpperCase()
            : null,
          target_students_percent: item.target_students_percent != null ? Number(item.target_students_percent) : 90,
          target_score_percent: item.target_score_percent != null ? Number(item.target_score_percent) : 60,
          hours: item.hours != null ? Number(item.hours) : null,
          weeks: item.weeks != null ? Number(item.weeks) : null,
        };

        if (existingIlos[j]) {
          await existingIlos[j].update(payload, txOpt);
        } else {
          await db.IntendedLearningOutcome.create(payload, txOpt);
        }
      }
    }
  }

  return { synced: true, courseOutcomeCount: syncedCos.length };
}

async function syncCoPoToOffering(pcOfferingId, parsedCoPo, transaction = null) {
  const txOpt = transaction ? { transaction } : {};
  if (!pcOfferingId || !parsedCoPo) return { synced: false };

  const offering = await db.ProgramCourseOffering.findByPk(Number(pcOfferingId), txOpt);
  if (!offering) return { synced: false, error: 'Offering not found' };

  const cos = await db.CourseOutcome.findAll({
    where: { pc_offering_id: offering.pc_offering_id },
    order: [['co_id', 'ASC']],
    ...txOpt,
  });
  const pos = await db.ProgramOutcome.findAll({
    where: { program_id: offering.program_id },
    order: [['po_id', 'ASC']],
    ...txOpt,
  });

  if (cos.length === 0 || pos.length === 0) return { synced: false, reason: 'missing_cos_or_pos' };

  // Support either { alignments: [[{po_id, level}], ...] } or { matrix: [{ coIndex, poIndex, level }] }
  const flatEntries = [];
  if (Array.isArray(parsedCoPo.matrix)) {
    for (const cell of parsedCoPo.matrix) {
      const coRow = cell.co_id ? cos.find((c) => c.co_id === Number(cell.co_id)) : cos[Number(cell.coIndex ?? cell.co_index ?? 0)];
      const poRow = cell.po_id ? pos.find((p) => p.po_id === Number(cell.po_id)) : pos[Number(cell.poIndex ?? cell.po_index ?? 0)];
      const lvl = String(cell.attainment_level || cell.level || '').trim().toUpperCase();
      if (coRow && poRow && ['I', 'E', 'D'].includes(lvl)) {
        flatEntries.push({ co_id: coRow.co_id, po_id: poRow.po_id, attainment_level: lvl });
      }
    }
  } else if (Array.isArray(parsedCoPo.alignments)) {
    parsedCoPo.alignments.forEach((rowArr, coIdx) => {
      const coRow = cos[coIdx];
      if (!coRow || !Array.isArray(rowArr)) return;
      for (const item of rowArr) {
        const poRow = item.po_id ? pos.find((p) => p.po_id === Number(item.po_id)) : pos[Number(item.poIndex ?? 0)];
        const lvl = String(item.attainment_level || item.level || '').trim().toUpperCase();
        if (poRow && ['I', 'E', 'D'].includes(lvl)) {
          flatEntries.push({ co_id: coRow.co_id, po_id: poRow.po_id, attainment_level: lvl });
        }
      }
    });
  }

  if (flatEntries.length === 0) return { synced: false, reason: 'no_valid_alignments' };

  // Replace alignments on this offering's COs cleanly
  const coIds = cos.map((c) => c.co_id);
  await db.ProgramOutcomeAlignment.destroy({ where: { co_id: coIds }, ...txOpt });
  await db.ProgramOutcomeAlignment.bulkCreate(flatEntries, txOpt);

  return { synced: true, alignmentCount: flatEntries.length };
}

module.exports = {
  syncCoaepToOffering,
  syncCoPoToOffering,
};
