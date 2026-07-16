const express = require('express');
const router = express.Router();
const { getCoaepByCourse } = require('../controllers/coaepController');

// GET /api/coaep/:code — COAEP content (COs, ILOs, assessment tools) for a course
router.get('/:code', getCoaepByCourse);

module.exports = router;
