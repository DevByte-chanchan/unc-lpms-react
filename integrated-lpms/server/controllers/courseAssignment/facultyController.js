'use strict';

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const db = require('../../models');
const { normalizeEmail, normalizeRoleList, toCanonicalRole } = require('../../utils/roles');

exports.listFaculty = async (req, res, next) => {
  try {
    const where = {};
    if (req.query?.department_id) where.department_id = Number(req.query.department_id);
    if (req.query?.status) where.status = req.query.status;
    if (req.query?.role) where.role = req.query.role;
    if (req.query?.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { email: { [Op.like]: `%${req.query.search}%` } },
        { department: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    const rows = await db.Faculty.findAll({
      where,
      include: [{ model: db.Department, as: 'departmentRef', attributes: ['dept_id', 'name', 'code'], required: false }],
      order: [['faculty_id', 'ASC']],
    });

    // Attach linked user account status
    const users = await db.User.findAll({ attributes: ['user_id', 'email', 'faculty_id', 'roles', 'status'] });
    const byFacId = new Map();
    const byEmail = new Map();
    for (const u of users) {
      if (u.faculty_id) byFacId.set(u.faculty_id, u);
      if (u.email) byEmail.set(u.email.toLowerCase(), u);
    }

    const enriched = rows.map((f) => {
      const json = f.toJSON();
      const linked = byFacId.get(f.faculty_id) || (f.email ? byEmail.get(f.email.toLowerCase()) : null);
      json.user_id = linked?.user_id || null;
      json.hasAccount = Boolean(linked);
      json.accountStatus = linked?.status || null;
      return json;
    });

    return res.json(enriched);
  } catch (err) {
    return next(err);
  }
};

exports.createFaculty = async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Faculty name is required.' });

    const email = req.body?.email ? normalizeEmail(req.body.email) : null;
    const role = toCanonicalRole(req.body?.role || req.body?.position) || 'Instructor';
    let department_id = req.body?.department_id ? Number(req.body.department_id) : (req.user?.departmentId || 3);
    let department = req.body?.department || null;

    if (department_id && !department) {
      const dept = await db.Department.findByPk(department_id);
      if (dept) department = dept.name;
    }

    const activePeriod = await db.AcademicPeriod.findOne({ where: { is_active: true } });

    const created = await db.Faculty.create({
      name,
      role,
      department,
      department_id,
      employment_type: req.body?.employment_type || 'Full-time',
      status: req.body?.status || 'Active',
      about: req.body?.about || null,
      sex: req.body?.sex || null,
      birthdate: req.body?.birthdate || null,
      email,
      contact_number: req.body?.contact_number || null,
      academic_period_id: req.body?.academic_period_id || activePeriod?.academic_period_id || null,
    });

    // Auto-provision or link User account if email is given
    if (email && req.body?.provisionAccount !== false) {
      let user = await db.User.findOne({ where: { email } });
      if (!user) {
        const hash = await bcrypt.hash('Instructor@2026', 10);
        await db.User.create({
          name,
          email,
          password_hash: hash,
          role,
          roles: [role],
          active_role: role,
          faculty_id: created.faculty_id,
          status: 'Active',
          is_active: true,
        });
      } else if (!user.faculty_id) {
        await user.update({ faculty_id: created.faculty_id });
      }
    }

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

exports.updateFaculty = async (req, res, next) => {
  try {
    const fac = await db.Faculty.findByPk(Number(req.params.id));
    if (!fac) return res.status(404).json({ error: 'Faculty member not found.' });

    const fields = ['name', 'role', 'department', 'department_id', 'employment_type', 'status', 'about', 'sex', 'birthdate', 'email', 'contact_number'];
    const updates = {};
    for (const f of fields) {
      if (req.body?.[f] !== undefined) updates[f] = req.body[f];
    }
    if (updates.email) updates.email = normalizeEmail(updates.email);
    await fac.update(updates);
    return res.json(fac);
  } catch (err) {
    return next(err);
  }
};

exports.inactivateFaculty = async (req, res, next) => {
  try {
    const fac = await db.Faculty.findByPk(Number(req.params.id));
    if (!fac) return res.status(404).json({ error: 'Faculty member not found.' });
    const nextStatus = fac.status === 'Active' ? 'Inactive' : 'Active';
    await fac.update({ status: req.body?.status || nextStatus });
    return res.json(fac);
  } catch (err) {
    return next(err);
  }
};

exports.inviteFaculty = async (req, res, next) => {
  try {
    const fac = await db.Faculty.findByPk(Number(req.params.id));
    if (!fac) return res.status(404).json({ error: 'Faculty member not found.' });
    const email = normalizeEmail(req.body?.email || fac.email);
    if (!email) return res.status(400).json({ error: 'Faculty email is required.' });

    let user = await db.User.findOne({ where: { email } });
    const role = toCanonicalRole(fac.role) || 'Instructor';
    if (!user) {
      const hash = await bcrypt.hash('Instructor@2026', 10);
      user = await db.User.create({
        name: fac.name,
        email,
        password_hash: hash,
        role,
        roles: [role],
        active_role: role,
        faculty_id: fac.faculty_id,
        status: 'Active',
        is_active: true,
      });
    } else {
      const roles = normalizeRoleList([...(user.roles || [user.role]), role]);
      await user.update({ roles, role: roles[0], faculty_id: fac.faculty_id });
    }
    return res.json({ ok: true, faculty: fac, user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
};

exports.deleteFaculty = async (req, res, next) => {
  try {
    const fac = await db.Faculty.findByPk(Number(req.params.id));
    if (!fac) return res.status(404).json({ error: 'Faculty member not found.' });
    await fac.destroy();
    return res.json({ ok: true, id: fac.faculty_id });
  } catch (err) {
    return next(err);
  }
};
