const express = require('express');
const router = express.Router();
const { signToken } = require('../utils/auth');

router.post('/token', (req, res) => {
  const { userId, role, name } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: 'userId and role required' });
  }
  const token = signToken({ userId: parseInt(userId), role, name: name || '' });
  res.json({ token, userId: parseInt(userId), role });
});

module.exports = router;
