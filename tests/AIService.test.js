// #23 AIService: the boundary to Google Gemini.
// Tests use a fake client, so they never call the real API (no key needed, no quota used).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const AIService = require('../backend/boundary/AIService');

const TAG_NAMES = ['Modern', 'Japanese', 'Kitchen', 'Bedroom'];

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

test('requestTags sends the description and tag names, and returns the chosen names', async () => {
  const client = fakeClient('["Japanese", "Bedroom"]');
  const names = await new AIService('test-key', client).requestTags('A zen bedroom', TAG_NAMES);

  assert.deepEqual(names, ['Japanese', 'Bedroom']);
  assert.match(client.calls[0].contents, /A zen bedroom/);
  for (const name of TAG_NAMES) assert.match(client.calls[0].contents, new RegExp(name));
});

test('requestTags fails when there is no API key', async () => {
  await assert.rejects(new AIService('').requestTags('A zen bedroom', TAG_NAMES), /GEMINI_API_KEY/);
});

test('requestTags fails when the AI does not answer with a list', async () => {
  for (const text of ['Sure! Japanese and Bedroom.', '{"tags": ["Japanese"]}']) {
    await assert.rejects(new AIService('test-key', fakeClient(text)).requestTags('A zen bedroom', TAG_NAMES), `answer: ${text}`);
  }
});
