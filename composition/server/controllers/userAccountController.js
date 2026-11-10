'use strict';

// User Accounts (feature/course-assignment): the VPAA manages the accounts, and so does the superuser.
//
//   GET   /api/user-accounts                        every account, with its roles and latest invitation
//   POST  /api/user-accounts                        { email, name, roles }          create (temporary password)
//   PATCH /api/user-accounts/:id                    { name?, email?, roles?, status? }
//   POST  /api/user-accounts/:id/reset-password     a new temporary password (and the lockout cleared)
//   POST  /api/user-accounts/:id/send-invitation    e-mail a set-password link now
//   POST  /api/user-accounts/:id/send-password-reset  e-mail a one-hour reset link now
//
// A temporary password is e-mailed when SMTP is set up, otherwise returned ONCE for the administrator to hand
// over (never stored in the clear). A link that could not be e-mailed is likewise returned once.
//
// Safety rules (enforced here, not in the page):
//   * only a superuser grants, removes or edits the superuser role, and the superuser role stands alone
//   * nobody disables their own account or removes their own account-management role
//   * the last active superuser can be neither disabled nor demoted
//   * a role change, a disabled account or a new password signs that person out everywhere (utils/jwtSession.js)
// Every change goes to the audit trail with ids and old / new values only.

const { User, sequelize, Sequelize } = require('../models');
const { sortRoles, validRoles } = require('../models/user');
const { helpers } = require('./userController');
const links = require('../utils/accountLinks');

const { newTemporaryCredential, deliverCredentials, auditChange, activeSuperuserCountExcluding } = helpers;

const ROLE_KEYS = User.ROLE_KEYS;
const ROLE_LABEL = {
    instructor: 'Instructor',
    'program-head': 'Program Head',
    'director-of-libraries': 'Director of Libraries',
    'industry-consultant': 'Industry Consultant',
    dean: 'Dean',
    vpaa: 'VPAA',
    superuser: 'Superuser'
};
const STATUSES = ['Active', 'Disabled'];
const MANAGER_ROLES = ['vpaa', 'superuser'];

// Account e-mails are university addresses (ALLOWED_EMAIL_DOMAIN, default unc.edu.ph): exact domain, no
// subdomains or look-alikes.
const allowedDomain = () => String(process.env.ALLOWED_EMAIL_DOMAIN || 'unc.edu.ph').trim().toLowerCase();
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const isAllowedEmail = (value) => {
    const email = normalizeEmail(value);
    const at = email.lastIndexOf('@');
    if (at <= 0 || email.indexOf('@') !== at) return false;
    if (!/^[a-z0-9._%+-]+$/.test(email.slice(0, at))) return false;
    return email.slice(at + 1) === allowedDomain();
};
const domainMessage = () => `Use an @${allowedDomain()} email address.`;
const cleanName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const isSuperuser = (req) => req.user?.role === 'superuser';
const rolesMessage = () => `Roles must be one or more of: ${ROLE_KEYS.filter(k => k !== 'superuser').map(k => ROLE_LABEL[k]).join(', ')} (or Superuser on its own).`;

// ---------------------------------------------------------------- links to the school's records
//
// Programs.stakeholder_id is the Program Head, Departments.stakeholder_id the Dean, CourseOfferingAssignments the
// lead instructor, CourseConsultants the industry consultant. A role is not removed, and an account not disabled,
// while one of these still points at it: the program, course or link would be left with nobody able to act.
const select = (sql, r = []) => sequelize.query(sql, { replacements: r, type: Sequelize.QueryTypes.SELECT });

const linksOf = async (userId) => {
    const [programs, departments, courses, consults] = await Promise.all([
        select('SELECT program_id AS id, name FROM Programs WHERE stakeholder_id = ? ORDER BY name', [userId]),
        select('SELECT dept_id AS id, name FROM Departments WHERE stakeholder_id = ? ORDER BY name', [userId]),
        // Courses still in progress (not approved): an approved plan stays its author's record.
        select(`SELECT DISTINCT c.course_no FROM CourseOfferingAssignments a
                    INNER JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = a.pc_offering_id
                    INNER JOIN Courses c ON c.course_id = pco.course_id
                WHERE a.stakeholder_id = ? AND pco.approved_at IS NULL ORDER BY c.course_no`, [String(userId)]),
        select(`SELECT DISTINCT c.course_no FROM CourseConsultants cc INNER JOIN Courses c ON c.course_id = cc.course_id
                WHERE cc.consultant_user_id = ? ORDER BY c.course_no`, [userId]),
    ]);
    return { programs, departments, courses: courses.map(c => c.course_no), consults: consults.map(c => c.course_no) };
};

