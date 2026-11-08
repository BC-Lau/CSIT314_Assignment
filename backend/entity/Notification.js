class Notification {
  static database = null;
  static nextNotificationId = 1;

  constructor(db, data = {}) {
    this.db = db ?? Notification.database;
    this.notificationId = Number(data.notificationId ?? data.id ?? 0);
    this.recipientId = Number(data.recipientId ?? data.recipient_id);
    this.subject = String(data.subject ?? '');
    this.message = String(data.message ?? data.body ?? '');
    this.timestamp = data.timestamp instanceof Date
      ? data.timestamp
      : new Date(data.timestamp ?? Date.now());
  }

  static useDatabase(db) {
    Notification.database = db;
  }

  static createTableIfNeeded(db) {
    db.prepare(`CREATE TABLE IF NOT EXISTS notification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_id INTEGER NOT NULL REFERENCES user_account(id),
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL
    )`).run();
  }

  sendNotification() {
    if (!Number.isInteger(this.recipientId) || !this.subject || !this.message) {
      return false;
    }
    if (this.db) {
      Notification.createTableIfNeeded(this.db);
      const result = this.db.prepare(
        'INSERT INTO notification (recipient_id, subject, message, timestamp) VALUES (?, ?, ?, ?)'
      ).run(this.recipientId, this.subject, this.message, this.timestamp.toISOString());
      this.notificationId = Number(result.lastInsertRowid);
    } else {
      if (!Number.isInteger(this.notificationId) || this.notificationId <= 0) {
        this.notificationId = Notification.nextNotificationId++;
      }
    }
    return true;
  }
}

module.exports = Notification;
