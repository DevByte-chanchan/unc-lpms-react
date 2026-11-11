// routes/references.js
const express = require('express');
const router = express.Router();
const { getAllReferences, createReference, updateReference } = require('../controllers/referenceController');

// GET /api/references
router.get('/', getAllReferences);

// POST /api/references
router.post('/', createReference);

// PUT /api/references/:id
router.put('/:id', updateReference);

module.exports = router;
