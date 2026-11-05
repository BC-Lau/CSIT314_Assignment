// CONTROLLER: #25 "As a Platform Manager, I want to see how many customers connected with designers".
// Boundary (MetricsPage) -> ConnectedCustomersController -> ContactRequest (entity)
// Dates are 'YYYY-MM-DD' strings; both ends of the range are inclusive.

/** Today's local date as 'YYYY-MM-DD'. */
function todayString() {
}

class ConnectedCustomersController {
  /**
   * @param {import('../entity/ContactRequest')} contactRequest
   * @param {() => string} getToday  injected so tests can fix "today"
   */
  constructor(contactRequest, getToday = todayString) {
    this.contactRequest = contactRequest;
    this.getToday = getToday;
  }

  /** Default range: the last 30 days (including today). */
  getConnectedCustomers(startDate, endDate) {
  }
}

module.exports = ConnectedCustomersController;
