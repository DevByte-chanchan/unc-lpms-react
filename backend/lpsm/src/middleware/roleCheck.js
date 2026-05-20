const roleCheck = (req, res, next) => {
  // Accept role from either header or query and normalize hyphens to underscores
  const roleRaw = req.headers['x-user-role'] || req.query.role;
  const userIdRaw = req.headers['x-user-id'] || req.query.userId;

  if (!roleRaw || !userIdRaw) {
    return res.status(401).json({ error: 'Missing role or userId' });
  }

  const role = typeof roleRaw === 'string' ? roleRaw.replace(/-/g, '_') : roleRaw;
  req.userRole = role;
  req.userId = parseInt(userIdRaw);
  next();
};

module.exports = roleCheck;
