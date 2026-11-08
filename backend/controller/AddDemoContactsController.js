// CONTROLLER: demo tool on the #25 Metrics page — add contacts so the numbers / charts change during a demo.
// Boundary (MetricsPage) -> AddDemoContactsController -> ContactRequest (entity)
// Not a user story: no diagram. Only a Platform Manager can use it.

/** True for a real calendar date such as '2026-03-01' (not '2026-02-30'). */
function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return false;
  return new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

class AddDemoContactsController {
  /** @param {import('../entity/ContactRequest')} contactRequest */
  constructor(contactRequest) {
    this.contactRequest = contactRequest;
  }

  /** `count` random customers contact the designer on `date`. */
  addDemoContacts(user, designerId, date, count) {
    if (!user || !user.canViewMetrics()) {
      return { success: false, message: 'Only platform managers can view metrics' };
    }
    if (!designerId) return { success: false, message: 'Please choose a designer' };
    if (!isValidDate(date)) return { success: false, message: 'Dates must be in YYYY-MM-DD format' };
    count = Number(count);
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return { success: false, message: 'Count must be between 1 and 100' };
    }
    const added = this.contactRequest.addDemoContacts(Number(designerId), date, count);
    return { success: true, added, message: `Added ${added} contacts on ${date}` };
  }
}

module.exports = AddDemoContactsController;
