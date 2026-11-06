// ENTITY: #25 customers contacting interior designers.
class ContactRequest {
  constructor(db) {
    this.db = db;
  }

  // endDate is inclusive, so compare with the day after it
  countConnectedCustomers(startDate, endDate) {
    return this.db
      .prepare(`SELECT COUNT(DISTINCT customer_id) AS n FROM contact_request
                 WHERE created_at >= ? AND created_at < date(?, '+1 day')`)
      .get(startDate, endDate).n;
  }

  countByDesigner(startDate, endDate) {
    return this.db
      .prepare(`SELECT c.designer_id AS designerId, a.username AS designerName,
                       COUNT(DISTINCT c.customer_id) AS customerCount
                  FROM contact_request c JOIN user_account a ON a.id = c.designer_id
                 WHERE c.created_at >= ? AND c.created_at < date(?, '+1 day')
                 GROUP BY c.designer_id
                 ORDER BY customerCount DESC, designerName`)
      .all(startDate, endDate)
      .map((row) => ({ ...row }));
  }
}

module.exports = ContactRequest;