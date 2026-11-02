// Builds the Express app (separate from server.js so it can be tested).
const express = require('express');
const path = require('node:path');
const { SessionManager } = require('./utils/session');
const { attachAccount } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const idpRoutes = require('./routes/idpRoutes');
const filterRoutes = require('./routes/filterRoutes');
const recommendRoutes = require('./routes/recommendRoutes');

function createApp(db, { sessions = new SessionManager() } = {}) {
  const app = express();
  app.use(express.json());
  app.use(attachAccount(sessions));
  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  app.use('/api/auth', authRoutes(db, sessions));
  app.use('/api/idps', idpRoutes(db));
  app.use('/api/filter', filterRoutes(db));
  app.use('/api/recommendations', recommendRoutes(db));

  app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Not found' }));
  return app;
}

module.exports = { createApp };
