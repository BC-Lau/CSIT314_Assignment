
/**
 * CONTROL: User Story #20
 * Consultation Availability Management
 *
 * Boundary -> AvailabilityController -> Entities
 */

const ConsultationSlot = require('../entity/ConsultationSlot');

class AvailabilityController {
  constructor(availabilitySchedule) {
    this.availabilitySchedule = availabilitySchedule;
  }

  // Check whether the current user is an Interior Designer.
  isDesigner(user) {
    return Boolean(
      user &&
      user.profile === 'Interior Designer'
    );
  }

  // Retrieve all consultation slots for a designer.
  getConsultationSlots(designerID) {
    const schedule = this.availabilitySchedule.getSchedule(designerID);

    return {
      success: true,
      slots: this.availabilitySchedule.getSlots(schedule.id)
    };
  }

  // Validate a proposed consultation time.
  validateTimeSlot(start, end) {
    return ConsultationSlot.isValidTimeRange(start, end);
  }

  // Verify that a slot belongs to the current designer.
  verifySlotOwnership(user, slotID) {
    if (!this.isDesigner(user)) {
      return false;
    }

    const slot = this.availabilitySchedule.findSlot(slotID);

    if (!slot) {
      return false;
    }

    const schedule = this.availabilitySchedule.getSchedule(user.id);

    return slot.scheduleID === schedule.id;
  }

  // Add a new consultation slot.
  addTimeSlot(user, start, end) {
    if (!this.isDesigner(user)) {
      return {
        success: false,
        message: 'Only Interior Designers can manage consultation slots'
      };
    }

    if (!this.validateTimeSlot(start, end)) {
      return {
        success: false,
        message: 'Invalid consultation start or end time'
      };
    }

    try {
      const schedule = this.availabilitySchedule.getSchedule(user.id);

      const slot = this.availabilitySchedule.addSlot(
        schedule.id,
        start,
        end
      );

      return {
        success: true,
        message: 'Consultation slot created successfully',
        slot
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Edit an existing consultation slot.
  editTimeSlot(user, slotID, start, end) {
    if (!this.verifySlotOwnership(user, slotID)) {
      return {
        success: false,
        message: 'Not authorized to modify this consultation slot'
      };
    }

    if (!this.validateTimeSlot(start, end)) {
      return {
        success: false,
        message: 'Invalid consultation start or end time'
      };
    }

    try {
      const schedule = this.availabilitySchedule.getSchedule(user.id);

      const slot = this.availabilitySchedule.updateSlot(
        schedule.id,
        slotID,
        start,
        end
      );

      return {
        success: true,
        message: 'Consultation slot updated successfully',
        slot
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Remove an existing consultation slot.
  removeTimeSlot(user, slotID) {
    if (!this.verifySlotOwnership(user, slotID)) {
      return {
        success: false,
        message: 'Not authorized to remove this consultation slot'
      };
    }

    try {
      const schedule = this.availabilitySchedule.getSchedule(user.id);

      this.availabilitySchedule.removeSlot(schedule.id, slotID);

      return {
        success: true,
        message: 'Consultation slot removed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = AvailabilityController;
