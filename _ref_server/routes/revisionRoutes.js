const express = require('express');
const router = express.Router();
const revisionController = require('../controllers/revisionController');

// Change this line in your routes file
router.get('/:pcId', revisionController.getRevisionsByOffering);

module.exports = router;