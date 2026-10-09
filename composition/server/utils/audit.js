'use strict';

// Audit trail writer. `record` never throws: a failed audit write must not break the
// request it describes (it is reported on the console instead).
//
// Never put passwords, tokens or request bodies in `details`.

const lazyModel = () => require('../models').AuditLog;

const createAuditor = ({ getModel = lazyModel, log = console.error } = {}) => {
    const record = async ({ actor, action, entityType, entityId, outcome = 'success', details, ip }) => {
        try {
            await getModel().create({
                actor_user_id: actor?.id ?? null,
                actor_name: actor?.name ?? null,
                actor_role: actor?.role ?? null,
                action: String(action).slice(0, 200),
                entity_type: entityType ?? null,
                entity_id: entityId == null ? null : String(entityId),
                outcome,
                details: details == null ? null : JSON.stringify(details),
                ip_address: ip ?? null
            });
            return true;
        } catch (error) {
            log('Audit write failed (the request continues):', error.message);
            return false;
        }
    };
    return { record };
};

// "POST /api/assignments/action" -> entity "assignments"; first numeric path segment is the id.
const describePath = (path) => {
    const parts = path.split('/').filter(Boolean).slice(1);
    return { entityType: parts[0] ?? null, entityId: parts.find(p => /^\d+$/.test(p)) ?? null };
};

// Only these body keys are safe to keep (workflow actions); everything else stays out.
const SAFE_BODY_KEYS = ['action_type', 'actor_role', 'pcId'];

// Logs every state-changing /api request once it finishes, including refused ones.
const createAuditMiddleware = (auditor) => (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const actor = req.user;
    res.on('finish', () => {
        const path = String(req.originalUrl || req.url).split('?')[0];
        const status = res.statusCode;
        const details = { status };
        for (const key of SAFE_BODY_KEYS) if (req.body?.[key] != null) details[key] = req.body[key];
        auditor.record({
            actor,
            action: `${req.method} ${path}`,
            ...describePath(path),
            outcome: status < 400 ? 'success' : (status === 401 || status === 403 ? 'denied' : 'failed'),
            details,
            ip: req.ip
        });
    });
    return next();
};

const auditor = createAuditor();

module.exports = {
    createAuditor,
    createAuditMiddleware,
    describePath,
    record: auditor.record,
    auditMiddleware: createAuditMiddleware(auditor)
};
