const VerificationApp = require('../entity/VerificationApp');
const Notification = require('../entity/Notification');

class VerifyLicenseController {
  constructor(userAccount) {
    this.userAccount = userAccount;
  }

  fetchPendingQueue() {
    return VerificationApp.findPending().map((app) => app.getDetails());
  }

  getApplicationDetails(appId) {
    const application = VerificationApp.findById(appId);
    return application ? application.getDetails() : null;
  }

  approveLicense(appId) {
    const application = VerificationApp.findById(appId);
    if (!application) return { success: false, message: 'Verification application not found' };

    application.setStatus('Approved');
    const designer = this.userAccount.findById(application.designerId);
    if (!designer || typeof designer.setVerifiedStatus !== 'function') {
      return { success: false, message: 'Designer account not found' };
    }
    designer.setVerifiedStatus(true);
    designer.setVerifiedBadge(true);
    return { success: true, message: 'License approved successfully' };
  }

  rejectLicense(appId, reason) {
    const application = VerificationApp.findById(appId);
    if (!application) return { success: false, message: 'Verification application not found' };
    const rejectionReason = typeof reason === 'string' ? reason.trim() : '';
    if (!rejectionReason) return { success: false, message: 'Rejection reason is required' };

    application.setStatus('Rejected');
    const designer = this.userAccount.findById(application.designerId);
    if (!designer || typeof designer.setVerifiedStatus !== 'function') {
      return { success: false, message: 'Designer account not found' };
    }
    designer.setVerifiedStatus(false);
    this.notifyDesigner(application.designerId, 'License Verification Rejected', rejectionReason);
    return { success: true, message: 'License rejected successfully' };
  }

  notifyDesigner(designerId, subject, body) {
    const notification = new Notification(this.userAccount.db, {
      recipientId: Number(designerId),
      subject,
      message: body
    });
    return notification.sendNotification() ? notification : null;
  }
}

module.exports = VerifyLicenseController;
