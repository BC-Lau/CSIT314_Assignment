
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../database/db');
const AvailabilitySchedule = require('../backend/entity/AvailabilitySchedule');
const ConsultationRequest = require('../backend/entity/ConsultationRequest');

test('Consultation cancellation and rebooking', () => {
  const db = createDatabase(':memory:');

  try {
    const profile = db.prepare(
      'SELECT id FROM user_profile WHERE name = ?'
    );

    const createUser = db.prepare(`
      INSERT INTO user_account(username, password_hash, profile_id)
      VALUES (?, ?, ?)
    `);

    const designerID = Number(createUser.run(
      'cancel_designer', 'test', profile.get('Interior Designer').id
    ).lastInsertRowid);

    const customer1 = Number(createUser.run(
      'cancel_customer1', 'test', profile.get('Customer').id
    ).lastInsertRowid);

    const customer2 = Number(createUser.run(
      'cancel_customer2', 'test', profile.get('Customer').id
    ).lastInsertRowid);

    const schedules = new AvailabilitySchedule(db);
    const requests = new ConsultationRequest(db);

    const schedule = schedules.getSchedule(designerID);

    const slot = schedules.addSlot(
      schedule.id,
      '2030-12-10T02:00:00.000Z',
      '2030-12-10T03:00:00.000Z'
    );

    // Initial booking.
    const first = requests.createRequest(slot.slotID, customer1);

    assert.equal(schedules.findSlot(slot.slotID).status, 'booked');
    console.log('PASS: Initial booking created');

    // Cancel original booking.
    const cancelled = requests.cancelRequest(first.id, customer1);

    assert.equal(cancelled.success, true);
    assert.equal(schedules.findSlot(slot.slotID).status, 'available');

    console.log('PASS: Cancellation releases slot');

    // Historical record preserved.
    const history = requests.getCustomerRequests(customer1);

    assert.equal(history.length, 1);
    assert.equal(history[0].status, 'cancelled');
    assert.ok(history[0].cancelledAt);

    console.log('PASS: Cancellation history preserved');

    // Another customer can book the released slot.
    const second = requests.createRequest(slot.slotID, customer2);

    assert.equal(second.customerID, customer2);
    assert.equal(schedules.findSlot(slot.slotID).status, 'booked');

    console.log('PASS: Released slot can be rebooked');

    // Confirm both historical records exist.
    const records = db.prepare(`
      SELECT status FROM consultation_request
      WHERE slot_id = ?
      ORDER BY id
    `).all(slot.slotID);

    assert.deepEqual(records.map(r => r.status), [
      'cancelled',
      'booked'
    ]);

    console.log('PASS: Historical and active bookings coexist');

  } finally {
    db.close();
  }
});
