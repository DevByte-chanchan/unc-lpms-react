// routes/courseReferenceRoutes.js
const express = require('express');
const router = express.Router();
const referenceSummaryController = require('../controllers/referenceSummaryController');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET request matching standard RESTful parameter patterns for university courses
router.get('/courses/:pcId/:revNum/references', requireSection('references'), requireOfferingAccess, referenceSummaryController.getReferenceSummary);
router.get('/courses/:pcId/references', requireSection('references'), requireOfferingAccess, referenceSummaryController.getReferenceSummary);

module.exports = router;
