const express = require('express');
const UserAccount = require('../entity/UserAccount');
const VerificationApp = require('../entity/VerificationApp');
const SubmitLicenseController = require('../controller/SubmitLicenseController');

function designerRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  VerificationApp.useDatabase(db);
  const licenseController = new SubmitLicenseController(userAccount);
  const currentUser = (req) => userAccount.findById(req.get('X-User-Id'));
  const requireDesigner = (req, res, next) => {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Login required' });
    if (user.profile !== 'Interior Designer') {
      return res.status(403).json({ success: false, message: 'Only interior designers can access license verification' });
    }
    req.designerUser = user;
    return next();
  };

  router.get('/verification', requireDesigner, (req, res) => {
    const result = licenseController.getStatus(req.designerUser);
    res.status(result.success ? 200 : 403).json(result);
  });

  router.get('/verification/document', requireDesigner, (req, res) => {
    const document = VerificationApp.findDocumentForDesigner(req.designerUser.id);
    if (!document || !document.data) {
      return res.status(404).json({ success: false, message: 'Submitted license document not found' });
    }
    res.set('Content-Type', document.mimeType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${String(document.fileName).replace(/["\\]/g, '_')}"`);
    res.set('X-Content-Type-Options', 'nosniff');
    return res.send(Buffer.from(document.data));
  });

  router.post('/verification/submit', express.raw({ type: 'application/octet-stream', limit: '8mb' }), requireDesigner, (req, res) => {
    if (req.is('application/json')) {
      const payload = req.body ?? {};
      const file = payload.licenseFile ?? {};
      const documentData = typeof file.data === 'string' ? Buffer.from(file.data, 'base64') : Buffer.alloc(0);
      const result = licenseController.submitLicense(req.designerUser, {
        companyName: payload.companyName,
        uen: payload.uen,
        licenseNumber: payload.licenseNumber,
        documentFileName: file.name,
        documentMimeType: file.mimeType,
        documentData
      });
      return res.status(result.success ? 201 : result.message === 'Your license is already verified' ? 409 : 400).json(result);
    }
    let companyName;
    let uen;
    let licenseNumber;
    try {
      companyName = decodeURIComponent(req.get('X-Company-Name') ?? '');
      uen = decodeURIComponent(req.get('X-UEN') ?? '');
      licenseNumber = decodeURIComponent(req.get('X-License-Number') ?? '');
    } catch {
      companyName = uen = licenseNumber = '';
    }
    let documentFileName;
    try {
      documentFileName = decodeURIComponent(req.get('X-File-Name') ?? '');
    } catch {
      documentFileName = '';
    }
    const result = licenseController.submitLicense(req.designerUser, {
      companyName,
      uen,
      licenseNumber,
      documentFileName,
      documentMimeType: req.get('X-Mime-Type'),
      documentData: req.body
    });
    res.status(result.success ? 201 : result.message === 'Your license is already verified' ? 409 : 400).json(result);
  });

  return router;
}

module.exports = designerRoutes;
