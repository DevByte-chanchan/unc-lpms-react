'use strict';

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const db = require('../../models');
const { normalizeEmail, normalizeRoleList } = require('../../utils/roles');

exports.listDepartments = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.status) where.status = req.query.status;
    if (req.query?.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { code: { [Op.like]: `%${req.query.search}%` } },
        { dean: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const rows = await db.Department.findAll({
      where,
      include: [
        { model: db.User, as: 'deanUser', attributes: ['user_id', 'name', 'email', 'status'], required: false },
        { model: db.Program, as: 'programs', attributes: ['program_id', 'code', 'name', 'program_head', 'status'], required: false },
      ],
      order: [['dept_id', 'ASC']],
    });
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const code = String(req.body?.code || '').trim().toUpperCase();
    if (!name || !code) {
      return res.status(400).json({ error: 'Department name and code are required.' });
    }

    const deanName = req.body?.dean ? String(req.body.dean).trim() : null;
    const deanEmail = req.body?.dean_email ? normalizeEmail(req.body.dean_email) : null;
    let stakeholderId = req.body?.stakeholder_id ? Number(req.body.stakeholder_id) : null;

    if (!stakeholderId && deanEmail) {
      const existingDean = await db.User.findOne({ where: { email: deanEmail } });
      if (existingDean) stakeholderId = existingDean.user_id;
    }

    const activePeriod = await db.AcademicPeriod.findOne({ where: { is_active: true } });

    const created = await db.Department.create({
      name,
      code,
      dean: deanName,
      dean_email: deanEmail,
      stakeholder_id: stakeholderId,
      status: req.body?.status || 'Active',
      academic_period_id: req.body?.academic_period_id || activePeriod?.academic_period_id || null,
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const dept = await db.Department.findByPk(Number(req.params.id));
    if (!dept) return res.status(404).json({ error: 'Department not found.' });

    const updates = {};
    if (req.body?.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body?.code !== undefined) updates.code = String(req.body.code).trim().toUpperCase();
    if (req.body?.dean !== undefined) updates.dean = req.body.dean ? String(req.body.dean).trim() : null;
    if (req.body?.dean_email !== undefined) updates.dean_email = req.body.dean_email ? normalizeEmail(req.body.dean_email) : null;
    if (req.body?.status !== undefined) updates.status = req.body.status;
    if (req.body?.stakeholder_id !== undefined) updates.stakeholder_id = req.body.stakeholder_id || null;

    if (updates.dean_email && !updates.stakeholder_id) {
      const deanUser = await db.User.findOne({ where: { email: updates.dean_email } });
      if (deanUser) updates.stakeholder_id = deanUser.user_id;
    }

    await dept.update(updates);
    return res.json(dept);
  } catch (err) {
    return next(err);
  }
};

exports.unlistDepartment = async (req, res, next) => {
  try {
    const dept = await db.Department.findByPk(Number(req.params.id));
    if (!dept) return res.status(404).json({ error: 'Department not found.' });
    const nextStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    await dept.update({ status: req.body?.status || nextStatus });
    return res.json(dept);
  } catch (err) {
    return next(err);
  }
};

exports.inviteDean = async (req, res, next) => {
  try {
    const dept = await db.Department.findByPk(Number(req.params.id));
    if (!dept) return res.status(404).json({ error: 'Department not found.' });

    const email = normalizeEmail(req.body?.email || dept.dean_email);
    const name = String(req.body?.name || dept.dean || `${dept.code} Dean`).trim();
    if (!email) return res.status(400).json({ error: 'Dean email is required to provision or invite account.' });

    let user = await db.User.findOne({ where: { email } });
    if (!user) {
      const hash = await bcrypt.hash('Dean@2026', 10);
      user = await db.User.create({
        name,
        email,
        password_hash: hash,
        role: 'Dean',
        roles: ['Dean'],
        active_role: 'Dean',
        status: 'Active',
        is_active: true,
      });
    } else {
      const roles = normalizeRoleList([...(user.roles || [user.role]), 'Dean']);
      await user.update({ roles, role: roles[0] });
    }

    await dept.update({ dean: name, dean_email: email, stakeholder_id: user.user_id });
    return res.json({ ok: true, department: dept, user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const dept = await db.Department.findByPk(Number(req.params.id));
    if (!dept) return res.status(404).json({ error: 'Department not found.' });
    await dept.destroy();
    return res.json({ ok: true, id: dept.dept_id });
  } catch (err) {
    return next(err);
  }
};
