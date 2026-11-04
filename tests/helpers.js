// Shared test helpers: fresh in-memory database for every test.
const { createDatabase } = require('../database/db');

function createTestDatabase() {
  return createDatabase(':memory:');
}

function profileId(db, name) {
  return db.prepare('SELECT id FROM user_profile WHERE name = ?').get(name).id;
}

/** A small preset list in the loadPresetTags() format, so tests do not depend on database/tags.txt. */
const PRESET_TAGS = {
  style: {
    'Modern': ['modern', 'clean lines'],
    'Japanese': ['japanese', 'tatami', 'zen'],
    'Industrial': ['industrial', 'exposed brick'],
    'Wabi Sabi': ['imperfect'],
  },
  type: {
    'Kitchen': ['kitchen', 'countertop'],
    'Bedroom': ['bedroom', 'wardrobe'],
    'Bar Counter': ['bar counter', 'bar'],
  },
};

module.exports = { createTestDatabase, profileId, PRESET_TAGS };
