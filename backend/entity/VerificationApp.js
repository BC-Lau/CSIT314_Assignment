/**
 * Entity for User Story #48: User Admins review Interior Designer license 
 * applications. It stores submitted evidence and review outcomes; it does not
 * independently validate licenses against an external registry.
 */
class VerificationApp {
  static database = null;

  // Create a verification application object from incoming DB row data.
  constructor(db, data = {}) {
    this.db = db ?? VerificationApp.database;
    this.appId = Number(data.appId ?? data.id);
    this.designerId = Number(data.designerId ?? data.designer_id);
    this.companyName = String(data.companyName ?? data.company_name ?? '');
    this.uen = String(data.uen ?? '');
    this.licenseNumber = String(data.licenseNumber ?? data.license_number ?? '');
    this.documentUrl = String(data.documentUrl ?? data.document_url ?? '');
    this.documentFileName = String(data.documentFileName ?? data.document_file_name ?? '');
    this.documentMimeType = String(data.documentMimeType ?? data.document_mime_type ?? '');
    this.status = data.status ?? 'Pending';
    this.rejectionReason = String(data.rejectionReason ?? data.rejection_reason ?? '');
    this.submittedDate = data.submittedDate instanceof Date
      ? data.submittedDate
      : new Date(data.submittedDate ?? data.submitted_date ?? Date.now());
  }

  // Set the default database for all static queries.
  static useDatabase(db) {
    VerificationApp.database = db;
  }

  // For #48 data.
  static createTableIfNeeded(db) {
    db.prepare(`CREATE TABLE IF NOT EXISTS verification_application (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      designer_id INTEGER NOT NULL REFERENCES user_account(id),
      company_name TEXT NOT NULL,
      uen TEXT NOT NULL,
      license_number TEXT NOT NULL,
      document_url TEXT NOT NULL,
      document_file_name TEXT NOT NULL DEFAULT '',
      document_mime_type TEXT NOT NULL DEFAULT '',
      document_data BLOB,
      status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
      rejection_reason TEXT,
      submitted_date TEXT NOT NULL
    )`).run();
    const columns = db.prepare('PRAGMA table_info(verification_application)').all().map((column) => column.name);
    if (!columns.includes('rejection_reason')) {
      db.exec('ALTER TABLE verification_application ADD COLUMN rejection_reason TEXT');
    }
    for (const [name, definition] of [
      ['document_file_name', "TEXT NOT NULL DEFAULT ''"],
      ['document_mime_type', "TEXT NOT NULL DEFAULT ''"],
      ['document_data', 'BLOB']
    ]) {
      if (!columns.includes(name)) db.exec(`ALTER TABLE verification_application ADD COLUMN ${name} ${definition}`);
    }
  }

  // Convert a database row into a VerificationApp instance
  static fromRow(row) {
    return new VerificationApp(VerificationApp.database, {
      appId: row.id,
      designerId: row.designer_id,
      companyName: row.company_name,
      uen: row.uen,
      licenseNumber: row.license_number,
      documentUrl: row.document_url,
      documentFileName: row.document_file_name,
      documentMimeType: row.document_mime_type,
      status: row.status,
      rejectionReason: row.rejection_reason,
      submittedDate: row.submitted_date
    });
  }

