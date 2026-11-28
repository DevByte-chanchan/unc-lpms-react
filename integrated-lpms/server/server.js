'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./models');
const { attachUser, restrictSuperuser } = require('./middleware/auth');
const { auditMiddleware } = require('./middleware/auditMiddleware');
const { errorHandler } = require('./middleware/errorHandler');
const apiRouter = require('./routes');

const app = express();
const PORT = Number(process.env.PORT || 5000);

const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:8080,http://localhost:8081')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, true); // Local dev friendliness while preserving credentials
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());
app.use(attachUser);

// Health Check (public)
app.get('/api/health', async (_req, res) => {
  try {
    await db.sequelize.authenticate();
    const [users, offerings, refs] = await Promise.all([
      db.User.count(),
      db.ProgramCourseOffering.count(),
      db.Reference.count(),
    ]);
    return res.json({
      status: 'ok',
      service: 'unc-lpms-integrated-server',
      database: db.sequelize.config.database,
      dialect: db.sequelize.getDialect(),
      counts: { users, offerings, references: refs },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({ status: 'error', error: err.message });
  }
});

// Unified API routes with superuser restriction + audit logging
app.use('/api', restrictSuperuser, auditMiddleware, apiRouter);

// 404 handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use(errorHandler);

if (require.main === module) {
  db.sequelize
    .authenticate()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[UNC-LPMS Unified Server] Listening on http://localhost:${PORT} (DB: ${db.sequelize.config.database})`);
      });
    })
    .catch((err) => {
      console.error('[UNC-LPMS Unified Server] Failed to connect to database:', err.message);
      process.exit(1);
    });
}

module.exports = app;
