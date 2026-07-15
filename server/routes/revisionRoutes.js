const express = require('express');
const router = express.Router();
const revisionController = require('../controllers/revisionController');

// GET /api/revisions/by-code/:code  -> resolve by course code (frontend uses codes)
router.get('/by-code/:code', revisionController.getRevisionsByCode);

// GET /api/revisions/:pcId  -> all revisions (timeline + comments) for the offering's course/program
router.get('/:pcId', revisionController.getRevisionsByOffering);

module.exports = router;
