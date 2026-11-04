// #23 AIService: the boundary to Google Gemini.
// Tests use a fake client, so they never call the real API (no key needed, no quota used).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const AIService = require('../backend/boundary/AIService');

const STYLES = ['Modern', 'Japanese'];
const TYPES = ['Kitchen', 'Bedroom'];

/** A fake Gemini client that answers with `text` and remembers what it was asked. */
function fakeClient(text) {
  const client = {
    calls: [],
    async generateContent(request) {
      client.calls.push(request);
      return { text };
    },
  };
  return client;
}

test('requestTags sends the description and preset names, and returns the chosen style and types', async () => {
  const client = fakeClient('{"style": "Japanese", "types": ["Bedroom"]}');
  const answer = await new AIService('test-key', client).requestTags('A zen bedroom', STYLES, TYPES);

  assert.deepEqual(answer, { style: 'Japanese', types: ['Bedroom'] });
  const request = client.calls[0];
  assert.match(request.contents, /A zen bedroom/);
  // The AI may only answer with preset names (or None when no style fits)
  assert.deepEqual(request.config.responseJsonSchema.properties.style.enum, [...STYLES, 'None']);
  assert.deepEqual(request.config.responseJsonSchema.properties.types.items.enum, TYPES);
});

test('requestTags returns style null when the AI finds no style', async () => {
  const client = fakeClient('{"style": "None", "types": ["Bedroom"]}');
  const answer = await new AIService('test-key', client).requestTags('We repainted the bedroom', STYLES, TYPES);
  assert.deepEqual(answer, { style: null, types: ['Bedroom'] });
});

test('requestTags fails when there is no API key', async () => {
  await assert.rejects(new AIService('').requestTags('A zen bedroom', STYLES, TYPES), /GEMINI_API_KEY/);
});

test('requestTags fails when the AI answer is not { style, types }', async () => {
  for (const text of ['Sure! Japanese and Bedroom.', '["Japanese", "Bedroom"]', '{"style": "Japanese"}', '{"style": 1, "types": []}']) {
    await assert.rejects(
      new AIService('test-key', fakeClient(text)).requestTags('A zen bedroom', STYLES, TYPES),
      `answer: ${text}`
    );
  }
});
