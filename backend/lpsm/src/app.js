const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./models');
const learningPlansRouter = require('./routes/learningPlans');
const programDocumentsRouter = require('./routes/programDocuments');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/learning-plans', learningPlansRouter);
app.use('/api/program-documents', programDocumentsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'LPSM Backend' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

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