// The links that need a role the account would no longer hold (or any, when it is being disabled). '' when none.
const strandedMessage = (links, roles, active) => {
    const keeps = (role) => active && roles.includes(role);
    const problems = [];
    if (links.programs.length && !keeps('program-head')) problems.push(`heads ${links.programs.map(p => p.name).join(', ')} — give the program another Program Head first (tick it on that account)`);
    if (links.departments.length && !keeps('dean')) problems.push(`is Dean of ${links.departments.map(d => d.name).join(', ')} — give the department another Dean first`);
    if (links.courses.length && !keeps('instructor')) problems.push(`leads ${links.courses.join(', ')} — reassign them in Course Assignment first`);
    if (links.consults.length && !keeps('industry-consultant')) problems.push(`is the industry consultant of ${links.consults.join(', ')} — remove those links first`);
    return problems.length ? `This account ${problems.join('; it ')}.` : '';
};

const asIds = (list) => (Array.isArray(list) ? [...new Set(list.map(Number).filter(n => Number.isInteger(n) && n > 0))] : null);

const present = (user, invitation = null, links = null) => ({
    id: user.user_id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    status: user.is_active ? 'Active' : 'Disabled',
    mustChangePassword: Boolean(user.must_change_password),
    locked: Boolean(user.locked_until) && new Date(user.locked_until) > new Date(),
    lastLoginAt: user.last_login_at,
    createdAt: user.createdAt,
    invitation,
    heads: links ? { programs: links.programs, departments: links.departments } : undefined,
});

const loadTarget = async (req, res) => {
    const id = Number(req.params.id);
    const target = Number.isInteger(id) && id > 0 ? await User.findByPk(id) : null;
    if (!target) {
        res.status(404).json({ error: 'That account no longer exists.' });
        return null;
    }
    // A VPAA does not manage superuser accounts.
    if (target.roles.includes('superuser') && !isSuperuser(req)) {
        res.status(403).json({ error: 'Only a superuser can change a superuser account.' });
        return null;
    }
    return target;
};

const linkOutcome = (result, sentMessage) => {
    if (result.limited) return { status: 429, body: { error: result.reason } };
    if (result.delivered) return { status: 200, body: { message: sentMessage } };
    // Not e-mailed (no SMTP, or it failed): the link is shown once so the administrator can hand it over.
    return { status: 200, body: { message: `Not e-mailed: ${result.reason} Copy the link below and give it to the person; it is shown once.`, link: result.link } };
};

const listAccounts = async (req, res, next) => {
    try {
        const users = await User.findAll({ order: [['name', 'ASC']] });
        const invitations = await links.invitationSummaries(users.map(u => u.user_id));
        const visible = isSuperuser(req) ? users : users.filter(u => !u.roles.includes('superuser'));
        const [programs, departments] = await Promise.all([
            select('SELECT program_id AS id, name, stakeholder_id AS headId FROM Programs ORDER BY name'),
            select('SELECT dept_id AS id, name, stakeholder_id AS headId FROM Departments ORDER BY name'),
        ]);
        const headed = (list, userId) => list.filter(x => String(x.headId) === String(userId)).map(({ id, name }) => ({ id, name }));
        return res.json({
            accounts: visible.map(u => present(u, invitations[u.user_id] || null, { programs: headed(programs, u.user_id), departments: headed(departments, u.user_id) })),
            programs,
            departments,
            roles: ROLE_KEYS.filter(key => key !== 'superuser' || isSuperuser(req)).map(key => ({ key, label: ROLE_LABEL[key] })),
            domain: allowedDomain()
        });
    } catch (err) {
        return next(err);
    }
};

