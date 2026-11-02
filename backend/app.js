// Builds the Express app (separate from server.js so it can be tested).
const express = require('express');
const path = require('node:path');
const authRoutes = require('./routes/authRoutes');
const idpRoutes = require('./routes/idpRoutes');

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'frontend')));

  app.use('/api/auth', authRoutes(db));
  app.use('/api/idps', idpRoutes(db));

  app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Not found' }));
  return app;
}

module.exports = { createApp };
