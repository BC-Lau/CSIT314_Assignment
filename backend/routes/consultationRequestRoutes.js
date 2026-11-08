
const express = require('express');

const UserAccount = require('../entity/UserAccount');
const ConsultationRequest = require('../entity/ConsultationRequest');
const ConsultationRequestController =
  require('../controller/ConsultationRequestController');

/**
 * ROUTES: User Story #3
 * Customer consultation requests.
 */
function consultationRequestRoutes(db) {
  const router = express.Router();

  const users = new UserAccount(db);
  const requests = new ConsultationRequest(db);
  const controller = new ConsultationRequestController(requests);

  // POST /api/consultation-requests
  router.post('/', (req, res) => {
    const user = users.findById(req.get('X-User-Id'));

    const result = controller.requestConsultation(
      user,
      req.body?.slotID,
      req.body?.message ?? ''
    );

    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      ...(result.booking ? { booking: result.booking } : {})
    });
  });

  
  // GET /api/consultation-requests/mine
  // Customer views their own bookings.
  router.get('/mine', (req, res) => {
    const user = users.findById(req.get('X-User-Id'));
    const result = controller.getMyConsultations(user);

    return res.status(result.status).json(result);
  });

  // GET /api/consultation-requests/designer
  // Designer views consultation requests made with them.
  router.get('/designer', (req, res) => {
    const user = users.findById(req.get('X-User-Id'));
    const result = controller.getDesignerConsultations(user);

    return res.status(result.status).json(result);
  });

  // DELETE /api/consultation-requests/:requestID
  // Customer cancels an existing consultation.
  router.delete('/:requestID', (req, res) => {
    const user = users.findById(req.get('X-User-Id'));

    const result = controller.cancelConsultation(
      user,
      req.params.requestID
    );

    return res.status(result.status).json(result);
  });
  

  return router;
}

module.exports = consultationRequestRoutes;
