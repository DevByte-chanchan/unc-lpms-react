'use strict';

const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const db = require('../../models');
const { normalizeEmail, normalizeRoleList, pickDefaultActiveRole, toKebabRole } = require('../../utils/roles');

exports.listAccounts = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const users = await db.User.findAll({
      where,
      order: [['user_id', 'ASC']],
    });

    let rows = users.map((u) => {
      const json = u.toJSON();
      json.kebabRoles = normalizeRoleList(u.roles || u.role).map(toKebabRole);
      return json;
    });

    if (role) {
      const target = String(role).toLowerCase();
      rows = rows.filter((u) =>
        u.roles.some((r) => r.toLowerCase() === target || toKebabRole(r) === target)
      );
    }

    return res.json({ accounts: rows, users: rows, total: rows.length });
  } catch (err) {
    return next(err);
  }
};

exports.createAccount = async (req, res, next) => {
  try {
    const name = String(req.body?.name || req.body?.full_name || req.body?.display_name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || 'UncLpms@2026');
    const roles = normalizeRoleList(req.body?.roles || req.body?.role || ['Instructor']);

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const created = await db.User.create({
      name,
      email,
      password_hash: hash,
      role: roles[0],
      roles,
      active_role: pickDefaultActiveRole(roles),
      faculty_id: req.body?.faculty_id || null,
      industry_consultant_id: req.body?.industry_consultant_id || null,
      must_change_password: Boolean(req.body?.must_change_password),
      status: 'Active',
      is_active: true,
    });

    return res.status(201).json({ account: created.toJSON(), user: created.toJSON() });
  } catch (err) {
    return next(err);
  }
};

exports.updateAccount = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User account not found.' });

    const updates = {};
    if (req.body?.name || req.body?.full_name) updates.name = String(req.body.name || req.body.full_name).trim();
    if (req.body?.email) updates.email = normalizeEmail(req.body.email);
    if (req.body?.roles || req.body?.role) {
      const roles = normalizeRoleList(req.body.roles || req.body.role);
      updates.roles = roles;
      updates.role = roles[0];
      updates.active_role = pickDefaultActiveRole(roles, req.body.active_role || user.active_role);
    }
    if (req.body?.status) {
      updates.status = req.body.status;
      updates.is_active = req.body.status !== 'Disabled';
    }
    if (typeof req.body?.is_active === 'boolean') {
      updates.is_active = req.body.is_active;
      updates.status = req.body.is_active ? 'Active' : 'Disabled';
    }
    if (req.body?.password && String(req.body.password).length >= 8) {
      updates.password_hash = await bcrypt.hash(String(req.body.password), 10);
      updates.password_changed_at = new Date();
    }

    await user.update(updates);
    return res.json({ account: user.toJSON(), user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
};

exports.toggleStatus = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(Number(req.params.id));
    if (!user) return res.status(404).json({ error: 'User account not found.' });
    const nextActive = typeof req.body?.is_active === 'boolean' ? req.body.is_active : !user.is_active;
    await user.update({ is_active: nextActive, status: nextActive ? 'Active' : 'Disabled' });
    return res.json({ account: user.toJSON(), user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
};

exports.listAuditLogs = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query?.limit || 100), 500);
    const offset = Math.max(Number(req.query?.offset || 0), 0);
    const where = {};
    if (req.query?.entity_type) where.entity_type = req.query.entity_type;
    if (req.query?.actor_user_id) where.actor_user_id = Number(req.query.actor_user_id);

    const { rows, count } = await db.AuditLog.findAndCountAll({
      where,
      order: [['audit_id', 'DESC']],
      limit,
      offset,
    });
    return res.json({ logs: rows, total: count, limit, offset });
  } catch (err) {
    return next(err);
  }
};
