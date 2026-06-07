// routes/courseReferenceRoutes.js
const express = require('express');
const router = express.Router();
const referenceSummaryController = require('../controllers/referenceSummaryController');

// GET request matching standard RESTful parameter patterns for university courses
router.get('/courses/:code/references', referenceSummaryController.getReferenceSummary);

module.exports = router;