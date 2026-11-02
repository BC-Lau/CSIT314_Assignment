// #23 fallback: Tag.matchByKeywords (used when the AI service fails).
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Tag = require('../backend/entity/Tag');
const { createTestDatabase, addTags } = require('./helpers');

let tag;

const names = (tags) => tags.map((t) => t.name);

beforeEach(() => {
  const db = createTestDatabase();
  addTags(db, {
    style: {
      'Modern': ['modern', 'clean lines'],
      'Japanese': ['japanese', 'tatami', 'zen'],
      'Industrial': ['industrial', 'exposed brick'],
      'Wabi Sabi': ['imperfect'],
    },
    room: {
      'Kitchen': ['kitchen', 'countertop'],
      'Bedroom': ['bedroom', 'wardrobe'],
    },
  });
  tag = new Tag(db);
});

test('matchByKeywords finds tags whose keywords appear in the description', () => {
  assert.deepEqual(names(tag.matchByKeywords('A zen space with tatami mats and a big wardrobe')), ['Japanese', 'Bedroom']);
});

test('matchByKeywords ignores upper / lower case', () => {
  assert.deepEqual(names(tag.matchByKeywords('EXPOSED BRICK walls and a marble Countertop')), ['Industrial', 'Kitchen']);
});

test('matchByKeywords also matches the tag name itself', () => {
  assert.deepEqual(names(tag.matchByKeywords('A calm wabi sabi home')), ['Wabi Sabi']);
});

test('matchByKeywords returns an empty list when nothing matches', () => {
  assert.deepEqual(tag.matchByKeywords('A colourful garden party'), []);
});

test('matchByKeywords returns an empty list for empty or invalid descriptions', () => {
  for (const description of ['', '   ', null, undefined, 123]) {
    assert.deepEqual(tag.matchByKeywords(description), [], `description: ${description}`);
  }
});