const createAccount = async (req, res, next) => {
    try {
        const body = req.body || {};
        const email = normalizeEmail(body.email);
        const name = cleanName(body.name);
        const roles = Array.isArray(body.roles) ? body.roles : [];
        if (!isAllowedEmail(email)) return res.status(400).json({ error: domainMessage(), field: 'email' });
        if (!name) return res.status(400).json({ error: 'A name is required.', field: 'name' });
        if (name.length > 120) return res.status(400).json({ error: 'The name is too long (120 characters at most).', field: 'name' });
        if (!validRoles(roles)) return res.status(400).json({ error: rolesMessage(), field: 'roles' });
        if (roles.includes('superuser') && !isSuperuser(req)) {
            return res.status(403).json({ error: 'Only a superuser can create a superuser account.', field: 'roles' });
        }
        if (await User.findOne({ where: { email } })) {
            return res.status(409).json({ error: 'An account with that email already exists.', field: 'email' });
        }

        const credential = await newTemporaryCredential();
        const user = await User.create({ name, email, role: sortRoles(roles)[0], roles, ...credential.fields });
        await auditChange(req, 'USER_CREATED', user, { new_roles: user.roles });
        const delivery = await deliverCredentials(req, user, credential);
        return res.status(201).json({ account: present(user), ...delivery });
    } catch (err) {
        if (err?.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'An account with that email already exists.', field: 'email' });
        }
        return next(err);
    }
};

const updateAccount = async (req, res, next) => {
    try {
        const target = await loadTarget(req, res);
        if (!target) return undefined;
        const body = req.body || {};
        const self = target.user_id === req.user.id;
        const before = { name: target.name, email: target.email, roles: target.roles, status: target.is_active ? 'Active' : 'Disabled' };

        if (body.email !== undefined) {
            const email = normalizeEmail(body.email);
            if (!isAllowedEmail(email)) return res.status(400).json({ error: domainMessage(), field: 'email' });
            if (email !== target.email && await User.findOne({ where: { email } })) {
                return res.status(409).json({ error: 'An account with that email already exists.', field: 'email' });
            }
            target.email = email;
        }
        if (body.name !== undefined) {
            const name = cleanName(body.name);
            if (!name || name.length > 120) return res.status(400).json({ error: 'A name is required (120 characters at most).', field: 'name' });
            target.name = name;
        }
        if (body.roles !== undefined) {
            const roles = Array.isArray(body.roles) ? body.roles : [];
            if (!validRoles(roles)) return res.status(400).json({ error: rolesMessage(), field: 'roles' });
            const touchesSuperuser = roles.includes('superuser') !== target.roles.includes('superuser');
            if (touchesSuperuser && !isSuperuser(req)) {
                return res.status(403).json({ error: 'Only a superuser can grant or remove the superuser role.', field: 'roles' });
            }
            if (self && !roles.includes(req.user.role) && MANAGER_ROLES.includes(req.user.role)) {
                return res.status(400).json({ error: 'You cannot remove your own account-management role.', field: 'roles' });
            }
            if (target.roles.includes('superuser') && !roles.includes('superuser') && target.is_active
                && (await activeSuperuserCountExcluding(target.user_id)) === 0) {
                return res.status(409).json({ error: 'This is the last active superuser; give another account the role first.', field: 'roles' });
            }
            target.roles = roles;
        }
        if (body.status !== undefined) {
            if (!STATUSES.includes(body.status)) return res.status(400).json({ error: 'Status must be Active or Disabled.', field: 'status' });
            const active = body.status === 'Active';
            if (self && !active) return res.status(400).json({ error: 'You cannot disable your own account.', field: 'status' });
            if (!active && target.roles.includes('superuser') && target.is_active
                && (await activeSuperuserCountExcluding(target.user_id)) === 0) {
                return res.status(409).json({ error: 'This is the last active superuser; it cannot be disabled.', field: 'status' });
            }
            target.is_active = active;
        }

        const current = await linksOf(target.user_id);
        const wanted = {
            programs: body.programs === undefined ? current.programs.map(p => p.id) : asIds(body.programs),
            departments: body.departments === undefined ? current.departments.map(d => d.id) : asIds(body.departments),
        };
        if (!wanted.programs || !wanted.departments) return res.status(400).json({ error: 'programs and departments must be lists of ids.' });
        // Unticking alone would leave the program / department with nobody at its head: it is moved, not dropped.
        const dropped = [
            ...current.programs.filter(p => !wanted.programs.includes(p.id)).map(p => p.name),
            ...current.departments.filter(d => !wanted.departments.includes(d.id)).map(d => d.name),
        ];
        if (dropped.length) {
            return res.status(409).json({ error: `${dropped.join(', ')} would have no head. Tick it on the account that takes it over instead.`, field: 'heads' });
        }
        if (wanted.programs.length > current.programs.length && !target.roles.includes('program-head')) {
            return res.status(400).json({ error: 'Only a Program Head can head a program: give this account the Program Head role.', field: 'heads' });
        }
        if (wanted.departments.length > current.departments.length && !target.roles.includes('dean')) {
            return res.status(400).json({ error: 'Only a Dean can lead a department: give this account the Dean role.', field: 'heads' });
        }
        const [knownPrograms, knownDepartments] = await Promise.all([
            wanted.programs.length ? select('SELECT program_id AS id FROM Programs WHERE program_id IN (?)', [wanted.programs]) : [],
            wanted.departments.length ? select('SELECT dept_id AS id FROM Departments WHERE dept_id IN (?)', [wanted.departments]) : [],
        ]);
        if (knownPrograms.length !== wanted.programs.length || knownDepartments.length !== wanted.departments.length) {
            return res.status(404).json({ error: 'A program or department does not exist.', field: 'heads' });
        }
        const stranded = strandedMessage(
            { ...current, programs: wanted.programs, departments: wanted.departments },
            target.roles, target.is_active
        );
        if (stranded) return res.status(409).json({ error: stranded, field: 'roles' });

        await sequelize.transaction(async (transaction) => {
            await target.save({ transaction });
            const take = async (table, key, ids) => {
                if (ids.length) await sequelize.query(`UPDATE ${table} SET stakeholder_id = ? WHERE ${key} IN (?)`, { replacements: [target.user_id, ids], transaction });
            };
            await take('Programs', 'program_id', wanted.programs);
            await take('Departments', 'dept_id', wanted.departments);
        });
        const added = {
            programs: wanted.programs.filter(id => !current.programs.some(p => p.id === id)),
            departments: wanted.departments.filter(id => !current.departments.some(d => d.id === id)),
        };
        if (added.programs.length || added.departments.length) await auditChange(req, 'USER_HEADS_CHANGED', target, { new_programs: added.programs, new_departments: added.departments });
        const after = { name: target.name, email: target.email, roles: target.roles, status: target.is_active ? 'Active' : 'Disabled' };
        const changed = Object.keys(after).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
        if (changed.length) {
            await auditChange(req, 'USER_UPDATED', target, Object.fromEntries(changed.flatMap(key => [[`old_${key}`, before[key]], [`new_${key}`, after[key]]])));
        }
        return res.json({ account: present(target, null, await linksOf(target.user_id)) });
    } catch (err) {
        return next(err);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const target = await loadTarget(req, res);
        if (!target) return undefined;
        const credential = await newTemporaryCredential();
        await target.update({ ...credential.fields, failed_attempts: 0, locked_until: null });
        await auditChange(req, 'USER_PASSWORD_RESET', target, {});
        const delivery = await deliverCredentials(req, target, credential);
        return res.json({ account: present(target), ...delivery });
    } catch (err) {
        return next(err);
    }
};

