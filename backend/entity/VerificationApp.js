class VerificationApp {
  static database = null;

  constructor(db, data = {}) {
    this.db = db ?? VerificationApp.database;
    this.appId = Number(data.appId ?? data.id);
    this.designerId = Number(data.designerId ?? data.designer_id);
    this.companyName = String(data.companyName ?? data.company_name ?? '');
    this.uen = String(data.uen ?? '');
    this.licenseNumber = String(data.licenseNumber ?? data.license_number ?? '');
    this.documentUrl = String(data.documentUrl ?? data.document_url ?? '');
    this.status = data.status ?? 'Pending';
    this.submittedDate = data.submittedDate instanceof Date
      ? data.submittedDate
      : new Date(data.submittedDate ?? data.submitted_date ?? Date.now());
  }

  static useDatabase(db) {
    VerificationApp.database = db;
  }

  static createTableIfNeeded(db) {
    db.prepare(`CREATE TABLE IF NOT EXISTS verification_application (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      designer_id INTEGER NOT NULL REFERENCES user_account(id),
      company_name TEXT NOT NULL,
      uen TEXT NOT NULL,
      license_number TEXT NOT NULL,
      document_url TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
      submitted_date TEXT NOT NULL
    )`).run();
  }

  static fromRow(row) {
    return new VerificationApp(VerificationApp.database, {
      appId: row.id,
      designerId: row.designer_id,
      companyName: row.company_name,
      uen: row.uen,
      licenseNumber: row.license_number,
      documentUrl: row.document_url,
      status: row.status,
      submittedDate: row.submitted_date
    });
  }

  setStatus(status) {
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      throw new Error('Invalid verification status');
    }
    this.status = status;
    if (this.db && this.appId) {
      VerificationApp.createTableIfNeeded(this.db);
      this.db.prepare('UPDATE verification_application SET status = ? WHERE id = ?').run(status, this.appId);
    }
    return this;
  }

  getDetails() {
    return {
      appId: this.appId,
      designerId: this.designerId,
      companyName: this.companyName,
      uen: this.uen,
      licenseNumber: this.licenseNumber,
      documentUrl: this.documentUrl,
      status: this.status,
      submittedDate: this.submittedDate
    };
  }

  static findPending() {
    if (!VerificationApp.database) return [];
    VerificationApp.createTableIfNeeded(VerificationApp.database);
    return VerificationApp.database.prepare(
      "SELECT * FROM verification_application WHERE status = 'Pending' ORDER BY submitted_date ASC, id ASC"
    ).all().map(VerificationApp.fromRow);
  }

  static findById(appId) {
    if (!VerificationApp.database) return null;
    VerificationApp.createTableIfNeeded(VerificationApp.database);
    const id = Number(appId);
    if (!Number.isInteger(id)) return null;
    const row = VerificationApp.database.prepare('SELECT * FROM verification_application WHERE id = ?').get(id);
    return row ? VerificationApp.fromRow(row) : null;
  }
}

module.exports = VerificationApp;
