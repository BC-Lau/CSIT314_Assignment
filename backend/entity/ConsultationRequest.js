/**
 * ENTITY: User Stories #3 and #20
 * Records consultation requests and reserves available slots.
 */
class ConsultationRequest {
  constructor(db) {
    this.db = db;
  }

  // Find a consultation request by its slot ID.
  findBySlot(slotID) {
    return this.db.prepare(
      `SELECT id, slot_id AS slotID,
              customer_id AS customerID,
              message, created_at AS createdAt
       FROM consultation_request
       WHERE slot_id = ? AND status = 'booked'`
    ).get(slotID) ?? null;
  }

  // Reserve a slot and record the customer atomically.
  createRequest(slotID, customerID, message = '') {
    const id = Number(slotID);
    const customer = Number(customerID);

    if (!Number.isSafeInteger(id) || id <= 0 ||
        !Number.isSafeInteger(customer) || customer <= 0) {
      throw new Error('Invalid consultation slot or customer');
    }

    // Ensure booking and status update succeed or fail together.
    this.db.exec('BEGIN IMMEDIATE');

    try {
      const slot = this.db.prepare(
        `SELECT id, start_time, status
         FROM consultation_slot WHERE id = ?`
      ).get(id);

      if (!slot) {
        throw new Error('Consultation slot not found');
      }

      if (slot.status !== 'available') {
        throw new Error('Consultation slot is already booked');
      }

      if (Date.parse(slot.start_time) <= Date.now()) {
        throw new Error('Cannot book a past consultation slot');
      }

      const result = this.db.prepare(
        `INSERT INTO consultation_request
         (slot_id, customer_id, message)
         VALUES (?, ?, ?)`
      ).run(id, customer, message);

      const updated = this.db.prepare(
        `UPDATE consultation_slot
         SET status = 'booked'
         WHERE id = ? AND status = 'available'`
      ).run(id);

      if (updated.changes !== 1) {
        throw new Error('Consultation slot is no longer available');
      }

      this.db.exec('COMMIT');

      return this.findBySlot(id);
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  
  // Retrieve all consultations belonging to a customer.
  getCustomerRequests(customerID) {
    return this.db.prepare(`
      SELECT
        cr.id,
        cr.slot_id AS slotID,
        cr.customer_id AS customerID,
        cr.message,
        cr.status,
        cr.created_at AS createdAt,
        cr.cancelled_at AS cancelledAt,
        cs.start_time AS startTime,
        cs.end_time AS endTime,
        ua.username AS designerName
      FROM consultation_request cr
      JOIN consultation_slot cs ON cs.id = cr.slot_id
      JOIN availability_schedule s ON s.id = cs.schedule_id
      JOIN user_account ua ON ua.id = s.designer_id
      WHERE cr.customer_id = ?
      ORDER BY cs.start_time DESC
    `).all(customerID);
  }

  // Retrieve consultations booked with an Interior Designer.
  getDesignerRequests(designerID) {
    return this.db.prepare(`
      SELECT
        cr.id,
        cr.slot_id AS slotID,
        cr.customer_id AS customerID,
        cr.message,
        cr.status,
        cr.created_at AS createdAt,
        cr.cancelled_at AS cancelledAt,
        cs.start_time AS startTime,
        cs.end_time AS endTime,
        ua.username AS customerName
      FROM consultation_request cr
      JOIN consultation_slot cs ON cs.id = cr.slot_id
      JOIN availability_schedule s ON s.id = cs.schedule_id
      JOIN user_account ua ON ua.id = cr.customer_id
      WHERE s.designer_id = ?
      ORDER BY cs.start_time DESC
    `).all(designerID);
  }

  // Cancel a customer's own booking and release the slot.
  cancelRequest(requestID, customerID) {
    this.db.exec('BEGIN IMMEDIATE');

    try {
      const booking = this.db.prepare(`
        SELECT cr.id, cr.slot_id AS slotID,
               cr.status, cs.start_time AS startTime
        FROM consultation_request cr
        JOIN consultation_slot cs ON cs.id = cr.slot_id
        WHERE cr.id = ? AND cr.customer_id = ?
      `).get(requestID, customerID);

      if (!booking) {
        throw new Error('Consultation booking not found');
      }

      if (booking.status !== 'booked') {
        throw new Error('Consultation is already cancelled');
      }

      if (Date.parse(booking.startTime) <= Date.now()) {
        throw new Error('Past consultations cannot be cancelled');
      }

      const result = this.db.prepare(`
        UPDATE consultation_request
        SET status = 'cancelled',
            cancelled_at = datetime('now')
        WHERE id = ? AND customer_id = ?
          AND status = 'booked'
      `).run(requestID, customerID);

      if (result.changes !== 1) {
        throw new Error('Consultation could not be cancelled');
      }

      this.db.prepare(`
        UPDATE consultation_slot
        SET status = 'available'
        WHERE id = ? AND status = 'booked'
      `).run(booking.slotID);

      this.db.exec('COMMIT');

      return {
        success: true,
        message: 'Consultation cancelled successfully'
      };

    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

module.exports = ConsultationRequest;
