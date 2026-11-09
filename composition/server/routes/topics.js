const express = require('express');
const router = express.Router();
const { getWeekContext, getAvailableTopics, getAssignedTopics, assignTopicsToILO, suggestTopicsWithAI } = require('../controllers/topicController');
const { requireRole } = require('../middleware/auth');
const { requireEditablePlan } = require('../middleware/editLock');
const { requireWeekParamAccess, requireWeekBodyAccess, requireWeekQueryAccess } = require('../middleware/courseAuthorization');
const { requireSection } = require('../middleware/sectionAccess');

// GET /api/topics/week-context/:weekId
router.get('/week-context/:weekId', requireSection('coverage'), requireWeekParamAccess('weekId'), getWeekContext);

// GET /api/topics/available?weekId=1
router.get('/available', requireSection('coverage'), requireWeekQueryAccess('weekId', 'iloId'), getAvailableTopics);

// GET /api/topics/assigned/:iloId (where :iloId is weekId)
router.get('/assigned/:iloId', requireSection('coverage'), requireWeekParamAccess('iloId'), getAssignedTopics);

// POST /api/topics/assign
router.post('/assign', requireRole('instructor'), requireWeekBodyAccess('week_id', 'ilo_id'), requireEditablePlan, assignTopicsToILO);

// POST /api/topics/ai-suggest
router.post('/ai-suggest', requireRole('instructor'), requireWeekBodyAccess('weekId', 'iloId'), suggestTopicsWithAI);

module.exports = router;
