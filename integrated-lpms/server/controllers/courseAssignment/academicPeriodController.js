'use strict';

const { Op } = require('sequelize');
const db = require('../../models');

function makeLabel(semester, schoolYear) {
  const sem = String(semester || '1st Semester').trim();
  const sy = String(schoolYear || '').trim();
  return `${sem} SY ${sy}`.trim();
}

exports.listPeriods = async (_req, res, next) => {
  try {
    const periods = await db.AcademicPeriod.findAll({
      order: [['sort_order', 'DESC'], ['academic_period_id', 'DESC']],
    });
    return res.json(periods);
  } catch (err) {
    return next(err);
  }
};

exports.getCurrentPeriod = async (_req, res, next) => {
  try {
    const active = await db.AcademicPeriod.findOne({
      where: { [Op.or]: [{ is_active: true }, { status: 'Active' }] },
      order: [['sort_order', 'DESC'], ['academic_period_id', 'DESC']],
    });
    if (active) return res.json(active);
    const latest = await db.AcademicPeriod.findOne({ order: [['academic_period_id', 'DESC']] });
    return res.json(latest || null);
  } catch (err) {
    return next(err);
  }
};

exports.createPeriod = async (req, res, next) => {
  try {
    const school_year = String(req.body?.school_year || req.body?.schoolYear || '').trim();
    const semester = String(req.body?.semester || '1st Semester').trim();
    const label = String(req.body?.label || makeLabel(semester, school_year)).trim();

    if (!school_year || !semester) {
      return res.status(400).json({ error: 'school_year and semester are required.' });
    }

    const maxSort = (await db.AcademicPeriod.max('sort_order')) || 0;
    const setActive = req.body?.is_active !== false && req.body?.status !== 'Closed';

    const created = await db.sequelize.transaction(async (t) => {
      if (setActive) {
        await db.AcademicPeriod.update(
          { is_active: false },
          { where: { is_active: true }, transaction: t }
        );
      }
      return db.AcademicPeriod.create({
        label,
        school_year,
        semester,
        is_active: setActive,
        status: setActive ? 'Active' : 'Closed',
        sort_order: Number(req.body?.sort_order ?? maxSort + 1),
        start_date: req.body?.start_date || null,
        end_date: req.body?.end_date || null,
        classes_start: req.body?.classes_start || null,
        prelim_exam: req.body?.prelim_exam || null,
        midterm_exam: req.body?.midterm_exam || null,
        semifinal_exam: req.body?.semifinal_exam || null,
        final_exam: req.body?.final_exam || null,
      }, { transaction: t });
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.updatePeriod = async (req, res, next) => {
  try {
    const period = await db.AcademicPeriod.findByPk(Number(req.params.id));
    if (!period) return res.status(404).json({ error: 'Academic period not found.' });

    const updates = {};
    const fields = [
      'label', 'school_year', 'semester', 'sort_order',
      'start_date', 'end_date', 'classes_start',
      'prelim_exam', 'midterm_exam', 'semifinal_exam', 'final_exam',
    ];
    for (const f of fields) {
      if (req.body?.[f] !== undefined) updates[f] = req.body[f];
    }
    if (req.body?.school_year || req.body?.semester) {
      updates.label = req.body?.label || makeLabel(updates.semester || period.semester, updates.school_year || period.school_year);
    }

    if (req.body?.is_active === true || req.body?.status === 'Active') {
      await db.AcademicPeriod.update({ is_active: false }, { where: { academic_period_id: { [Op.ne]: period.academic_period_id } } });
      updates.is_active = true;
      updates.status = 'Active';
      updates.closed_at = null;
    }

    await period.update(updates);
    return res.json(period);
  } catch (err) {
    return next(err);
  }
};

exports.closePeriod = async (req, res, next) => {
  try {
    const period = await db.AcademicPeriod.findByPk(Number(req.params.id));
    if (!period) return res.status(404).json({ error: 'Academic period not found.' });
    await period.update({ status: 'Closed', is_active: false, closed_at: new Date() });
    return res.json(period);
  } catch (err) {
    return next(err);
  }
};

exports.reopenPeriod = async (req, res, next) => {
  try {
    const period = await db.AcademicPeriod.findByPk(Number(req.params.id));
    if (!period) return res.status(404).json({ error: 'Academic period not found.' });
    await db.AcademicPeriod.update({ is_active: false }, { where: { academic_period_id: { [Op.ne]: period.academic_period_id } } });
    await period.update({ status: 'Active', is_active: true, closed_at: null });
    return res.json(period);
  } catch (err) {
    return next(err);
  }
};

exports.deletePeriod = async (req, res, next) => {
  try {
    const period = await db.AcademicPeriod.findByPk(Number(req.params.id));
    if (!period) return res.status(404).json({ error: 'Academic period not found.' });
    await period.destroy();
    return res.json({ ok: true, id: period.academic_period_id });
  } catch (err) {
    return next(err);
  }
};
