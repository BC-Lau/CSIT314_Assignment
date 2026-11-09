const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase, profileId } = require('./helpers');
const UserAccount = require('../backend/entity/UserAccount');
const TrackInteractionRateController = require('../backend/controller/TrackInteractionRateController');
const { migrateInteractionLogTypes } = require('../database/db');

function setup() {
  const db = createTestDatabase();
  const accounts = new UserAccount(db);
  const customerId = accounts.createUserAccount({
    username: 'interaction-customer',
    password: 'secret123',
    profileId: profileId(db, 'Customer')
  });
  const designerId = accounts.createUserAccount({
    username: 'interaction-designer',
    password: 'secret123',
    profileId: profileId(db, 'Interior Designer')
  });
  db.prepare(`
    INSERT INTO idp (designer_id, title, description, visibility, style, type, view_count)
    VALUES (?, 'Modern Apartment', 'Description', 'public', 'Modern', '["Kitchen"]', 100)
  `).run(designerId);
  const idpId = Number(db.prepare('SELECT last_insert_rowid() AS id').get().id);
  return { db, customerId, idpId, controller: new TrackInteractionRateController(db, accounts) };
}

test('computes interaction rate including zero views', () => {
  const { db, controller } = setup();
  assert.equal(controller.computeInteractionRate(25, 100), 25);
  assert.equal(controller.computeInteractionRate(25, 0), 0);
  db.close();
});

test('generates interaction-rate analytics for published IDPs', () => {
  const { db, customerId, idpId, controller } = setup();
  assert.equal(controller.logInteraction(customerId, idpId, 'view'), true);
  assert.equal(controller.logInteraction(customerId, idpId, 'favourite'), true);
  assert.equal(controller.logMessage(customerId, idpId), true);
  assert.equal(controller.logInteraction(customerId, idpId, 'consultation_request'), true);
  assert.equal(controller.logInteraction(customerId, idpId, 'comment'), false);

  const report = controller.generateAnalyticsReport('all', '');
  const metric = report.metricsData.find((item) => item.idpId === idpId);
  assert.ok(metric);
  assert.equal(metric.viewCount, 100);
  assert.equal(metric.interactionCount, 3);
  assert.equal(metric.interactionRate, 3);

  const filtered = controller.generateAnalyticsReport('all', 'Modern');
  assert.equal(filtered.metricsData.length, 1);

  const recent = controller.generateAnalyticsReport('30d', '');
  const recentMetric = recent.metricsData.find((item) => item.idpId === idpId);
  assert.equal(recentMetric.viewCount, 1);
  assert.equal(recentMetric.interactionCount, 3);
  assert.equal(recentMetric.interactionRate, 300);

  const consultation = controller.generateAnalyticsReport('all', '', 'consultation_request');
  assert.equal(consultation.metricsData[0].interactionCount, 1);
  const messages = controller.generateAnalyticsReport('all', '', 'message');
  assert.equal(messages.metricsData[0].interactionCount, 1);
  const comments = controller.generateAnalyticsReport('all', '', 'comment');
  assert.equal(comments.metricsData[0].interactionCount, 0);
  db.close();
});

test('migrates legacy comment events out of the interaction log', () => {
  const { db, customerId, idpId } = setup();
  db.exec('DROP TABLE interaction_log');
  db.exec(`CREATE TABLE interaction_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES user_account(id),
    idp_id INTEGER NOT NULL REFERENCES idp(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (
      interaction_type IN ('view', 'favourite', 'comment', 'consultation_request')
    ),
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const insert = db.prepare(`
    INSERT INTO interaction_log (customer_id, idp_id, interaction_type)
    VALUES (?, ?, ?)
  `);
  insert.run(customerId, idpId, 'view');
  insert.run(customerId, idpId, 'favourite');
  insert.run(customerId, idpId, 'comment');
  insert.run(customerId, idpId, 'consultation_request');

  migrateInteractionLogTypes(db);

  const types = db.prepare('SELECT interaction_type FROM interaction_log ORDER BY id').all()
    .map((row) => row.interaction_type);
  assert.deepEqual(types, ['view', 'favourite', 'consultation_request']);
  assert.doesNotThrow(() => insert.run(customerId, idpId, 'message'));
  assert.throws(() => insert.run(customerId, idpId, 'comment'));
  db.close();
});
