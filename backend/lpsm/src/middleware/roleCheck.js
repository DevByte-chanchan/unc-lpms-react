const { verifyToken } = require('../utils/auth');

const roleCheck = (req, res, next) => {
  // Accept role from either header or query and normalize hyphens to underscores
  const roleRaw = req.headers['x-user-role'] || req.query.role;
  const userIdRaw = req.headers['x-user-id'] || req.query.userId;
  const authHeader = req.headers['authorization'];

  // Validate token if present (fallback to header-only for backward compat during migration)
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userRole = payload.role.replace(/-/g, '_');
    req.userId = payload.userId;
    return next();
  }

  if (!roleRaw || !userIdRaw) {
    return res.status(401).json({ error: 'Missing role or userId' });
  }

  const role = typeof roleRaw === 'string' ? roleRaw.replace(/-/g, '_') : roleRaw;
  req.userRole = role;
  req.userId = parseInt(userIdRaw);
  next();
};

module.exports = roleCheck;
