'use strict';

const db = require('../models');

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function auditMiddleware(req, res, next) {
  if (!MUTATING.has(req.method)) return next();

  res.on('finish', () => {
    try {
      if (!db.AuditLog) return;
      const actor = req.user || {};
      const segments = String(req.originalUrl || req.url)
        .split('?')[0]
        .replace(/^\/api\//, '')
        .split('/')
        .filter(Boolean);
      const entityType = segments[0] || 'api';
      const entityId = segments[1] && /^\d+$/.test(segments[1]) ? segments[1] : null;
      const outcome = res.statusCode < 400 ? 'success' : 'error';

      db.AuditLog.create({
        actor_user_id: actor.id || null,
        actor_name: actor.name || null,
        actor_role: actor.activeRole || actor.role || null,
        action: `${req.method} ${req.baseUrl}${req.path}`.slice(0, 200),
        entity_type: entityType.slice(0, 60),
        entity_id: entityId,
        outcome,
        details: JSON.stringify({ statusCode: res.statusCode }),
        ip_address: String(req.ip || req.socket?.remoteAddress || '').slice(0, 64),
      }).catch(() => {});
    } catch {
      // Never block or crash requests on audit log failure
    }
  });

  return next();
}

module.exports = { auditMiddleware };
