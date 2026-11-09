class InteractionLog {
  static database = null;
  static allowedTypes = ['view', 'favourite', 'message', 'consultation_request'];
  static idpInteractionTypes = ['favourite', 'message', 'consultation_request'];
  static customerDesignerInteractionTypes = ['message', 'consultation_request'];

  constructor(db, data = {}) {
    this.db = db ?? InteractionLog.database;
    this.logId = Number(data.logId ?? data.id);
    this.customerId = Number(data.customerId ?? data.customer_id);
    this.idpId = Number(data.idpId ?? data.idp_id);
    this.interactionType = String(data.interactionType ?? data.interaction_type ?? '');
    this.timestamp = data.timestamp instanceof Date
      ? data.timestamp
      : new Date(data.timestamp ?? Date.now());
  }

  static useDatabase(db) {
    InteractionLog.database = db;
  }

  static createLog(customerId, idpId, type) {
    if (!InteractionLog.database) throw new Error('InteractionLog database is not configured');
    return InteractionLog.createLogForDatabase(InteractionLog.database, customerId, idpId, type);
  }

  static createLogForDatabase(db, customerId, idpId, type) {
    if (!InteractionLog.allowedTypes.includes(type)) throw new Error('Invalid interaction type');
    const result = db.prepare(`
      INSERT INTO interaction_log (customer_id, idp_id, interaction_type, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `).run(Number(customerId), Number(idpId), type);
    return db.prepare('SELECT * FROM interaction_log WHERE id = ?')
      .get(Number(result.lastInsertRowid));
  }

  static getLogsByIdp(idpId, timeframe = 'all') {
    if (!InteractionLog.database) return [];
    const params = [Number(idpId)];
    let condition = '';
    if (/^\d+d$/.test(String(timeframe))) {
      condition = ` AND timestamp >= datetime('now', ?)`;
      params.push(`-${String(timeframe).slice(0, -1)} days`);
    }
    return InteractionLog.database.prepare(`
      SELECT * FROM interaction_log WHERE idp_id = ?${condition}
      ORDER BY timestamp DESC
    `).all(...params).map((row) => new InteractionLog(InteractionLog.database, {
      logId: row.id,
      customerId: row.customer_id,
      idpId: row.idp_id,
      interactionType: row.interaction_type,
      timestamp: row.timestamp
    }));
  }
}

module.exports = InteractionLog;
