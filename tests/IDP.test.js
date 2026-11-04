// #23 Automated IDP tagging: preset styles / types (database/tags.txt) and the IDP entity methods.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const IDP = require('../backend/entity/IDP');
const { loadPresetTags } = require('../database/presetTags');
const { createTestDatabase, PRESET_TAGS } = require('./helpers');

let idp;

beforeEach(() => {
  idp = new IDP(createTestDatabase(), () => PRESET_TAGS);
});

/** Writes `text` to a temporary tags.txt and returns its path. */
function tempTagsFile(text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tags-')), 'tags.txt');
  fs.writeFileSync(file, text);
  return file;
}

// ---------- loadPresetTags: database/tags.txt ----------
test('loadPresetTags reads 19 styles and 21 types from tags.txt', () => {
  const preset = loadPresetTags();
  assert.equal(Object.keys(preset.style).length, 19);
  assert.equal(Object.keys(preset.type).length, 21);
  assert.ok(preset.style['Japandi']);
  assert.ok(preset.type['Living Room']);
});

test('loadPresetTags gives each name its keywords', () => {
  const file = tempTagsFile(
    'IDP Tags\nStyles:\nJapanese\n\nTypes:\nKitchen\n\nKeywords:\nJapanese: japanese, tatami, zen\nKitchen: kitchen, countertop\n'
  );
  assert.deepEqual(loadPresetTags(file), {
    style: { Japanese: ['japanese', 'tatami', 'zen'] },
    type: { Kitchen: ['kitchen', 'countertop'] },
  });
});

test('loadPresetTags accepts Windows (CRLF) line endings', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'database', 'tags.txt'), 'utf8');
  const preset = loadPresetTags(tempTagsFile(text.replace(/\r?\n/g, '\r\n')));
  assert.equal(Object.keys(preset.style).length, 19);
  assert.deepEqual(preset, loadPresetTags());
});

test('loadPresetTags gives an empty keyword list to names without a Keywords line', () => {
  const file = tempTagsFile('IDP Tags\nStyles:\nModern\nTypes:\nYard\nKeywords:\n');
  assert.deepEqual(loadPresetTags(file), { style: { Modern: [] }, type: { Yard: [] } });
});

// ---------- IDP: preset names ----------
test('getTagsByType returns the style names or the type names', () => {
  assert.deepEqual(idp.getTagsByType('style'), ['Modern', 'Japanese', 'Industrial', 'Wabi Sabi']);
  assert.deepEqual(idp.getTagsByType('type'), ['Kitchen', 'Bedroom', 'Bar Counter']);
});

test('findByNames keeps preset names in the given order', () => {
  assert.deepEqual(idp.findByNames(['Bedroom', 'Japanese']), ['Bedroom', 'Japanese']);
});

test('findByNames drops unknown names and duplicates', () => {
  assert.deepEqual(idp.findByNames(['Japanese', 'Garden', 'Japanese', null, 'Kitchen']), ['Japanese', 'Kitchen']);
});

test('findByNames returns an empty list when it is not given a list', () => {
  for (const names of [undefined, null, 'Japanese', 42]) {
    assert.deepEqual(idp.findByNames(names), [], `names: ${names}`);
  }
});

// ---------- IDP: keyword matching (#23 fallback when the AI fails) ----------
test('matchByKeywords finds names whose keywords appear in the description', () => {
  assert.deepEqual(idp.matchByKeywords('A zen space with tatami mats and a big wardrobe'), ['Japanese', 'Bedroom']);
});

test('matchByKeywords ignores upper / lower case', () => {
  assert.deepEqual(idp.matchByKeywords('EXPOSED BRICK walls and a marble Countertop'), ['Industrial', 'Kitchen']);
});

test('matchByKeywords also matches the name itself', () => {
  assert.deepEqual(idp.matchByKeywords('A calm wabi sabi home'), ['Wabi Sabi']);
});

test('matchByKeywords puts the best match (most keywords found) first', () => {
  assert.deepEqual(idp.matchByKeywords('A modern home with clean lines and a small kitchen'), ['Modern', 'Kitchen']);
});

test('matchByKeywords only matches whole words', () => {
  assert.deepEqual(idp.matchByKeywords('A barbecue pit next to the bedroom'), ['Bedroom']);
});

test('matchByKeywords returns an empty list when nothing matches', () => {
  assert.deepEqual(idp.matchByKeywords('A colourful garden party'), []);
});

test('matchByKeywords returns an empty list for empty or invalid descriptions', () => {
  for (const description of ['', '   ', null, undefined, 123]) {
    assert.deepEqual(idp.matchByKeywords(description), [], `description: ${description}`);
  }
});
