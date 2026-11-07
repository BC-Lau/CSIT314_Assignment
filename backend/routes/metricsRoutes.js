// Routes for #25 Connected-customers metric (Platform Manager)

const express = require('express');
const ContactRequest = require('../entity/ContactRequest');
const UserAccount = require('../entity/UserAccount');
const ConnectedCustomersController = require('../controller/ConnectedCustomersController');
const ConnectedCustomersTrendController = require('../controller/ConnectedCustomersTrendController');
const AddDemoContactsController = require('../controller/AddDemoContactsController');

function metricsRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  const controller = new ConnectedCustomersController(new ContactRequest(db));
  const trendController = new ConnectedCustomersTrendController(new ContactRequest(db));
  const demoController = new AddDemoContactsController(new ContactRequest(db));

  // GET /api/metrics/connected-customers?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD (both optional)
  router.get('/connected-customers', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = controller.getConnectedCustomers(user, req.query.startDate, req.query.endDate);
    res.status(result.success ? 200 : 400).json(result);
  });

  // GET /api/metrics/connected-customers/trend?range=year|month|day|custom&startDate=...&endDate=...
  router.get('/connected-customers/trend', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = trendController.getConnectedCustomersTrend(user, req.query.range, req.query.startDate, req.query.endDate);
    res.status(result.success ? 200 : 400).json(result);
  });

  // POST /api/metrics/demo-contacts  { designerId, date, count }  (demo tool: add data for a demo)
  router.post('/demo-contacts', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const { designerId, date, count } = req.body ?? {};
    const result = demoController.addDemoContacts(user, designerId, date, count);
    res.status(result.success ? 201 : 400).json(result);
  });

  return router;
}

module.exports = metricsRoutes;
