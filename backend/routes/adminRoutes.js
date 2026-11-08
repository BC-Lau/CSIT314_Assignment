const express = require('express');
const UserAccount = require('../entity/UserAccount');
const VerificationApp = require('../entity/VerificationApp');
const Notification = require('../entity/Notification');
const VerifyLicenseController = require('../controller/VerifyLicenseController');
const ManageUserAccountsController = require('../controller/ManageUserAccountsController');
const ManageIDPTagsController = require('../controller/ManageIDPTagsController');

function adminRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  VerificationApp.useDatabase(db);
  Notification.useDatabase(db);

  const licenseController = new VerifyLicenseController(userAccount);
  const accountController = new ManageUserAccountsController(userAccount);
  const tagController = new ManageIDPTagsController(db);
  const requirePlatformManager = (req, res, next) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login required' });
    if (user.profile !== 'Platform Manager') return res.status(403).json({ success: false, message: 'Only platform managers can manage IDP tags' });
    return next();
  };
  const currentUser = (req) => userAccount.findById(req.get('X-User-Id'));
  const requireUserAdmin = (req, res, next) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login required' });
    if (user.profile !== 'User Admin') {
      return res.status(403).json({ success: false, message: 'Only user admins can manage license verification' });
    }
    return next();
  };

  router.get('/tags', requirePlatformManager, (req, res) => {
    res.json({ success: true, ...tagController.list() });
  });
  router.post('/tags/bulk', requirePlatformManager, (req, res) => {
    const result = tagController.add(req.body?.category, req.body?.tags);
    res.status(result.success ? 200 : 400).json(result);
  });
  router.delete('/tags/bulk', requirePlatformManager, (req, res) => {
    const result = tagController.remove(req.body?.category, req.body?.tags);
    res.status(result.success ? 200 : 400).json(result);
  });

  router.get('/verifications/pending', requireUserAdmin, (req, res) => {
    res.json({ success: true, applications: licenseController.fetchPendingQueue() });
  });

  router.get('/verifications/:appId', requireUserAdmin, (req, res) => {
    const application = licenseController.getApplicationDetails(req.params.appId);
    res.status(application ? 200 : 404).json(application
      ? { success: true, application }
      : { success: false, message: 'Verification application not found' });
  });

  router.get('/verifications/:appId/document', requireUserAdmin, (req, res) => {
    const document = VerificationApp.findDocumentById(req.params.appId);
    if (!document || !document.data) {
      return res.status(404).json({ success: false, message: 'License document not found' });
    }
    res.set('Content-Type', document.mimeType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${document.fileName.replace(/["\\]/g, '_')}"`);
    res.set('X-Content-Type-Options', 'nosniff');
    return res.send(Buffer.from(document.data));
  });

  router.post('/verifications/:appId/approve', requireUserAdmin, (req, res) => {
    const result = licenseController.approveLicense(req.params.appId);
    res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/verifications/:appId/reject', requireUserAdmin, (req, res) => {
    const result = licenseController.rejectLicense(req.params.appId, req.body?.reason);
    res.status(result.success ? 200 : 400).json(result);
  });

  router.post('/accounts', (req, res) => {
    const result = accountController.createAccount(currentUser(req), req.body ?? {});
    res.status(result.success ? 201 : 400).json(result);
  });
  router.get('/accounts', (req, res) => {
    const result = accountController.viewAccounts(currentUser(req));
    res.status(result.success ? 200 : 403).json(result);
  });
  router.put('/accounts/:userId', (req, res) => {
    const result = accountController.updateAccount(currentUser(req), req.params.userId, req.body ?? {});
    res.status(result.success ? 200 : 400).json(result);
  });
  router.post('/accounts/:userId/suspend', (req, res) => {
    const result = accountController.suspendAccount(currentUser(req), req.params.userId);
    res.status(result.success ? 200 : 400).json(result);
  });
  router.post('/accounts/:userId/reactivate', (req, res) => {
    const result = accountController.reactivateAccount(currentUser(req), req.params.userId);
    res.status(result.success ? 200 : 400).json(result);
  });
  router.post('/accounts/:userId/reset-password', (req, res) => {
    const result = accountController.resetPassword(currentUser(req), req.params.userId, req.body?.password);
    res.status(result.success ? 200 : 400).json(result);
  });
  router.post('/accounts/:userId/lock', (req, res) => {
    const result = accountController.lockAccount(currentUser(req), req.params.userId);
    res.status(result.success ? 200 : 400).json(result);
  });
  router.post('/accounts/:userId/unlock', (req, res) => {
    const result = accountController.unlockAccount(currentUser(req), req.params.userId);
    res.status(result.success ? 200 : 400).json(result);
  });
  router.post('/accounts/:userId/security-incident', (req, res) => {
    const result = accountController.recordSecurityIncident(currentUser(req), req.params.userId);
    res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}

module.exports = adminRoutes;
