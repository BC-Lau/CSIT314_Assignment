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

  /** Returns the active user as the subclass for their profile (e.g. InteriorDesigner), or null. */
  findById(userId) {
    if (!userId) return null;
    const row = this.db
      .prepare(
        `SELECT a.id, a.username, a.email, p.name AS profile
           FROM user_account a JOIN user_profile p ON p.id = a.profile_id
          WHERE a.id = ? AND a.is_active = 1`
      )
      .get(Number(userId));
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
    if (!verifyPassword(password, row.password_hash)) return null;
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      profile: row.profile_name,
    };
  }

  // Permissions: not allowed by default, subclasses override what their profile may do.
  canCreateIDP() {
    return false;
  }

  canViewRecommendations() {
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
}

class InteriorDesigner extends UserAccount {
  canCreateIDP() {
    return true;
  }

  canViewMyIDPs() {
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
