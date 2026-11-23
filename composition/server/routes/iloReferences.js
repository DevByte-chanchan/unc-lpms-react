// routes/iloReferences.js
const express = require('express');
const router = express.Router();
const { getReferencesByILO, assignReferencesToILO, deleteILOReference, getPreviousReferences } = require('../controllers/iloReferenceController');

// GET /api/ilo-references/previous/:iloId
router.get('/previous/:iloId', getPreviousReferences);

// GET /api/ilo-references/:iloId
router.get('/:iloId', getReferencesByILO);

// POST /api/ilo-references/assign
router.post('/assign', assignReferencesToILO);

// DELETE /api/ilo-references/:iloReferenceId
router.delete('/:iloReferenceId', deleteILOReference);

module.exports = router;

