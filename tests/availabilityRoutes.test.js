
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../database/db');
const { createApp } = require('../backend/app');

test('User Story 20 - Consultation Availability API', async () => {
  const db = createDatabase(':memory:');
  const app = createApp(db);

  // Create test accounts using the existing Interior Designer and
  // Customer profiles provided by schema.sql.
  const profile = db.prepare(
    'SELECT id FROM user_profile WHERE name = ?'
  );

  const createUser = db.prepare(
    `INSERT INTO user_account
     (username, password_hash, profile_id)
     VALUES (?, ?, ?)`
  );

  const designerID = Number(createUser.run(
    'availability_test_designer',
    'test',
    profile.get('Interior Designer').id
  ).lastInsertRowid);

  const otherDesignerID = Number(createUser.run(
    'availability_other_designer',
    'test',
    profile.get('Interior Designer').id
  ).lastInsertRowid);

  const customerID = Number(createUser.run(
    'availability_test_customer',
    'test',
    profile.get('Customer').id
  ).lastInsertRowid);

  const server = app.listen(0);

  try {
    await new Promise(resolve => server.once('listening', resolve));

    const port = server.address().port;
    const baseURL = `http://127.0.0.1:${port}/api/availability`;

    async function request(method, path, userID, body) {
      const response = await fetch(baseURL + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(userID ? { 'X-User-Id': String(userID) } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });

      return {
        status: response.status,
        data: await response.json()
      };
    }

    const startTime = '2026-12-10T02:00:00.000Z';
    const endTime = '2026-12-10T03:00:00.000Z';

    // 1. Designer creates an available slot.
    const created = await request('POST', '/', designerID, {
      startTime,
      endTime
    });

    assert.equal(created.status, 201);
    assert.equal(created.data.success, true);

    const slotID = created.data.slot.slotID;
    console.log('PASS: Designer creates consultation slot');

    // 2. Designer views their slots.
    const mine = await request('GET', '/mine', designerID);

    assert.equal(mine.status, 200);
    assert.equal(mine.data.slots.length, 1);
    console.log('PASS: Designer views consultation slots');

    // 3. Customer views available slots.
    const publicSlots = await request(
      'GET',
      `/designer/${designerID}`,
      customerID
    );

    assert.equal(publicSlots.status, 200);
    assert.equal(publicSlots.data.slots.length, 1);
    console.log('PASS: Customer views available slots');

    // 4. Reject overlapping slots.
    const overlap = await request('POST', '/', designerID, {
      startTime: '2026-12-10T02:30:00.000Z',
      endTime: '2026-12-10T03:30:00.000Z'
    });

    assert.equal(overlap.status, 400);
    console.log('PASS: Overlapping consultation blocked');

    // 5. Customer cannot create slots.
    const unauthorized = await request('POST', '/', customerID, {
      startTime: '2026-12-10T05:00:00.000Z',
      endTime: '2026-12-10T06:00:00.000Z'
    });

    assert.equal(unauthorized.status, 403);
    console.log('PASS: Customer cannot create consultation slots');

    // 6. Another designer cannot edit the slot.
    const wrongOwner = await request(
      'PUT',
      `/${slotID}`,
      otherDesignerID,
      {
        startTime: '2026-12-10T04:00:00.000Z',
        endTime: '2026-12-10T05:00:00.000Z'
      }
    );

    assert.equal(wrongOwner.data.success, false);
    console.log('PASS: Other designer cannot edit slot');

    // 7. Owner edits their slot.
    const edited = await request(
      'PUT',
      `/${slotID}`,
      designerID,
      {
        startTime: '2026-12-10T04:00:00.000Z',
        endTime: '2026-12-10T05:00:00.000Z'
      }
    );

    assert.equal(edited.status, 200);
    console.log('PASS: Designer edits consultation slot');

    // 8. Owner removes their slot.
    const removed = await request(
      'DELETE',
      `/${slotID}`,
      designerID
    );

    assert.equal(removed.status, 200);
    console.log('PASS: Designer removes consultation slot');

    // 9. Verify slot was removed.
    const remaining = await request('GET', '/mine', designerID);

    assert.equal(remaining.data.slots.length, 0);
    console.log('PASS: Removed slot no longer appears');

  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });

    db.close();
  }
});
