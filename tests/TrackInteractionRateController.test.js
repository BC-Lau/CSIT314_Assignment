const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDatabase, profileId } = require('./helpers');
const UserAccount = require('../backend/entity/UserAccount');
const TrackInteractionRateController = require('../backend/controller/TrackInteractionRateController');

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
  assert.equal(controller.logInteraction(customerId, idpId, 'consultation_request'), true);

  const report = controller.generateAnalyticsReport('all', '');
  const metric = report.metricsData.find((item) => item.idpId === idpId);
  assert.ok(metric);
  assert.equal(metric.viewCount, 100);
  assert.equal(metric.interactionCount, 2);
  assert.equal(metric.interactionRate, 2);

  const filtered = controller.generateAnalyticsReport('all', 'Modern');
  assert.equal(filtered.metricsData.length, 1);

  const recent = controller.generateAnalyticsReport('30d', '');
  const recentMetric = recent.metricsData.find((item) => item.idpId === idpId);
  assert.equal(recentMetric.viewCount, 1);
  assert.equal(recentMetric.interactionCount, 2);
  assert.equal(recentMetric.interactionRate, 200);

  const consultation = controller.generateAnalyticsReport('all', '', 'consultation_request');
  assert.equal(consultation.metricsData[0].interactionCount, 1);
  db.close();
});
