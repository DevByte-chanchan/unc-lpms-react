'use strict';

const bcrypt = require('bcryptjs');
const db = require('../models');
const {
    signSessionToken,
    setSessionCookie,
    clearSessionCookie,
} = require('../utils/session');
const {
    normalizeRole,
    normalizeRoleList,
    pickDefaultActiveRole,
} = require('../utils/roles');
const { resolveSessionUser } = require('../middleware/auth');

function serializeSessionUser(account, overrideActiveRole) {
    const roles = normalizeRoleList(account.roles);
    const activeRole = pickDefaultActiveRole(roles, overrideActiveRole || account.active_role);
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

async function loadAccountWithRelations(where) {
    return db.UserAccount.findOne({
        where,
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
}

exports.login = async (req, res, next) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        const password = String(req.body?.password || '');

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const account = await loadAccountWithRelations({ email });
        if (!account) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (account.status !== 'Active') {
            return res.status(403).json({
                error: 'Your account is currently inactive. Please contact the administrator.',
            });
        }

        const valid = await bcrypt.compare(password, account.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const roles = normalizeRoleList(account.roles);
        const activeRole = pickDefaultActiveRole(roles, account.active_role);

        account.active_role = activeRole;
        account.last_login_at = new Date();
        await account.save();

        const token = signSessionToken({
            sub: account.id,
            email: account.email,
            roles,
            activeRole,
        });
        setSessionCookie(res, token);

        return res.json({ user: serializeSessionUser(account, activeRole) });
    } catch (err) {
        return next(err);
    }
};

exports.logout = (_req, res) => {
    clearSessionCookie(res);
    return res.json({ ok: true });
};

exports.me = async (req, res, next) => {
    try {
        const user = await resolveSessionUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }
        return res.json({ user });
    } catch (err) {
        return next(err);
    }
};

exports.switchRole = async (req, res, next) => {
    try {
        const requested = normalizeRole(req.body?.role);
        if (!requested) {
            return res.status(400).json({ error: 'A valid role is required.' });
        }

        const account = await loadAccountWithRelations({ id: req.user.id });
        if (!account || account.status !== 'Active') {
            clearSessionCookie(res);
            return res.status(401).json({ error: 'Account is no longer active.' });
        }

        const roles = normalizeRoleList(account.roles);
        if (!roles.includes(requested)) {
            return res.status(403).json({
                error: `You do not have permission to act as "${requested}".`,
            });
        }

        account.active_role = requested;
        await account.save();

        const token = signSessionToken({
            sub: account.id,
            email: account.email,
            roles,
            activeRole: requested,
        });
        setSessionCookie(res, token);

        return res.json({ user: serializeSessionUser(account, requested) });
    } catch (err) {
        return next(err);
    }
};

function validateNewPassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        return 'New password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
        return 'New password must include at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
        return 'New password must include at least one lowercase letter.';
    }
    if (!/[0-9]/.test(password)) {
        return 'New password must include at least one number.';
    }
    return null;
}

exports.changePassword = async (req, res, next) => {
    try {
        const currentPassword = String(req.body?.currentPassword || '');
        const newPassword = String(req.body?.newPassword || '');

        if (!currentPassword || !newPassword) {
            return res
                .status(400)
                .json({ error: 'Current password and new password are required.' });
        }

        const ruleError = validateNewPassword(newPassword);
        if (ruleError) {
            return res.status(400).json({ error: ruleError });
        }

        const account = await loadAccountWithRelations({ id: req.user.id });
        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        const matches = await bcrypt.compare(currentPassword, account.password_hash);
        if (!matches) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const sameAsOld = await bcrypt.compare(newPassword, account.password_hash);
        if (sameAsOld) {
            return res.status(400).json({
                error: 'New password must be different from your current password.',
            });
        }

        account.password_hash = await bcrypt.hash(newPassword, 10);
        account.must_change_password = false;
        await account.save();

        return res.json({
            ok: true,
            user: serializeSessionUser(account, account.active_role),
        });
    } catch (err) {
        return next(err);
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Please enter a valid institutional email address.' });
        }

        return res.json({
            ok: true,
            message:
                'If an active LPMS account matches that email, a temporary password has been sent.',
        });
    } catch (err) {
        return next(err);
    }
};
