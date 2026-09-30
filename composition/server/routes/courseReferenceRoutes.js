// routes/courseReferenceRoutes.js
const express = require('express');
const router = express.Router();
const referenceSummaryController = require('../controllers/referenceSummaryController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');

// GET request matching standard RESTful parameter patterns for university courses
router.get('/courses/:pcId/:revNum/references', requireOfferingAccess, referenceSummaryController.getReferenceSummary);

module.exports = router;
