// CONTROLLER: #23 suggest tags for an IDP description.
// The AI service is faked, so these tests only check the controller's own logic.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Tag = require('../backend/entity/Tag');
const SuggestTagsController = require('../backend/controller/SuggestTagsController');
const { createTestDatabase, addTags } = require('./helpers');

let tag;

const designer = { canCreateIDP: () => true };
const customer = { canCreateIDP: () => false };
const names = (tags) => tags.map((t) => t.name).sort();

/** A fake AIService: answers with `result` (or throws it if it is an Error) and remembers the calls. */
function fakeAI(result) {
  return {
    calls: [],
    async requestTags(description, tagNames) {
      this.calls.push({ description, tagNames });
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

beforeEach(() => {
  const db = createTestDatabase();
  addTags(db, {
    style: { 'Modern': ['modern'], 'Japanese': ['japanese', 'tatami'] },
    room: { 'Kitchen': ['kitchen'], 'Bedroom': ['bedroom'] },
  });
  tag = new Tag(db);
});

test('returns the tags suggested by the AI', async () => {
  const ai = fakeAI(['Japanese', 'Bedroom']);
  const result = await new SuggestTagsController(tag, ai).suggestTags(designer, '  A calm bedroom with tatami mats  ');

  assert.equal(result.success, true);
  assert.deepEqual(names(result.tags), ['Bedroom', 'Japanese']);
  assert.equal(ai.calls[0].description, 'A calm bedroom with tatami mats');
  assert.deepEqual(ai.calls[0].tagNames.sort(), ['Bedroom', 'Japanese', 'Kitchen', 'Modern']);
});

test('discards names that are not in the preset tag list', async () => {
  const result = await new SuggestTagsController(tag, fakeAI(['Japanese', 'Garden'])).suggestTags(designer, 'A tatami room');
  assert.deepEqual(names(result.tags), ['Japanese']);
});

test('falls back to keyword matching when the AI fails', async () => {
  const result = await new SuggestTagsController(tag, fakeAI(new Error('timeout'))).suggestTags(designer, 'A modern kitchen');
  assert.equal(result.success, true);
  assert.deepEqual(names(result.tags), ['Kitchen', 'Modern']);
});

test('falls back to keyword matching when the AI suggests no valid tags', async () => {
  const result = await new SuggestTagsController(tag, fakeAI(['Garden'])).suggestTags(designer, 'A modern kitchen');
  assert.deepEqual(names(result.tags), ['Kitchen', 'Modern']);
});

test('rejects an empty description and does not call the AI', async () => {
  for (const description of ['', '   ', null, undefined]) {
    const ai = fakeAI(['Modern']);
    const result = await new SuggestTagsController(tag, ai).suggestTags(designer, description);
    assert.deepEqual(result, { success: false, message: 'Description is required' });
    assert.equal(ai.calls.length, 0);
  }
});

test('only interior designers can suggest tags', async () => {
  for (const user of [customer, null]) {
    const ai = fakeAI(['Modern']);
    const result = await new SuggestTagsController(tag, ai).suggestTags(user, 'A modern kitchen');
    assert.equal(result.success, false);
    assert.equal(ai.calls.length, 0);
  }
});
