// CONTROLLER: #23 suggest one style and the room types for an IDP description.
// The AI service is faked, so these tests only check the controller's own logic.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const IDP = require('../backend/entity/IDP');
const SuggestTagsController = require('../backend/controller/SuggestTagsController');
const { createTestDatabase, PRESET_TAGS } = require('./helpers');

let idp;

/** A fake AIService: answers with `result` (or throws it if it is an Error) and remembers the calls. */
function fakeAI(result) {
  return {
    calls: [],
    async requestTags(description, styleNames, typeNames) {
      this.calls.push({ description, styleNames, typeNames });
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

const suggest = (ai, description) => new SuggestTagsController(idp, ai).suggestTags(description);

beforeEach(() => {
  idp = new IDP(createTestDatabase(), () => PRESET_TAGS);
});

test('returns the style and types suggested by the AI', async () => {
  const ai = fakeAI({ style: 'Japanese', types: ['Bedroom'] });
  const result = await suggest(ai, '  A calm bedroom with tatami mats  ');

  assert.deepEqual(result, { success: true, styleTag: 'Japanese', typeTags: ['Bedroom'] });
  assert.equal(ai.calls[0].description, 'A calm bedroom with tatami mats');
  assert.deepEqual(ai.calls[0].styleNames, ['Modern', 'Japanese', 'Industrial', 'Wabi Sabi']);
  assert.deepEqual(ai.calls[0].typeNames, ['Kitchen', 'Bedroom', 'Bar Counter']);
});

test('falls back to keyword matching when the AI fails', async () => {
  const result = await suggest(fakeAI(new Error('timeout')), 'A modern kitchen');
  assert.deepEqual(result, { success: true, styleTag: 'Modern', typeTags: ['Kitchen'] });
});

test('falls back to keyword matching when there is no AI service', async () => {
  const result = await suggest(null, 'A modern kitchen');
  assert.deepEqual(result, { success: true, styleTag: 'Modern', typeTags: ['Kitchen'] });
});

test('keeps only one style: the best match', async () => {
  const result = await suggest(fakeAI(new Error('timeout')), 'A zen japanese home with tatami, a few modern touches and a kitchen');
  assert.deepEqual(result, { success: true, styleTag: 'Japanese', typeTags: ['Kitchen'] });
});

test('keepOneStyle keeps the first style and all types', () => {
  const controller = new SuggestTagsController(idp, null);
  assert.deepEqual(controller.keepOneStyle(['Kitchen', 'Japanese', 'Modern', 'Bedroom']), {
    styleTag: 'Japanese',
    typeTags: ['Kitchen', 'Bedroom'],
  });
});

test('asks the designer to choose a style when none matched', async () => {
  const result = await suggest(fakeAI(new Error('timeout')), 'We redid the kitchen and the bedroom');
  assert.deepEqual(result, {
    success: true,
    styleTag: null,
    typeTags: ['Bedroom', 'Kitchen'],
    message: 'No style matched, please choose a style',
  });
});

// ---------- invalid data ----------
test('keeps the types and asks for a style when the AI finds no style', async () => {
  const result = await suggest(fakeAI({ style: null, types: ['Bedroom'] }), 'We repainted the bedroom and fixed the toilet.');
  assert.deepEqual(result, {
    success: true,
    styleTag: null,
    typeTags: ['Bedroom'],
    message: 'No style matched, please choose a style',
  });
});

test('discards names that are not in the preset list', async () => {
  const result = await suggest(fakeAI({ style: 'Japanese', types: ['Garden', 'Bedroom'] }), 'A tatami room');
  assert.deepEqual(result, { success: true, styleTag: 'Japanese', typeTags: ['Bedroom'] });
});

test('falls back to keyword matching when the AI suggests no valid names', async () => {
  const result = await suggest(fakeAI({ style: 'Gothic', types: ['Garden'] }), 'A modern kitchen');
  assert.deepEqual(result, { success: true, styleTag: 'Modern', typeTags: ['Kitchen'] });
});

test('rejects an empty description and does not call the AI', async () => {
  for (const description of ['', '   ', null, undefined, 123]) {
    const ai = fakeAI({ style: 'Modern', types: [] });
    const result = await suggest(ai, description);
    assert.deepEqual(result, { success: false, message: 'Description is required' }, `description: ${description}`);
    assert.equal(ai.calls.length, 0);
  }
});
