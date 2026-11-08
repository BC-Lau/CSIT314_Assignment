// BOUNDARY: admin license-verification page handlers.
class AdminLicensePage {
  constructor(controller) {
    this.controller = controller;
  }

  fetchPendingQueue() {
    return this.controller.fetchPendingQueue();
  }

  getApplicationDetails(appId) {
    return this.controller.getApplicationDetails(appId);
  }

  approveLicense(appId) {
    return this.controller.approveLicense(appId);
  }

  rejectLicense(appId, reason) {
    return this.controller.rejectLicense(appId, reason);
  }
}

module.exports = AdminLicensePage;
