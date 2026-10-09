// routes/references.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/referenceController');
const { requirePermission } = require('../middleware/auth');

// Reads: any signed-in role.
// GET /api/references/types — field definitions per type (the form is built from this)
router.get('/types', controller.getReferenceTypes);
// GET /api/references — selectable (non-archived) references; ?includeArchived=1 for all
router.get('/', controller.getAllReferences);
// GET /api/references/library — all references + which courses use them (Reference Library)
router.get('/library', controller.getReferenceLibrary);
router.get('/:id', controller.getReference);

// Writes: reference:manage (the Director of Libraries only). There is no DELETE: references are archived.
const manage = requirePermission('reference:manage');
router.post('/import', manage, controller.importReferences);
router.post('/', manage, controller.createReference);
router.put('/:id/archive', manage, controller.archiveReference);
router.put('/:id/unarchive', manage, controller.unarchiveReference);
router.put('/:id', manage, controller.updateReference);

module.exports = router;
