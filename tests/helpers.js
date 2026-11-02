// Shared test helpers: fresh in-memory database for every test.
const { createDatabase } = require('../database/db');

function createTestDatabase() {
  return createDatabase(':memory:');
}

function profileId(db, name) {
  return db.prepare('SELECT id FROM user_profile WHERE name = ?').get(name).id;
}

/** Inserts tags in the presetTags.js format: { style: { Name: [keywords] }, room: { ... } } */
function addTags(db, tagsByType) {
  const insert = db.prepare('INSERT INTO tag (name, type, keywords) VALUES (?, ?, ?)');
  for (const [type, tags] of Object.entries(tagsByType)) {
    for (const [name, keywords] of Object.entries(tags)) insert.run(name, type, JSON.stringify(keywords));
  }
}

module.exports = { createTestDatabase, profileId, addTags };