const sendInvitationNow = async (req, res, next) => {
    try {
        const target = await loadTarget(req, res);
        if (!target) return undefined;
        if (!target.is_active) return res.status(400).json({ error: 'This account is disabled. Enable it before inviting.' });
        // Someone who has set their own password needs a reset link, not an invitation.
        if (!target.must_change_password && target.last_login_at) {
            return res.status(409).json({ error: `${target.name} has already set a password. Use "Send password reset" instead.` });
        }
        const result = await links.sendInvitation(target, { senderId: req.user.id, roleLabels: target.roles.map(key => ROLE_LABEL[key]) });
        await auditChange(req, 'INVITATION_SENT', target, { delivery: result.delivered ? 'email' : 'shown' });
        const [summary] = Object.values(await links.invitationSummaries([target.user_id]));
        const outcome = linkOutcome(result, `Invitation sent to ${target.email}.`);
        return res.status(outcome.status).json({ ...outcome.body, invitation: summary || null });
    } catch (err) {
        return next(err);
    }
};

const sendPasswordResetNow = async (req, res, next) => {
    try {
        const target = await loadTarget(req, res);
        if (!target) return undefined;
        if (!target.is_active) return res.status(400).json({ error: 'This account is disabled. Enable it first.' });
        const result = await links.sendPasswordReset(target, { ip: req.ip });
        if (!result.limited) await auditChange(req, 'PASSWORD_RESET_LINK_SENT', target, { delivery: result.delivered ? 'email' : 'shown' });
        const outcome = linkOutcome(result, `Password reset link sent to ${target.email}.`);
        return res.status(outcome.status).json(outcome.body);
    } catch (err) {
        return next(err);
    }
};

module.exports = { listAccounts, createAccount, updateAccount, resetPassword, sendInvitationNow, sendPasswordResetNow, ROLE_LABEL };
