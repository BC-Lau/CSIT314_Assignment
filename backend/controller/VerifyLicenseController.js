const VerificationApp = require('../entity/VerificationApp');
const Notification = require('../entity/Notification');

// #48: Give User Admins the queue, application details, and review decisions.
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
    if (application.status !== 'Pending') {
      return { success: false, message: 'Only pending applications can be reviewed' };
    }

    const designer = this.userAccount.findById(application.designerId);
    if (!designer || designer.profile !== 'Interior Designer') {
      return { success: false, message: 'Designer account not found' };
    }
    application.setStatus('Approved');
    designer.setVerifiedStatus(true);
    designer.setVerifiedBadge(true);
    return { success: true, message: 'License approved successfully' };
  }

  rejectLicense(appId, reason) {
    const application = VerificationApp.findById(appId);
    if (!application) return { success: false, message: 'Verification application not found' };
    const rejectionReason = typeof reason === 'string' ? reason.trim() : '';
    if (!rejectionReason) return { success: false, message: 'Rejection reason is required' };
    if (application.status !== 'Pending') {
      return { success: false, message: 'Only pending applications can be reviewed' };
    }

    const designer = this.userAccount.findById(application.designerId);
    if (!designer || designer.profile !== 'Interior Designer') {
      return { success: false, message: 'Designer account not found' };
    }
    application.setStatus('Rejected', rejectionReason);
    designer.setVerifiedStatus(false);
    designer.setVerifiedBadge(false);
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
