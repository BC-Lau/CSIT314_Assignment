// ENTITY: #25 customers contacting interior designers.
class ContactRequest {
  constructor(db) {
    this.db = db;
  }

  // endDate is inclusive, so compare with the day after it
  countConnectedCustomers(startDate, endDate) {
  }

  countByDesigner(startDate, endDate) {
  }
}

module.exports = ContactRequest;
