// CONTROLLER: #25 "As a Platform Manager, I want to see how many customers connected with designers".
// Boundary (MetricsPage) -> ConnectedCustomersController -> ContactRequest (entity)
// Dates are 'YYYY-MM-DD' strings; both ends of the range are inclusive.

/** Today's local date as 'YYYY-MM-DD'. */
function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' plus n days (n can be negative). */
function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** True for a real calendar date such as '2026-03-01' (not '2026-02-30'). */
function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && addDays(date, 0) === date;
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

  /**
   * @param {import('../entity/UserAccount') | null} user  the logged-in user (a profile subclass)
   * Default range: the last 30 days (including today).
   */
  getConnectedCustomers(user, startDate, endDate) {
    if (!user || !user.canViewMetrics()) {
      return { success: false, message: 'Only platform managers can view metrics' };
    }
    const today = this.getToday();
    endDate = endDate || today;
    startDate = startDate || addDays(endDate, -29);

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return { success: false, message: 'Dates must be in YYYY-MM-DD format' };
    }
    if (endDate > today) endDate = today; // future end date: count up to today
    if (startDate > endDate) {
      return { success: false, message: 'Start date must be before end date' };
    }

    const total = this.contactRequest.countConnectedCustomers(startDate, endDate);
    const byDesigner = this.contactRequest.countByDesigner(startDate, endDate);
    const result = { success: true, startDate, endDate, total, byDesigner };
    if (total === 0) result.message = 'No contacts in this period';
    return result;
  }
}

module.exports = ConnectedCustomersController;
