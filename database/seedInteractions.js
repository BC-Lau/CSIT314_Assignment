function seedInteractionLogs(db) {
  db.prepare(`
    INSERT INTO interaction_log (customer_id, idp_id, interaction_type, timestamp)
    SELECT f.user_id, f.idp_id, 'view', datetime(f.saved_at, '-1 second')
      FROM favourite f
      JOIN idp i ON i.id = f.idp_id
     WHERE i.visibility = 'public'
  `).run();
  db.prepare(`
    INSERT INTO interaction_log (customer_id, idp_id, interaction_type, timestamp)
    SELECT f.user_id, f.idp_id, 'favourite', f.saved_at
      FROM favourite f
      JOIN idp i ON i.id = f.idp_id
     WHERE i.visibility = 'public'
  `).run();
  db.prepare(`
    INSERT INTO interaction_log (customer_id, idp_id, interaction_type, timestamp)
    SELECT c.customer_id, c.idp_id, 'view', datetime(c.created_at, '-1 second')
      FROM contact_request c
      JOIN idp i ON i.id = c.idp_id
     WHERE i.visibility = 'public'
  `).run();
  db.prepare(`
    INSERT INTO interaction_log (customer_id, idp_id, interaction_type, timestamp)
    SELECT c.customer_id, c.idp_id, 'message', c.created_at
      FROM contact_request c
      JOIN idp i ON i.id = c.idp_id
     WHERE i.visibility = 'public'
  `).run();
}

module.exports = { seedInteractionLogs };
