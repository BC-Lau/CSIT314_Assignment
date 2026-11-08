
const ConsultationSlot = require('./ConsultationSlot');

/**
 * ENTITY: User Story #20
 * Manages an interior designer's consultation availability.
 */
class AvailabilitySchedule {
  constructor(db) {
    this.db = db;
  }

  // Find or create one schedule for an Interior Designer.
  getSchedule(designerID) {
    const designerId = Number(designerID);

    let schedule = this.db.prepare(
      'SELECT * FROM availability_schedule WHERE designer_id = ?'
    ).get(designerId);

    if (!schedule) {
      this.db.prepare(
        'INSERT OR IGNORE INTO availability_schedule (designer_id) VALUES (?)'
      ).run(designerId);

      schedule = this.db.prepare(
        'SELECT * FROM availability_schedule WHERE designer_id = ?'
      ).get(designerId);
    }

    return schedule;
  }

  // Retrieve all slots belonging to a schedule.
  getSlots(scheduleID) {
    const rows = this.db.prepare(
      `SELECT * FROM consultation_slot
       WHERE schedule_id = ?
       ORDER BY start_time ASC`
    ).all(scheduleID);

    return rows.map(row => new ConsultationSlot(row));
  }

  // Find one consultation slot.
  findSlot(slotID) {
    const row = this.db.prepare(
      'SELECT * FROM consultation_slot WHERE id = ?'
    ).get(slotID);

    return row ? new ConsultationSlot(row) : null;
  }

  // Check whether a time range overlaps an existing slot.
  hasOverlap(scheduleID, start, end, excludeSlotID = null) {
    const overlap = this.db.prepare(
      `SELECT id FROM consultation_slot
       WHERE schedule_id = ?
       AND start_time < ?
       AND end_time > ?
       AND (? IS NULL OR id != ?)
       LIMIT 1`
    ).get(scheduleID, end, start, excludeSlotID, excludeSlotID);

    return Boolean(overlap);
  }

  // Add a consultation slot to the schedule.
  addSlot(scheduleID, start, end) {
    if (!ConsultationSlot.isValidTimeRange(start, end)) {
      throw new Error('Invalid consultation time range');
    }

    if (this.hasOverlap(scheduleID, start, end)) {
      throw new Error('Consultation time slot conflicts with an existing slot');
    }

    const result = this.db.prepare(
      `INSERT INTO consultation_slot
       (schedule_id, start_time, end_time, status)
       VALUES (?, ?, ?, 'available')`
    ).run(scheduleID, start, end);

    return this.findSlot(Number(result.lastInsertRowid));
  }

  // Update an existing consultation slot.
  updateSlot(scheduleID, slotID, start, end) {
    const slot = this.findSlot(slotID);

    if (!slot || slot.scheduleID !== Number(scheduleID)) {
      throw new Error('Consultation slot not found in this schedule');
    }

    slot.updateTime(start, end);

    if (this.hasOverlap(scheduleID, start, end, slotID)) {
      throw new Error('Consultation time slot conflicts with an existing slot');
    }

    this.db.prepare(
      `UPDATE consultation_slot
       SET start_time = ?, end_time = ?
       WHERE id = ? AND schedule_id = ?`
    ).run(start, end, slotID, scheduleID);

    return this.findSlot(slotID);
  }

  // Remove an unbooked consultation slot.
  removeSlot(scheduleID, slotID) {
    const slot = this.findSlot(slotID);

    if (!slot || slot.scheduleID !== Number(scheduleID)) {
      throw new Error('Consultation slot not found in this schedule');
    }

    if (slot.isBooked()) {
      throw new Error('Cannot remove a booked consultation slot');
    }

    this.db.prepare(
      'DELETE FROM consultation_slot WHERE id = ? AND schedule_id = ?'
    ).run(slotID, scheduleID);

    return true;
  }
}

module.exports = AvailabilitySchedule;