  // Record the User Admin's #48 decision; only rejected applications retain a reason.
  setStatus(status, rejectionReason = null) {
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      throw new Error('Invalid verification status');
    }
    this.status = status;
    this.rejectionReason = status === 'Rejected' ? String(rejectionReason ?? '') : '';
    if (this.db && this.appId) {
      VerificationApp.createTableIfNeeded(this.db);
      this.db.prepare(
        'UPDATE verification_application SET status = ?, rejection_reason = ? WHERE id = ?'
      ).run(status, this.rejectionReason || null, this.appId);
    }
    return this;
  }

  // Save a new #48 request, or reuse the latest non-approved request on resubmission.
  // The pending queue and designer status page both read this same application record.
  static submitForDesigner(db, designerId, data) {
    VerificationApp.createTableIfNeeded(db);
    const submittedDate = new Date().toISOString();
    const latest = db.prepare(
      'SELECT id, status FROM verification_application WHERE designer_id = ? ORDER BY submitted_date DESC, id DESC LIMIT 1'
    ).get(designerId);

    if (latest && latest.status !== 'Approved') {
      db.prepare(`UPDATE verification_application
        SET company_name = ?, uen = ?, license_number = ?, document_url = ?,
              document_file_name = ?, document_mime_type = ?, document_data = ?,
              status = 'Pending', rejection_reason = NULL, submitted_date = ?
          WHERE id = ?`).run(
        data.companyName, data.uen, data.licenseNumber, '',
        data.documentFileName, data.documentMimeType, data.documentData, submittedDate, latest.id
      );
      return VerificationApp.findById(latest.id);
    }

    const result = db.prepare(`INSERT INTO verification_application
      (designer_id, company_name, uen, license_number, document_url, status, rejection_reason, submitted_date)
      VALUES (?, ?, ?, ?, ?, 'Pending', NULL, ?)`).run(
      designerId, data.companyName, data.uen, data.licenseNumber, '', submittedDate
    );
    const applicationId = Number(result.lastInsertRowid);
    db.prepare(`UPDATE verification_application
      SET document_file_name = ?, document_mime_type = ?, document_data = ?
      WHERE id = ?`).run(data.documentFileName, data.documentMimeType, data.documentData, applicationId);
    return VerificationApp.findById(applicationId);
  }

  // Fetch the newest verification record for a designer.
  static findLatestByDesigner(designerId) {
    if (!VerificationApp.database) return null;
    VerificationApp.createTableIfNeeded(VerificationApp.database);
    const row = VerificationApp.database.prepare(
      'SELECT * FROM verification_application WHERE designer_id = ? ORDER BY submitted_date DESC, id DESC LIMIT 1'
    ).get(Number(designerId));
    return row ? VerificationApp.fromRow(row) : null;
  }

  // Return a plain object for API responses or UI rendering.
  getDetails() {
    return {
      appId: this.appId,
      designerId: this.designerId,
      companyName: this.companyName,
      uen: this.uen,
      licenseNumber: this.licenseNumber,
      documentUrl: this.documentUrl,
      documentFileName: this.documentFileName,
      documentMimeType: this.documentMimeType,
      status: this.status,
      rejectionReason: this.rejectionReason || null,
      submittedDate: this.submittedDate
    };
  }

  // Supplies the User Admin's #48 review queue, oldest pending request first.
  static findPending() {
    if (!VerificationApp.database) return [];
    VerificationApp.createTableIfNeeded(VerificationApp.database);
    return VerificationApp.database.prepare(
      "SELECT * FROM verification_application WHERE status = 'Pending' ORDER BY submitted_date ASC, id ASC"
    ).all().map(VerificationApp.fromRow);
  }

  // Fetch one application by its ID.
  static findById(appId) {
    if (!VerificationApp.database) return null;
    VerificationApp.createTableIfNeeded(VerificationApp.database);
    const id = Number(appId);
    if (!Number.isInteger(id)) return null;
    const row = VerificationApp.database.prepare('SELECT * FROM verification_application WHERE id = ?').get(id);
    return row ? VerificationApp.fromRow(row) : null;
  }

  // Fetch uploaded document metadata and binary content by application ID.
  static findDocumentById(appId) {
    if (!VerificationApp.database) return null;
    VerificationApp.createTableIfNeeded(VerificationApp.database);
    const id = Number(appId);
    if (!Number.isInteger(id)) return null;
    return VerificationApp.database.prepare(
      'SELECT document_file_name AS fileName, document_mime_type AS mimeType, document_data AS data FROM verification_application WHERE id = ?'
    ).get(id) ?? null;
  }

  // Fetch the latest uploaded document for a designer.
  static findDocumentForDesigner(designerId) {
    if (!VerificationApp.database) return null;
    VerificationApp.createTableIfNeeded(VerificationApp.database);
    const id = Number(designerId);
    if (!Number.isInteger(id)) return null;
    return VerificationApp.database.prepare(
      `SELECT document_file_name AS fileName, document_mime_type AS mimeType, document_data AS data
       FROM verification_application
       WHERE designer_id = ?
       ORDER BY submitted_date DESC, id DESC
       LIMIT 1`
    ).get(id) ?? null;
  }
}

module.exports = VerificationApp;
