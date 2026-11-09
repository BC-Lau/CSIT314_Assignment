// ENTITY: #25 customers contacting interior designers.
class ContactRequest {
  constructor(db) {
    this.db = db;
  }

  isActiveDesigner(designerId) {
    return Boolean(this.db.prepare(`
      SELECT 1
        FROM user_account a
        JOIN user_profile p ON p.id = a.profile_id
       WHERE a.id = ? AND a.is_active = 1 AND p.name = 'Interior Designer'
    `).get(designerId));
  }

  hasPublicIDP(idpId, designerId) {
    return Boolean(this.db.prepare(`
      SELECT 1 FROM idp
       WHERE id = ? AND designer_id = ? AND visibility = 'public'
    `).get(idpId, designerId));
  }

  createRequest(customerId, designerId, idpId, message) {
    const result = this.db.prepare(`
      INSERT INTO contact_request (customer_id, designer_id, idp_id, message)
      VALUES (?, ?, ?, ?)
    `).run(customerId, designerId, idpId, message);
    return Number(result.lastInsertRowid);
  }

  getRequestsForDesigner(designerId) {
    return this.db.prepare(`
      SELECT c.id, c.message, c.created_at AS createdAt,
             c.idp_id AS idpId, i.title AS idpTitle,
             a.username AS customerName, a.email AS customerEmail
        FROM contact_request c
        JOIN user_account a ON a.id = c.customer_id
        LEFT JOIN idp i ON i.id = c.idp_id
       WHERE c.designer_id = ?
       ORDER BY c.created_at DESC, c.id DESC
    `).all(designerId).map((row) => ({ ...row }));
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

  // #25 trend (extra): the same counts, but one number per day / month / year
  countConnectedCustomersByPeriod(startDate, endDate, unit) {
    return this.db
      .prepare(`SELECT strftime(?, created_at) AS period, COUNT(DISTINCT customer_id) AS total
                  FROM contact_request
                 WHERE created_at >= ? AND created_at < date(?, '+1 day')
                 GROUP BY period`)
      .all(PERIOD_FORMAT[unit], startDate, endDate)
      .map((row) => ({ ...row }));
  }

  countByDesignerAndPeriod(startDate, endDate, unit) {
    return this.db
      .prepare(`SELECT strftime(?, created_at) AS period, designer_id AS designerId,
                       COUNT(DISTINCT customer_id) AS customerCount
                  FROM contact_request
                 WHERE created_at >= ? AND created_at < date(?, '+1 day')
                 GROUP BY period, designer_id`)
      .all(PERIOD_FORMAT[unit], startDate, endDate)
      .map((row) => ({ ...row }));
  }

  // demo tool: `count` random customers contact this designer on `date` (returns how many were added)
  addDemoContacts(designerId, date, count) {
    return Number(this.db
      .prepare(`INSERT INTO contact_request (customer_id, designer_id, message, created_at)
                SELECT a.id, ?, 'Demo contact', ? || ' 12:00:00'
                  FROM user_account a JOIN user_profile p ON p.id = a.profile_id
                 WHERE p.name = 'Customer'
                 ORDER BY RANDOM() LIMIT ?`)
      .run(designerId, date, count).changes);
  }
}

// how one period is written: day '2026-03-31', month '2026-03', year '2026'
const PERIOD_FORMAT = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' };

module.exports = ContactRequest;