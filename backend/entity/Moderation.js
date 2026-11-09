class Moderation {
  constructor(db) { this.db = db; }

  flag(type, id, reason) {
    this.db.prepare(`INSERT INTO moderation_flag(subject_type,subject_id,reason)
      VALUES(?,?,?) ON CONFLICT(subject_type,subject_id) DO UPDATE SET
      reason=excluded.reason, status=CASE WHEN moderation_flag.status IN ('accepted','removed') THEN 'pending' ELSE moderation_flag.status END,
      created_at=datetime('now')`).run(type, Number(id), reason);
  }

  clearCustomerFlag(customerId) {
    return this.db.prepare(
      "DELETE FROM moderation_flag WHERE subject_type='customer' AND subject_id=?"
    ).run(Number(customerId)).changes > 0;
  }

  clearIDPFlag(idpId) {
    return this.db.prepare(
      "DELETE FROM moderation_flag WHERE subject_type='idp' AND subject_id=?"
    ).run(Number(idpId)).changes > 0;
  }

  markIDPSuspended(idpId) {
    return this.db.prepare(`UPDATE moderation_flag SET status='suspended', reviewed_at=datetime('now')
      WHERE subject_type='idp' AND subject_id=? AND status='pending'`).run(Number(idpId)).changes > 0;
  }

  inspectCustomer(account) {
    if (!account || account.profile !== 'Customer') return;
    const reasons = [];
    if (!account.email) reasons.push('No email address was supplied');
    if (/https?:\/\//i.test(account.username) || /(.)\1{5,}/.test(account.username)) reasons.push('Username contains URL-like or repeated-character patterns');
    if (account.email) {
      const count = this.db.prepare(`SELECT COUNT(*) AS n FROM user_account WHERE lower(email)=lower(?)`).get(account.email).n;
      if (count > 1) reasons.push('Email address is shared by multiple accounts');
    }
    if (reasons.length) this.flag('customer', account.id, reasons.join('; '));
  }

  inspectIDP(idp) {
    if (!idp) return;
    const reasons = [];
    const content = `${idp.title} ${idp.description}`;
    if (/https?:\/\/|www\./i.test(content)) reasons.push('Contains an external URL');
    if (/(whatsapp|telegram|crypto|wire transfer|send payment|guaranteed returns)/i.test(content)) reasons.push('Contains solicitation or payment-related language');
    if (content.length > 12000) reasons.push('Unusually long listing content');
    const duplicate = this.db.prepare(`SELECT id FROM idp WHERE designer_id=? AND id<>?
      AND lower(trim(title))=lower(trim(?)) LIMIT 1`).get(idp.designerId, idp.id, idp.title);
    if (duplicate) reasons.push('Duplicates another listing title from this designer');
    if (reasons.length) this.flag('idp', idp.id, reasons.join('; '));
  }

  list() {
    return this.db.prepare(`SELECT f.*, CASE WHEN f.subject_type='customer' THEN a.username ELSE i.title END AS subject_name,
      CASE WHEN f.subject_type='customer' THEN a.email ELSE d.username END AS detail,
      CASE WHEN f.subject_type='customer' THEN a.is_active ELSE NOT i.is_suspended END AS is_active,
      CASE WHEN f.subject_type='customer' THEN a.id ELSE i.designer_id END AS designer_id
      FROM moderation_flag f
      LEFT JOIN user_account a ON f.subject_type='customer' AND a.id=f.subject_id
      LEFT JOIN idp i ON f.subject_type='idp' AND i.id=f.subject_id
      LEFT JOIN user_account d ON d.id=i.designer_id
      ORDER BY CASE f.status WHEN 'pending' THEN 0 ELSE 1 END, f.created_at DESC`).all();
  }

  review(flagId, action) {
    const flag = this.db.prepare('SELECT * FROM moderation_flag WHERE id=?').get(Number(flagId));
    if (!flag) return { success:false, message:'Flag not found' };
    if (!['accept','suspend','remove'].includes(action)) return { success:false, message:'Invalid moderation action' };
    if (action === 'accept') {
      this.db.prepare("UPDATE moderation_flag SET status='accepted', reviewed_at=datetime('now') WHERE id=?").run(flag.id);
      return { success:true, message:'Flag accepted; item remains active' };
    }
    if (flag.subject_type === 'customer') {
      if (action === 'suspend' || action === 'remove') {
        this.db.prepare('UPDATE user_account SET is_active=0 WHERE id=?').run(flag.subject_id);
      }
    } else {
      if (action === 'suspend') this.db.prepare('UPDATE idp SET is_suspended=1 WHERE id=?').run(flag.subject_id);
      if (action === 'remove') {
        this.db.prepare('UPDATE contact_request SET idp_id=NULL WHERE idp_id=?').run(flag.subject_id);
        this.db.prepare('DELETE FROM idp WHERE id=?').run(flag.subject_id);
      }
    }
    this.db.prepare(`UPDATE moderation_flag SET status=?, reviewed_at=datetime('now') WHERE id=?`)
      .run(action === 'remove' ? 'removed' : 'suspended', flag.id);
    return { success:true, message: action === 'remove' ? 'Flagged item removed from the platform' : 'Flagged item suspended' };
  }

  suspendDesigner(designerId) {
    const result = this.db.prepare(`UPDATE user_account SET is_active=0
      WHERE id=? AND profile_id=(SELECT id FROM user_profile WHERE name='Interior Designer')`).run(Number(designerId));
    if (!result.changes) return { success:false, message:'Interior Designer account not found' };
    this.db.prepare('UPDATE idp SET is_suspended=1 WHERE designer_id=?').run(Number(designerId));
    this.db.prepare(`UPDATE moderation_flag SET status='suspended', reviewed_at=datetime('now')
      WHERE subject_type='idp' AND subject_id IN (SELECT id FROM idp WHERE designer_id=?) AND status='pending'`).run(Number(designerId));
    return { success:true, message:'Designer account and all of their IDPs have been suspended' };
  }
}
module.exports = Moderation;
