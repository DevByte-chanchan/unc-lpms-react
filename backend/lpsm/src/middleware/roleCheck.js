const roleCheck = (req, res, next) => {
  const role = req.headers['x-user-role'] || req.query.role;
  const userId = req.headers['x-user-id'] || req.query.userId;

  if (!role || !userId) {
    return res.status(401).json({ error: 'Missing role or userId' });
  }

  req.userRole = role;
  req.userId = parseInt(userId);
  next();
};

module.exports = roleCheck;
