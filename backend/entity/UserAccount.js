// ENTITY: holds user account data and talks to the database.
// Each profile is a subclass; permissions are methods the subclass overrides.
const { hashPassword, verifyPassword } = require('../utils/password');

class UserAccount {
  constructor(db, data = {}) {
    this.db = db;
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.profile = data.profile;
    this.isVerified = Boolean(data.is_verified ?? data.isVerified);
    this.hasVerifiedBadge = Boolean(data.has_verified_badge ?? data.hasVerifiedBadge);
    this.isActive = data.is_active == null ? true : Boolean(data.is_active);
    this.isLocked = Boolean(data.is_locked ?? data.isLocked);
    this.securityIncidentCount = Number(data.security_incident_count ?? data.securityIncidentCount ?? 0);
  }

  createUserAccount({ username, password, email, profileId }) {
    const result = this.db
      .prepare(
        'INSERT INTO user_account (username, password_hash, email, profile_id) VALUES (?, ?, ?, ?)'
      )
      .run(username, hashPassword(password), email ?? null, profileId);
    return Number(result.lastInsertRowid);
  }

  findByUsername(username) {
    return this.db
      .prepare(
        `SELECT a.*, p.name AS profile_name
           FROM user_account a JOIN user_profile p ON p.id = a.profile_id
          WHERE a.username = ?`
      )
      .get(username);
  }

  getAllAccounts() {
    return this.db.prepare(`
      SELECT a.id, a.username, a.email, a.profile_id, a.is_active, a.is_locked,
             a.security_incident_count, a.is_verified, a.has_verified_badge,
             p.name AS profile
      FROM user_account a JOIN user_profile p ON p.id = a.profile_id
      ORDER BY a.id ASC
    `).all();
  }

  /** Returns the active user as the subclass for their profile (e.g. InteriorDesigner), or null. */
  findById(userId) {
    if (!userId) return null;
    const row = this.db
      .prepare(
        `SELECT a.id, a.username, a.email, a.is_verified, a.has_verified_badge, p.name AS profile
           FROM user_account a JOIN user_profile p ON p.id = a.profile_id
          WHERE a.id = ? AND a.is_active = 1`
      )
      .get(Number(userId));
    if (!row) return null;
    const UserClass = PROFILE_CLASSES[row.profile] ?? UserAccount;
    return new UserClass(this.db, row);
  }

  findByIdIncludingInactive(userId) {
    const id = Number(userId);
    if (!Number.isInteger(id)) return null;
    const row = this.db.prepare(`
      SELECT a.*, p.name AS profile
      FROM user_account a JOIN user_profile p ON p.id = a.profile_id
      WHERE a.id = ?
    `).get(id);
    if (!row) return null;
    const UserClass = PROFILE_CLASSES[row.profile] ?? UserAccount;
    return new UserClass(this.db, row);
  }

  /**
   * Returns the logged-in account (without password) or null.
   */
  login(username, password) {
    const row = this.findByUsername(username);
    if (!row || !row.is_active) return null;
    if (row.is_locked) return null;
    if (!verifyPassword(password, row.password_hash)) return null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      profile: row.profile_name,
    };
  }

  setVerifiedStatus(isVerified) {
    const verified = Boolean(isVerified);
    this.isVerified = verified;
    if (this.db && this.id) {
      this.db.prepare('UPDATE user_account SET is_verified = ? WHERE id = ?').run(verified ? 1 : 0, this.id);
    }
    return verified;
  }

  setVerifiedBadge(hasBadge) {
    const badge = Boolean(hasBadge);
    this.hasVerifiedBadge = badge;
    if (this.db && this.id) {
      this.db.prepare('UPDATE user_account SET has_verified_badge = ? WHERE id = ?').run(badge ? 1 : 0, this.id);
    }
    return badge;
  }

  updateAccount(userId, { username, email, profileId }) {
    const account = this.findByIdIncludingInactive(userId);
    if (!account) return null;
    if (typeof username === 'string' && username.trim()) account.username = username.trim();
    if (email !== undefined) account.email = email?.trim() || null;
    this.db.prepare(`
      UPDATE user_account SET username = ?, email = ?, profile_id = COALESCE(?, profile_id)
      WHERE id = ?
    `).run(account.username, account.email, profileId == null ? null : Number(profileId), account.id);
    return this.findByIdIncludingInactive(account.id);
  }

  resetPassword(userId, password) {
    const account = this.findByIdIncludingInactive(userId);
    if (!account) return false;
    this.db.prepare('UPDATE user_account SET password_hash = ? WHERE id = ?').run(hashPassword(password), account.id);
    return true;
  }

  suspend(userId) {
    const result = this.db.prepare('UPDATE user_account SET is_active = 0 WHERE id = ?').run(Number(userId));
    return result.changes > 0;
  }

  reactivate(userId) {
    const result = this.db.prepare('UPDATE user_account SET is_active = 1 WHERE id = ?').run(Number(userId));
    return result.changes > 0;
  }

  lock(userId) {
    const result = this.db.prepare('UPDATE user_account SET is_locked = 1 WHERE id = ?').run(Number(userId));
    return result.changes > 0;
  }

  unlock(userId) {
    const result = this.db.prepare('UPDATE user_account SET is_locked = 0, security_incident_count = 0 WHERE id = ?').run(Number(userId));
    return result.changes > 0;
  }

  recordSecurityIncident(userId) {
    const result = this.db.prepare(`
      UPDATE user_account
      SET security_incident_count = security_incident_count + 1,
          is_locked = CASE WHEN security_incident_count + 1 >= 5 THEN 1 ELSE is_locked END
      WHERE id = ?
    `).run(Number(userId));
    return result.changes > 0;
  }

  // Permissions: not allowed by default, subclasses override what their profile may do.
  canCreateIDP() {
    return false;
  }

  canViewRecommendations() {
    return false;
  }

  canUploadIDPMedia() {
    return false;
  }

  canViewMyIDPs() {
    return false;
  }

  canDeleteIDP() {
    return false;
  }

  canViewMetrics() {
    return false;
  }

  canSaveFavourite() {
    return false;
  }

  canViewFavourites() {
    return false;
  }
}

class InteriorDesigner extends UserAccount {
  canCreateIDP() {
    return true;
  }

  canViewMyIDPs() {
    return true;
  }
  canUploadIDPMedia() {
    return true;
  }

  canDeleteIDP() {
    return true;
  }
}

class Customer extends UserAccount {
  canViewRecommendations() {
    return true;
  }

  canSaveFavourite() {
    return true;
  }

  canViewFavourites() {
    return true;
  }
}

class PlatformManager extends UserAccount {
  canViewMetrics() {
    return true;
  }
}

class UserAdmin extends UserAccount {}

const PROFILE_CLASSES = {
  'Interior Designer': InteriorDesigner,
  'Customer': Customer,
  'Platform Manager': PlatformManager,
  'User Admin': UserAdmin,
};

module.exports = Object.assign(UserAccount, { InteriorDesigner, Customer, PlatformManager, UserAdmin });
