// routes/references.js
const express = require('express');
const router = express.Router();
const { getAllReferences, createReference, getReferenceLibrary } = require('../controllers/referenceController');

// GET /api/references
router.get('/', getAllReferences);

// GET /api/references/library — all references + which courses use them (Reference Library)
router.get('/library', getReferenceLibrary);

// POST /api/references
router.post('/', createReference);

module.exports = router;
