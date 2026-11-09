const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../database/db');
const { seedInteractionLogs } = require('../database/seedInteractions');

test('seeded public favourites and IDP contacts produce timestamped view and interaction events', () => {
  const db = createDatabase(':memory:');
  try {
    const profileId = (name) => db.prepare(
      'SELECT id FROM user_profile WHERE name = ?'
    ).get(name).id;
    const addUser = (username, profile) => Number(db.prepare(`
      INSERT INTO user_account (username, password_hash, profile_id)
      VALUES (?, 'test', ?)
    `).run(username, profileId(profile)).lastInsertRowid);
    const designerId = addUser('seed_interaction_designer', 'Interior Designer');
    const customerId = addUser('seed_interaction_customer', 'Customer');
    const publicIdpId = Number(db.prepare(`
      INSERT INTO idp (designer_id, title, description, visibility, style, type)
      VALUES (?, 'Public sample', 'Project', 'public', 'Modern', '["Kitchen"]')
    `).run(designerId).lastInsertRowid);
    const privateIdpId = Number(db.prepare(`
      INSERT INTO idp (designer_id, title, description, visibility, style, type)
      VALUES (?, 'Private sample', 'Project', 'private', 'Modern', '["Kitchen"]')
    `).run(designerId).lastInsertRowid);

    db.prepare(`
      INSERT INTO favourite (user_id, idp_id, saved_at)
      VALUES (?, ?, '2026-04-04 10:00:00')
    `).run(customerId, publicIdpId);
    db.prepare(`
      INSERT INTO favourite (user_id, idp_id, saved_at)
      VALUES (?, ?, '2026-04-04 10:00:00')
    `).run(customerId, privateIdpId);
    db.prepare(`
      INSERT INTO contact_request (customer_id, designer_id, idp_id, message, created_at)
      VALUES (?, ?, ?, 'Discuss project', '2026-04-05 11:00:00')
    `).run(customerId, designerId, publicIdpId);
    db.prepare(`
      INSERT INTO contact_request (customer_id, designer_id, message, created_at)
      VALUES (?, ?, 'General inquiry', '2026-04-05 12:00:00')
    `).run(customerId, designerId);

    seedInteractionLogs(db);

    const events = db.prepare(`
      SELECT idp_id AS idpId, interaction_type AS type, timestamp
      FROM interaction_log ORDER BY timestamp, id
    `).all().map((row) => ({ ...row }));
    assert.deepEqual(events, [
      { idpId: publicIdpId, type: 'view', timestamp: '2026-04-04 09:59:59' },
      { idpId: publicIdpId, type: 'favourite', timestamp: '2026-04-04 10:00:00' },
      { idpId: publicIdpId, type: 'view', timestamp: '2026-04-05 10:59:59' },
      { idpId: publicIdpId, type: 'message', timestamp: '2026-04-05 11:00:00' }
    ]);
  } finally {
    db.close();
  }
});
