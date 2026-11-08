
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../database/db');
const AvailabilitySchedule = require('../backend/entity/AvailabilitySchedule');
const ConsultationRequest = require('../backend/entity/ConsultationRequest');

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
    const requests = new ConsultationRequest(db);

    const schedule = schedules.getSchedule(designerID);

    const slot = schedules.addSlot(
      schedule.id,
      '2030-12-10T02:00:00.000Z',
      '2030-12-10T03:00:00.000Z'
    );

    // First customer books successfully.
    const booking = requests.createRequest(
      slot.slotID, customer1, 'Kitchen renovation consultation'
    );

    assert.equal(booking.customerID, customer1);
    assert.equal(booking.slotID, slot.slotID);

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
