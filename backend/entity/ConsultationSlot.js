
/**
 * ENTITY: User Story #20
 * Represents an individual consultation time slot.
 */
class ConsultationSlot {
  constructor(data = {}) {
    this.slotID = data.slotID ?? data.id ?? null;
    this.scheduleID = data.scheduleID ?? data.schedule_id ?? null;
    this.startTime = data.startTime ?? data.start_time ?? null;
    this.endTime = data.endTime ?? data.end_time ?? null;
    this.status = data.status ?? 'available';
  }

  // Returns whether this consultation slot is booked.
  isBooked() {
    return this.status === 'booked';
  }

  // Updates the consultation time after validation.
  updateTime(start, end) {
    if (!ConsultationSlot.isValidTimeRange(start, end)) {
      throw new Error('Invalid consultation time range');
    }

    if (this.isBooked()) {
      throw new Error('Cannot modify a booked consultation slot');
    }

    this.startTime = start;
    this.endTime = end;
  }

  // Validates UTC ISO-8601 timestamps.
  static isValidTimeRange(start, end) {
    if (typeof start !== 'string' ||
        typeof end !== 'string') {
      return false;
    }

    const isoUtc =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    if (!isoUtc.test(start) || !isoUtc.test(end)) {
      return false;
    }

    const startMs = Date.parse(start);
    const endMs = Date.parse(end);

    return Number.isFinite(startMs) &&
      Number.isFinite(endMs) &&
      new Date(startMs).toISOString() === start &&
      new Date(endMs).toISOString() === end &&
      endMs > startMs;
  }
}

module.exports = ConsultationSlot;