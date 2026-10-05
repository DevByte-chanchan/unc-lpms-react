const express = require('express');
const router = express.Router();
const { getAvailableTopics, getAssignedTopics, assignTopicsToILO } = require('../controllers/topicController');
const { requireRole } = require('../middleware/auth');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireIloParamAccess, requireIloBodyAccess, requireIloQueryAccess } = require('../middleware/courseAuthorization');

// GET /api/topics/available?iloId=97
router.get('/available', requireIloQueryAccess('iloId'), getAvailableTopics);

// GET /api/topics/assigned/:iloId
router.get('/assigned/:iloId', requireIloParamAccess('iloId'), getAssignedTopics);

// POST /api/topics/assign
router.post('/assign', requireRole('instructor'), requireIloBodyAccess('ilo_id'), requireEditablePlan, assignTopicsToILO);

module.exports = router;
