// Routes for #25 Connected-customers metric (Platform Manager)

const express = require('express');
const ContactRequest = require('../entity/ContactRequest');
const UserAccount = require('../entity/UserAccount');
const ConnectedCustomersController = require('../controller/ConnectedCustomersController');

function metricsRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  const controller = new ConnectedCustomersController(new ContactRequest(db));

  // GET /api/metrics/connected-customers?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD (both optional)
  router.get('/connected-customers', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = controller.getConnectedCustomers(user, req.query.startDate, req.query.endDate);
    res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}

module.exports = metricsRoutes;
