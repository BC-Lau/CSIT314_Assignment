// Load secrets (GEMINI_API_KEY ...) from .env if it exists. See .env.example.
try {
  process.loadEnvFile();
} catch {
  console.warn('No .env file found - AI features are disabled. Copy .env.example to .env.');
}

const { createDatabase } = require('../database/db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const db = createDatabase();
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
