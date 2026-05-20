// routes/references.js
const express = require('express');
const router = express.Router();
const { getAllReferences, createReference } = require('../controllers/referenceController');

// GET /api/references
router.get('/', getAllReferences);

// POST /api/references
router.post('/', createReference);

module.exports = router;
