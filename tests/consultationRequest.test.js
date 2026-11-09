
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createDatabase } = require('../database/db');
const { createApp } = require('../backend/app');
const AvailabilitySchedule = require('../backend/entity/AvailabilitySchedule');
const ConsultationRequest = require('../backend/entity/ConsultationRequest');
const UserAccount = require('../backend/entity/UserAccount');
const TrackInteractionRateController = require('../backend/controller/TrackInteractionRateController');

test('Consultation requests prevent double-booking', () => {
  const db = createDatabase(':memory:');

  try {
    const designerProfile = db.prepare(
      "SELECT id FROM user_profile WHERE name = 'Interior Designer'"
    ).get().id;

    const customerProfile = db.prepare(
      "SELECT id FROM user_profile WHERE name = 'Customer'"
    ).get().id;

    const createUser = db.prepare(
      `INSERT INTO user_account
       (username, password_hash, profile_id)
       VALUES (?, ?, ?)`
    );

    const designerID = Number(
      createUser.run('booking_designer', 'test', designerProfile)
        .lastInsertRowid
    );

    const customer1 = Number(
      createUser.run('booking_customer1', 'test', customerProfile)
        .lastInsertRowid
    );

    const customer2 = Number(
      createUser.run('booking_customer2', 'test', customerProfile)
        .lastInsertRowid
    );

    const schedules = new AvailabilitySchedule(db);
    const accounts = new UserAccount(db);
    const interactions = new TrackInteractionRateController(db, accounts);
    const requests = new ConsultationRequest(db, interactions);
    const idpID = Number(db.prepare(`
      INSERT INTO idp (designer_id, title, description, style, type)
      VALUES (?, 'Consultation project', 'Project description', 'Modern', '["Kitchen"]')
    `).run(designerID).lastInsertRowid);

    const schedule = schedules.getSchedule(designerID);

    const slot = schedules.addSlot(
      schedule.id,
      '2030-12-10T02:00:00.000Z',
      '2030-12-10T03:00:00.000Z'
    );

    // First customer books successfully.
    const booking = requests.createRequest(
      slot.slotID, customer1, 'Kitchen renovation consultation', idpID
    );

    assert.equal(booking.customerID, customer1);
    assert.equal(booking.slotID, slot.slotID);
    assert.equal(
      db.prepare('SELECT interaction_type FROM interaction_log WHERE idp_id = ?').get(idpID).interaction_type,
      'consultation_request'
    );

    console.log('PASS: Customer consultation request recorded');

    // The slot becomes booked.
    const bookedSlot = schedules.findSlot(slot.slotID);
    assert.equal(bookedSlot.status, 'booked');

    console.log('PASS: Slot status updated to booked');

    // Second customer cannot book the same slot.
    assert.throws(
      () => requests.createRequest(slot.slotID, customer2),
      /already booked/
    );

    console.log('PASS: Double-booking prevented');

    // Designer cannot edit a booked slot.
    assert.throws(
      () => schedules.updateSlot(
        schedule.id,
        slot.slotID,
        '2030-12-10T04:00:00.000Z',
        '2030-12-10T05:00:00.000Z'
      ),
      /Cannot modify a booked/
    );

    console.log('PASS: Booked slot cannot be edited');

    // Designer cannot remove a booked slot.
    assert.throws(
      () => schedules.removeSlot(schedule.id, slot.slotID),
      /Cannot remove a booked/
    );

    console.log('PASS: Booked slot cannot be removed');

  } finally {
    db.close();
  }
});

test('consultation booked from an IDP records an interaction for that project', async () => {
  const db = createDatabase(':memory:');
  const profileId = (name) => db.prepare(
    'SELECT id FROM user_profile WHERE name = ?'
  ).get(name).id;
  const addUser = (username, profile) => Number(db.prepare(`
    INSERT INTO user_account (username, password_hash, profile_id)
    VALUES (?, 'test', ?)
  `).run(username, profileId(profile)).lastInsertRowid);
  const designerId = addUser('route_booking_designer', 'Interior Designer');
  const customerId = addUser('route_booking_customer', 'Customer');
  const schedule = new AvailabilitySchedule(db).getSchedule(designerId);
  const startsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  const slot = new AvailabilitySchedule(db).addSlot(
    schedule.id, startsAt.toISOString(), endsAt.toISOString()
  );
  const idpId = Number(db.prepare(`
    INSERT INTO idp (designer_id, title, description, style, type)
    VALUES (?, 'Route booking project', 'Project description', 'Modern', '["Kitchen"]')
  `).run(designerId).lastInsertRowid);
  const server = createApp(db).listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/consultation-requests`,
      {
        method: 'POST',
        headers: {
          'X-User-Id': String(customerId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ slotID: slot.slotID, idpId })
      }
    );
    assert.equal(response.status, 201);
    assert.equal(
      db.prepare('SELECT interaction_type FROM interaction_log WHERE idp_id = ?').get(idpId).interaction_type,
      'consultation_request'
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    db.close();
  }
});
