// Routes for #25 Connected-customers metric (Platform Manager)

const express = require('express');
const ContactRequest = require('../entity/ContactRequest');
const UserAccount = require('../entity/UserAccount');
const ConnectedCustomersController = require('../controller/ConnectedCustomersController');
const ConnectedCustomersTrendController = require('../controller/ConnectedCustomersTrendController');
const AddDemoContactsController = require('../controller/AddDemoContactsController');
const TrackInteractionRateController = require('../controller/TrackInteractionRateController');
const PlatformActivityReport = require('../entity/PlatformActivityReport');
const PlatformActivityReportController = require('../controller/PlatformActivityReportController');

function metricsRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  const controller = new ConnectedCustomersController(new ContactRequest(db));
  const trendController = new ConnectedCustomersTrendController(new ContactRequest(db));
  const demoController = new AddDemoContactsController(new ContactRequest(db));
  const interactionController = new TrackInteractionRateController(db, userAccount);
  const activityReportController = new PlatformActivityReportController(new PlatformActivityReport(db));

  const logTelemetry = (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    if (!user || user.profile !== 'Customer') {
      return res.status(403).json({ success: false, message: 'Only customers can submit interaction telemetry' });
    }
    const logged = interactionController.logInteraction(user.id, req.body?.idpId, req.body?.type);
    return res.status(logged ? 201 : 400).json({
      success: logged,
      message: logged ? 'Interaction recorded' : 'Unable to record interaction'
    });
  };
  router.post('/telemetry/log', logTelemetry);
  router.post('/log', logTelemetry);

  const getIdpInteractionRate = (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    if (!user || user.profile !== 'Platform Manager') {
      return res.status(403).json({ success: false, message: 'Only platform managers can view interaction reports' });
    }
    const report = interactionController.generateIdpInteractionRateReport(
      req.query.timeframe,
      req.query.categoryId,
      req.query.interactionType
    );
    return res.json({
      success: true,
      report: {
        reportId: report.reportId,
        generatedDate: report.generatedDate,
        metricsData: report.metricsData
      }
    });
  };
  router.get('/idp-interaction-rate', getIdpInteractionRate);
  router.get('/interaction-rate', getIdpInteractionRate);

  // GET /api/metrics/reports?period=daily|weekly|monthly|yearly&date=YYYY-MM-DD
  router.get('/reports', (req, res) => {
    const result = activityReportController.getReport(
      userAccount.findById(req.get('X-User-Id')),
      req.query.period,
      req.query.date
    );
    const { status, ...body } = result;
    return res.status(status).json(body);
  });

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
