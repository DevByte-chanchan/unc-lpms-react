const express = require('express');
const router = express.Router();
const { getAvailableTopics, getAssignedTopics, assignTopicsToILO, suggestTopicsWithAI } = require('../controllers/topicController');

// GET /api/topics/available?iloId=97
router.get('/available', getAvailableTopics);

// GET /api/topics/assigned/:iloId
router.get('/assigned/:iloId', getAssignedTopics);

// POST /api/topics/assign
router.post('/assign', assignTopicsToILO);

// POST /api/topics/ai-suggest
router.post('/ai-suggest', suggestTopicsWithAI);

module.exports = router;
