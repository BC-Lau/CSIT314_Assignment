class ManageUserAccountsController {
  constructor(userAccount) {
    this.userAccount = userAccount;
  }

  requireUserAdmin(user) {
    if (!user || user.profile !== 'User Admin') {
      return { success: false, message: 'Only user admins can manage accounts' };
    }
    return null;
  }

  createAccount(user, accountData = {}) {
    const denied = this.requireUserAdmin(user);
    if (denied) return denied;
    const username = String(accountData.username ?? '').trim();
    const password = String(accountData.password ?? '');
    const email = typeof accountData.email === 'string' ? accountData.email.trim() : null;
    const profileId = Number(accountData.profileId);
    if (!username || !password || !Number.isInteger(profileId)) {
      return { success: false, message: 'Username, password, and profileId are required' };
    }
    try {
      const id = Number(this.userAccount.createUserAccount({ username, password, email, profileId }));
      return { success: true, account: this.userAccount.findByIdIncludingInactive(id) };
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) {
        return { success: false, message: 'Username already exists' };
      }
      return { success: false, message: 'Unable to create account' };
    }
  }

  viewAccounts(user) {
    const denied = this.requireUserAdmin(user);
    return denied || { success: true, accounts: this.userAccount.getAllAccounts() };
  }

  updateAccount(user, userId, accountData = {}) {
    const denied = this.requireUserAdmin(user);
    if (denied) return denied;
    const updated = this.userAccount.updateAccount(userId, accountData);
    return updated
      ? { success: true, account: updated }
      : { success: false, message: 'User account not found' };
  }

  suspendAccount(user, userId) {
    const denied = this.requireUserAdmin(user);
    if (denied) return denied;
    if (Number(user.id) === Number(userId)) {
      return { success: false, message: 'You cannot suspend your own account' };
    }
    return this.userAccount.suspend(userId)
      ? { success: true, message: 'Account suspended successfully' }
      : { success: false, message: 'User account not found' };
  }

  reactivateAccount(user, userId) {
    const denied = this.requireUserAdmin(user);
    if (denied) return denied;
    return this.userAccount.reactivate(userId)
      ? { success: true, message: 'Account reactivated successfully' }
      : { success: false, message: 'User account not found' };
  }

  resetPassword(user, userId, password) {
    const denied = this.requireUserAdmin(user);
    if (denied) return denied;
    if (typeof password !== 'string' || password.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters' };
    }
    return this.userAccount.resetPassword(userId, password)
      ? { success: true, message: 'Password reset successfully' }
      : { success: false, message: 'User account not found' };
  }

  lockAccount(user, userId) {
    const denied = this.requireUserAdmin(user);
    if (denied) return denied;
    if (Number(user.id) === Number(userId)) {
      return { success: false, message: 'You cannot lock your own account' };
    }
    return this.userAccount.lock(userId)
      ? { success: true, message: 'Account locked successfully' }
      : { success: false, message: 'User account not found' };
  }

  unlockAccount(user, userId) {
    const denied = this.requireUserAdmin(user);
    if (denied) return denied;
    return this.userAccount.unlock(userId)
      ? { success: true, message: 'Account unlocked successfully' }
      : { success: false, message: 'User account not found' };
  }

  recordSecurityIncident(user, userId) {
    const denied = this.requireUserAdmin(user);
    if (denied) return denied;
    return this.userAccount.recordSecurityIncident(userId)
      ? { success: true, message: 'Security incident recorded' }
      : { success: false, message: 'User account not found' };
  }
}

module.exports = ManageUserAccountsController;
