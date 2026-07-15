// routes/syllabusRoutes.js
const express = require('express');
const router = express.Router();
// Updated import to reflect the version-controlled controller function name
const { getILOsByPcOffering } = require('../controllers/iloController');

// GET /api/ilos/:pcId/:revNum
router.get('/:pcId/:revNum', getILOsByPcOffering);

module.exports = router;