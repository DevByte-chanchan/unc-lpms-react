const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./models');
const learningPlansRouter = require('./routes/learningPlans');
const programDocumentsRouter = require('./routes/programDocuments');
const syllabiRouter = require('./routes/syllabi');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/learning-plans', learningPlansRouter);
app.use('/api/program-documents', programDocumentsRouter);
app.use('/api/syllabi', syllabiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'LPSM Backend' });
});

// Not found handler (must be before error handler)
app.use(notFoundHandler);

// Centralized error handling (must be last)
app.use(errorHandler);

// Sync database and start server
const PORT = process.env.PORT || 4002;

db.sequelize.sync({ alter: false }).then(() => {
  app.listen(PORT, () => {
    console.log(`LPSM Backend running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to sync database:', error);
});

module.exports = app;
