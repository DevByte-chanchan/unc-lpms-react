'use strict';

const { Op } = require('sequelize');
const db = require('../../models');
const { normalizeRoleList } = require('../../utils/roles');

exports.listPrograms = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.dept_id || req.query?.department_id) {
      where.dept_id = Number(req.query.dept_id || req.query.department_id);
    }
    if (req.query?.status) where.status = req.query.status;
    if (req.query?.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { code: { [Op.like]: `%${req.query.search}%` } },
        { program_head: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const rows = await db.Program.findAll({
      where,
      include: [
        { model: db.Department, as: 'department', attributes: ['dept_id', 'name', 'code'], required: false },
        { model: db.Faculty, as: 'programHeadFaculty', attributes: ['faculty_id', 'name', 'email'], required: false },
      ],
      order: [['program_id', 'ASC']],
    });
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

exports.createProgram = async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const dept_id = Number(req.body?.dept_id || req.body?.department_id || req.user?.departmentId || 3);
    if (!name || !dept_id) {
      return res.status(400).json({ error: 'Program name and department are required.' });
    }

    let program_head = req.body?.program_head || null;
    let program_head_id = req.body?.program_head_id ? Number(req.body.program_head_id) : null;
    let stakeholder_id = req.body?.stakeholder_id ? Number(req.body.stakeholder_id) : null;

    if (program_head_id) {
      const fac = await db.Faculty.findByPk(program_head_id);
      if (fac) {
        program_head = program_head || fac.name;
        if (fac.email) {
          const u = await db.User.findOne({ where: { email: fac.email } });
          if (u) {
            stakeholder_id = u.user_id;
            const roles = normalizeRoleList([...(u.roles || [u.role]), 'Program Head']);
            await u.update({ roles });
          }
        }
      }
    }

    const activePeriod = await db.AcademicPeriod.findOne({ where: { is_active: true } });

    const created = await db.Program.create({
      code: req.body?.code ? String(req.body.code).trim().toUpperCase() : null,
      name,
      dept_id,
      program_head,
      program_head_id,
      stakeholder_id,
      status: req.body?.status || 'Active',
      academic_period_id: req.body?.academic_period_id || activePeriod?.academic_period_id || null,
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.updateProgram = async (req, res, next) => {
  try {
    const program = await db.Program.findByPk(Number(req.params.id));
    if (!program) return res.status(404).json({ error: 'Program not found.' });

    const updates = {};
    if (req.body?.code !== undefined) updates.code = req.body.code ? String(req.body.code).trim().toUpperCase() : null;
    if (req.body?.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body?.dept_id !== undefined || req.body?.department_id !== undefined) {
      updates.dept_id = Number(req.body.dept_id || req.body.department_id);
    }
    if (req.body?.status !== undefined) updates.status = req.body.status;
    if (req.body?.program_head !== undefined) updates.program_head = req.body.program_head;
    if (req.body?.program_head_id !== undefined) {
      updates.program_head_id = req.body.program_head_id ? Number(req.body.program_head_id) : null;
      if (updates.program_head_id) {
        const fac = await db.Faculty.findByPk(updates.program_head_id);
        if (fac) {
          updates.program_head = fac.name;
          const u = fac.email ? await db.User.findOne({ where: { email: fac.email } }) : null;
          if (u) {
            updates.stakeholder_id = u.user_id;
            const roles = normalizeRoleList([...(u.roles || [u.role]), 'Program Head']);
            await u.update({ roles });
          }
        }
      }
    }

    await program.update(updates);
    return res.json(program);
  } catch (err) {
    return next(err);
  }
};

exports.deleteProgram = async (req, res, next) => {
  try {
    const program = await db.Program.findByPk(Number(req.params.id));
    if (!program) return res.status(404).json({ error: 'Program not found.' });
    await program.destroy();
    return res.json({ ok: true, id: program.program_id });
  } catch (err) {
    return next(err);
  }
};
