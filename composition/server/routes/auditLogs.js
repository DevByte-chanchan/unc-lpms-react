const express = require('express');
const router = express.Router();
const { listAuditLogs } = require('../controllers/auditLogController');
const { requirePermission } = require('../middleware/auth');

// Read-only by design: there is no write, edit or delete route.
// Only the superuser role (added with user management) may read the trail.
router.get('/', requirePermission('audit:read'), listAuditLogs);

module.exports = router;
