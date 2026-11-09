const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../database/db');
const { createApp } = require('../backend/app');

test('customers can contact an IDP designer and only that designer can view the inquiry', async () => {
  const db = createDatabase(':memory:');
  const app = createApp(db);
  const profileId = (name) =>
    db.prepare('SELECT id FROM user_profile WHERE name = ?').get(name).id;
  const addUser = (username, profile, email = null) =>
    Number(db.prepare(`
      INSERT INTO user_account (username, password_hash, email, profile_id)
      VALUES (?, 'test', ?, ?)
    `).run(username, email, profileId(profile)).lastInsertRowid);

  const designerId = addUser('contact_designer', 'Interior Designer');
  const otherDesignerId = addUser('other_contact_designer', 'Interior Designer');
  const customerId = addUser('contact_customer', 'Customer', 'customer@example.com');
  const managerId = addUser('contact_metrics_manager', 'Platform Manager');
  const idpId = Number(db.prepare(`
    INSERT INTO idp (designer_id, title, description, style, type)
    VALUES (?, 'Warm kitchen', 'A kitchen renovation', 'Modern', '["Kitchen"]')
  `).run(designerId).lastInsertRowid);
  const otherIDPId = Number(db.prepare(`
    INSERT INTO idp (designer_id, title, description, style, type)
    VALUES (?, 'Other project', 'A living room renovation', 'Modern', '["Kitchen"]')
  `).run(otherDesignerId).lastInsertRowid);
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const baseURL = `http://127.0.0.1:${server.address().port}/api/contact-requests`;
    async function request(method, path, userId, body) {
      const response = await fetch(`${baseURL}${path}`, {
        method,
        headers: {
          ...(userId ? { 'X-User-Id': String(userId) } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      return { status: response.status, data: await response.json() };
    }

    const payload = {
      designerId,
      idpId,
      message: 'I would like to discuss a warm, accessible kitchen renovation.'
    };
    assert.equal((await request('POST', '/', null, payload)).status, 401);
    assert.equal((await request('POST', '/', otherDesignerId, payload)).status, 403);
    assert.equal((await request('POST', '/', customerId, { ...payload, message: '  ' })).status, 400);
    assert.equal((await request('POST', '/', customerId, { ...payload, idpId: otherIDPId })).status, 400);

    const sent = await request('POST', '/', customerId, payload);
    assert.equal(sent.status, 201);
    assert.equal(sent.data.success, true);
    const otherSent = await request('POST', '/', customerId, {
      designerId: otherDesignerId,
      idpId: otherIDPId,
      message: 'I would like to discuss a living room renovation.'
    });
    assert.equal(otherSent.status, 201);

    const inbox = await request('GET', '/designer', designerId);
    assert.equal(inbox.status, 200);
    assert.equal(inbox.data.requests.length, 1);
    assert.equal(inbox.data.requests[0].customerName, 'contact_customer');
    assert.equal(inbox.data.requests[0].customerEmail, 'customer@example.com');
    assert.equal(inbox.data.requests[0].idpTitle, 'Warm kitchen');
    assert.equal(inbox.data.requests[0].message, payload.message);

    const otherInbox = await request('GET', '/designer', otherDesignerId);
    assert.equal(otherInbox.status, 200);
    assert.equal(otherInbox.data.requests.length, 1);
    assert.equal(otherInbox.data.requests[0].idpTitle, 'Other project');
    assert.equal(otherInbox.data.requests[0].message, 'I would like to discuss a living room renovation.');
    assert.equal((await request('GET', '/designer', customerId)).status, 403);
    assert.equal((await request('GET', '/designer', null)).status, 401);
    const noProjectMessage = await request('POST', '/', customerId, {
      designerId,
      message: 'I would like to discuss a project generally.'
    });
    assert.equal(noProjectMessage.status, 201);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM contact_request').get().count, 3);
    assert.deepEqual(
      db.prepare('SELECT idp_id AS idpId, interaction_type AS type FROM interaction_log ORDER BY idp_id')
        .all().map((row) => ({ ...row })),
      [
        { idpId, type: 'message' },
        { idpId: otherIDPId, type: 'message' }
      ]
    );

    const commentTelemetry = await fetch(`http://127.0.0.1:${server.address().port}/api/telemetry/log`, {
      method: 'POST',
      headers: { 'X-User-Id': String(customerId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ idpId, type: 'comment' })
    });
    assert.equal(commentTelemetry.status, 400);
    const viewTelemetry = await fetch(`http://127.0.0.1:${server.address().port}/api/telemetry/log`, {
      method: 'POST',
      headers: { 'X-User-Id': String(customerId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ idpId, type: 'view' })
    });
    assert.equal(viewTelemetry.status, 201);
    const commentFilter = await fetch(
      `http://127.0.0.1:${server.address().port}/api/metrics/idp-interaction-rate?interactionType=comment`,
      { headers: { 'X-User-Id': String(managerId) } }
    );
    assert.equal(commentFilter.status, 400);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    db.close();
  }
});
