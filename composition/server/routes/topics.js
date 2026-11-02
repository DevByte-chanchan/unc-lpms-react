const express = require('express');
const router = express.Router();
const { getWeekContext, getAvailableTopics, getAssignedTopics, assignTopicsToILO, suggestTopicsWithAI } = require('../controllers/topicController');

// GET /api/topics/week-context/:weekId
router.get('/week-context/:weekId', getWeekContext);

// GET /api/topics/available?weekId=1
router.get('/available', getAvailableTopics);

// GET /api/topics/assigned/:iloId (where :iloId is weekId)
router.get('/assigned/:iloId', getAssignedTopics);

// POST /api/topics/assign
router.post('/assign', assignTopicsToILO);

// POST /api/topics/ai-suggest
router.post('/ai-suggest', suggestTopicsWithAI);

module.exports = router;
