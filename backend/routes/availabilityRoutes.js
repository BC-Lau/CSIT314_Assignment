
const express = require('express');
const UserAccount = require('../entity/UserAccount');
const AvailabilitySchedule = require('../entity/AvailabilitySchedule');
const AvailabilityController = require('../controller/AvailabilityController');

/**
 * ROUTES: User Story #20
 * Consultation Availability Management
 */
function availabilityRoutes(db) {
  const router = express.Router();

  const userAccount = new UserAccount(db);
  const schedule = new AvailabilitySchedule(db);
  const controller = new AvailabilityController(schedule);

  // Retrieve the current user using the project's existing convention.
  const currentUser = (req) =>
    userAccount.findById(req.get('X-User-Id'));

  const requireDesigner = (req, res, next) => {
    const user = currentUser(req);

    if (!user || !user.canCreateIDP()) {
      return res.status(403).json({
        success: false,
        message: 'Only Interior Designers can manage availability'
      });
    }

    req.designer = user;
    next();
  };

  // GET /api/availability/mine
  // View the logged-in designer's slots.
  router.get('/mine', requireDesigner, (req, res) => {
    const result = controller.getConsultationSlots(req.designer.id);
    return res.json(result);
  });

  // GET /api/availability/designer/:designerID
  // Public viewing of a designer's available slots.
  router.get('/designer/:designerID', (req, res) => {
    const designer = userAccount.findById(req.params.designerID);

    if (!designer || !designer.canCreateIDP()) {
      return res.status(404).json({
        success: false,
        message: 'Interior Designer not found'
      });
    }

    const result = controller.getConsultationSlots(designer.id);

    return res.json({
      success: true,
      slots: result.slots.filter(slot => slot.status === 'available')
    });
  });

  // POST /api/availability
  // Create a consultation slot.
  router.post('/', requireDesigner, (req, res) => {
    const { startTime, endTime } = req.body ?? {};

    const result = controller.addTimeSlot(
      req.designer,
      startTime,
      endTime
    );

    return res.status(result.success ? 201 : 400).json(result);
  });

  // PUT /api/availability/:slotID
  // Edit an existing consultation slot.
  router.put('/:slotID', requireDesigner, (req, res) => {
    const { startTime, endTime } = req.body ?? {};

    const result = controller.editTimeSlot(
      req.designer,
      req.params.slotID,
      startTime,
      endTime
    );

    return res.status(result.success ? 200 : 400).json(result);
  });

  // DELETE /api/availability/:slotID
  // Remove an existing consultation slot.
  router.delete('/:slotID', requireDesigner, (req, res) => {
    const result = controller.removeTimeSlot(
      req.designer,
      req.params.slotID
    );

    return res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}

module.exports = availabilityRoutes;
