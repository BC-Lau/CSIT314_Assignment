const express = require('express');
const UserAccount = require('../entity/UserAccount');
const VerificationApp = require('../entity/VerificationApp');
const Notification = require('../entity/Notification');
const VerifyLicenseController = require('../controller/VerifyLicenseController');
const ManageUserAccountsController = require('../controller/ManageUserAccountsController');
const ManageIDPTagsController = require('../controller/ManageIDPTagsController');
const Moderation = require('../entity/Moderation');
const IDP = require('../entity/IDP');

function adminRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  VerificationApp.useDatabase(db);
  Notification.useDatabase(db);

  const licenseController = new VerifyLicenseController(userAccount);
  const moderation = new Moderation(db);
  const idp = new IDP(db);
  const accountController = new ManageUserAccountsController(userAccount, moderation);
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

  router.get('/moderation/flags', requireUserAdmin, (req, res) => {
    res.json({ success: true, flags: moderation.list() });
  });
  router.post('/moderation/flags/:flagId/:action', requireUserAdmin, (req, res) => {
    const result = moderation.review(req.params.flagId, req.params.action);
    res.status(result.success ? 200 : 400).json(result);
  });
  router.post('/moderation/designers/:designerId/suspend', requireUserAdmin, (req, res) => {
    const result = moderation.suspendDesigner(req.params.designerId);
    res.status(result.success ? 200 : 400).json(result);
  });

  // User Admin IDP inventory and lifecycle actions.
  router.get('/idps', requireUserAdmin, (req, res) => {
    res.json({ success: true, idps: idp.getAllIDPsForAdmin() });
  });
  router.post('/idps/:idpId/suspend', requireUserAdmin, (req, res) => {
    const project = idp.getIDPById(Number(req.params.idpId));
    if (!project) return res.status(404).json({ success: false, message: 'IDP not found' });
    if (!idp.setSuspended(project.id, true)) return res.status(400).json({ success: false, message: 'Unable to suspend IDP' });
    moderation.markIDPSuspended(project.id);
    return res.json({ success: true, message: 'IDP suspended successfully' });
  });
  router.post('/idps/:idpId/reactivate', requireUserAdmin, (req, res) => {
    const project = idp.getIDPById(Number(req.params.idpId));
    if (!project) return res.status(404).json({ success: false, message: 'IDP not found' });
    if (!idp.canReactivate(project.id)) return res.status(400).json({ success: false, message: 'Cannot reactivate an IDP while its Interior Designer account is suspended' });
    if (!idp.setSuspended(project.id, false)) return res.status(400).json({ success: false, message: 'Unable to reactivate IDP' });
    moderation.clearIDPFlag(project.id);
    return res.json({ success: true, message: 'IDP reactivated successfully; moderation flag cleared' });
  });
  router.delete('/idps/:idpId', requireUserAdmin, (req, res) => {
    const project = idp.getIDPById(Number(req.params.idpId));
    if (!project) return res.status(404).json({ success: false, message: 'IDP not found' });
    idp.deleteIDP(project.id);
    moderation.clearIDPFlag(project.id);
    return res.json({ success: true, message: 'IDP permanently removed' });
  });

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
