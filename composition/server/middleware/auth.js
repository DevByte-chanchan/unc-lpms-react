'use strict';

const db = require('../models');
const { COOKIE_NAME, verifySessionToken } = require('../utils/session');
const { normalizeRole, normalizeRoleList, pickDefaultActiveRole } = require('../utils/roles');

async function resolveSessionUser(req) {
    const token =
        req.cookies?.[COOKIE_NAME] ||
        (req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : null);

    const payload = verifySessionToken(token);
    if (!payload?.sub) return null;

    const account = await db.UserAccount.findByPk(payload.sub, {
        include: [
            {
                model: db.Faculty,
                as: 'faculty',
                include: db.Department ? [{ model: db.Department, as: 'department' }] : [],
            },
            {
                model: db.IndustryConsultant,
                as: 'consultant',
            },
        ],
    });

    if (!account || account.status !== 'Active') return null;

    const roles = normalizeRoleList(account.roles);
    const activeRole = pickDefaultActiveRole(roles, payload.activeRole || account.active_role);

    return {
        id: account.id,
        email: account.email,
        name: account.full_name,
        roles,
        activeRole,
        role: activeRole,
        facultyId: account.faculty_id || null,
        industryConsultantId: account.industry_consultant_id || null,
        departmentId: account.faculty?.department_id || null,
        departmentCode: account.faculty?.department?.code || null,
        departmentName: account.faculty?.department?.name || null,
        mustChangePassword: Boolean(account.must_change_password),
        status: account.status,
    };
}

async function attachUser(req, _res, next) {
    try {
        req.user = await resolveSessionUser(req);
    } catch {
        req.user = null;
    }
    next();
}

async function requireAuth(req, res, next) {
    try {
        const user = req.user || (await resolveSessionUser(req));
        if (!user) {
            return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }
        req.user = user;
        return next();
    } catch (err) {
        return next(err);
    }
}

function requireRole(...allowed) {
    const allowedSet = new Set(allowed.map((r) => normalizeRole(r)).filter(Boolean));
    return async (req, res, next) => {
        try {
            const user = req.user || (await resolveSessionUser(req));
            if (!user) {
                return res.status(401).json({ error: 'Authentication required. Please log in.' });
            }
            req.user = user;
            if (allowedSet.size > 0 && !allowedSet.has(user.activeRole)) {
                return res.status(403).json({
                    error: `Access denied. Required role: ${Array.from(allowedSet).join(' or ')}.`,
                });
            }
            return next();
        } catch (err) {
            return next(err);
        }
    };
}

module.exports = {
    resolveSessionUser,
    attachUser,
    requireAuth,
    requireRole,
};
