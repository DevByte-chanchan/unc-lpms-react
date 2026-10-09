const { Op } = require('sequelize');
const { AuditLog } = require('../models');

// Read-only: newest first, filterable by actor, outcome, action text and date range.
const listAuditLogs = async (req, res, next) => {
    try {
        const { actor_user_id, outcome, q, from, to } = req.query;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
        const where = {};
        if (actor_user_id) where.actor_user_id = Number(actor_user_id);
        if (outcome) where.outcome = String(outcome);
        if (q) where.action = { [Op.like]: `%${String(q).replace(/[%_]/g, '')}%` };
        const range = {};
        if (from && !Number.isNaN(Date.parse(from))) range[Op.gte] = new Date(from);
        if (to && !Number.isNaN(Date.parse(to))) range[Op.lte] = new Date(to);
        if (Reflect.ownKeys(range).length) where.createdAt = range;
        const { rows, count } = await AuditLog.findAndCountAll({ where, order: [['audit_id', 'DESC']], limit, offset });
        return res.json({ total: count, rows });
    } catch (err) {
        return next(err);
    }
};

module.exports = { listAuditLogs };
