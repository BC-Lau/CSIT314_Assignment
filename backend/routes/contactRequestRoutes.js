const express = require('express');
const UserAccount = require('../entity/UserAccount');
const ContactRequest = require('../entity/ContactRequest');
const ContactRequestController = require('../controller/ContactRequestController');
const TrackInteractionRateController = require('../controller/TrackInteractionRateController');

function contactRequestRoutes(db) {
  const router = express.Router();
  const users = new UserAccount(db);
  const interactions = new TrackInteractionRateController(db, users);
  const controller = new ContactRequestController(new ContactRequest(db), interactions);

  router.post('/', (req, res) => {
    const result = controller.createRequest(
      users.findById(req.get('X-User-Id')),
      req.body?.designerId,
      req.body?.idpId,
      req.body?.message
    );
    const { status, ...body } = result;
    return res.status(status).json(body);
  });

  router.get('/designer', (req, res) => {
    const result = controller.getDesignerRequests(users.findById(req.get('X-User-Id')));
    const { status, ...body } = result;
    return res.status(status).json(body);
  });

  return router;
}

module.exports = contactRequestRoutes;
