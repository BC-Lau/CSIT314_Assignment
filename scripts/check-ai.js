// Checks that GEMINI_API_KEY in .env works by asking Gemini for real: npm run check-ai
// (Uses a little of the free quota. Normal tests never call the real API.)
process.loadEnvFile();
const AIService = require('../backend/boundary/AIService');
const { loadPresetTags } = require('../database/presetTags');

const preset = loadPresetTags();
const description = 'A cosy Japanese-style bedroom with tatami mats, plus a small home office corner.';

new AIService()
  .requestTags(description, Object.keys(preset.style), Object.keys(preset.type))
  .then((answer) => console.log('OK - Gemini suggested:', answer))
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  });
