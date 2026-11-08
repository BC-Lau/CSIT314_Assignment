// BOUNDARY: User Admin account-management page.
// Presentational logic delegates account operations to the backend admin API.
class UserAccountsPage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'User Admin') {
      window.location.href = '/dashboard.html';
      return;
    }
    LogoutAction.bind();

    this.rows = document.getElementById('accountRows');
    this.message = document.getElementById('message');
    this.accountModal = document.getElementById('accountModal');
    this.passwordModal = document.getElementById('passwordModal');
    this.loadProfiles();
    this.bindEvents();
    await this.loadAccounts();
  }

  loadProfiles() {
    const select = document.getElementById('accountProfile');
    for (const profile of ['User Admin', 'Interior Designer', 'Customer', 'Platform Manager']) {
      select.append(el('option', { value: String(this.profileId(profile)), textContent: profile }));
    }
  }

  profileId(profile) {
    return { 'User Admin': 1, 'Interior Designer': 2, 'Customer': 3, 'Platform Manager': 4 }[profile];
  }

  bindEvents() {
    document.getElementById('createAccountBtn').addEventListener('click', () => this.openCreate());
    document.getElementById('closeAccountModal').addEventListener('click', () => this.closeAccountModal());
    document.getElementById('cancelAccountForm').addEventListener('click', () => this.closeAccountModal());
    document.getElementById('accountForm').addEventListener('submit', (event) => this.saveAccount(event));
    document.getElementById('cancelPasswordForm').addEventListener('click', () => this.closePasswordModal());
    document.getElementById('passwordForm').addEventListener('submit', (event) => this.resetPassword(event));
    document.getElementById('searchAccountsBtn').addEventListener('click', () => this.renderAccounts());
    document.getElementById('accountSearch').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.renderAccounts();
    });
    document.getElementById('statusFilter').addEventListener('change', () => this.renderAccounts());
  }

  async loadAccounts() {
    const result = await Api.get('/api/admin/accounts');
    if (!result.success) return this.showMessage(result.message || 'Unable to load accounts', 'error');
    this.accounts = result.accounts ?? [];
    this.renderAccounts();
  }

  renderAccounts() {
    const query = document.getElementById('accountSearch').value.trim().toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const filtered = this.accounts.filter((account) => {
      const matchesQuery = `${account.username} ${account.email ?? ''}`.toLowerCase().includes(query);
      const matchesStatus = status === 'all'
        || (status === 'active' && account.is_active && !account.is_locked)
        || (status === 'suspended' && !account.is_active)
        || (status === 'locked' && account.is_locked);
      return matchesQuery && matchesStatus;
    });

    if (filtered.length === 0) {
      const emptyRow = el('tr');
      emptyRow.append(el('td', { colSpan: 6, className: 'muted', textContent: 'No user accounts match this view.' }));
      this.rows.replaceChildren(emptyRow);
      return;
    }
    this.rows.replaceChildren(...filtered.map((account) => this.accountRow(account)));
  }

  accountRow(account) {
    const status = !account.is_active ? 'Suspended' : account.is_locked ? 'Locked' : 'Active';
    const isCurrentAccount = Number(account.id) === Number(this.account.id);
    const row = el('tr', { className: isCurrentAccount ? 'current-admin-row' : '' });
    const usernameCell = el('td');
    usernameCell.append(el('strong', { textContent: account.username }));
    if (isCurrentAccount) {
      usernameCell.append(el('span', { className: 'current-admin-label', textContent: 'Your account' }));
    }
    row.append(
      el('td', { textContent: account.id }),
      usernameCell,
      el('td', { textContent: account.email ?? '—' }),
      el('td', { textContent: account.profile }),
      el('td', null, el('span', { className: `account-status ${status.toLowerCase()}`, textContent: status }))
    );

    const actions = el('td', { className: 'account-actions' });
    actions.append(this.actionButton('Edit', () => this.openEdit(account)));
    actions.append(this.actionButton('Reset password', () => this.openPassword(account)));
    if (!isCurrentAccount) {
      actions.append(this.actionButton(account.is_active ? 'Suspend' : 'Reactivate', () => this.toggleSuspension(account)));
      actions.append(this.actionButton(account.is_locked ? 'Unlock' : 'Lock', () => this.toggleLock(account)));
    } else {
      const protectedLabel = el('span', { className: 'muted own-account-protected', textContent: 'Suspend and lock unavailable' });
      actions.append(protectedLabel);
    }
    row.append(actions);
    return row;
  }

  actionButton(text, handler) {
    const button = el('button', { className: 'btn secondary account-action', type: 'button', textContent: text });
    button.addEventListener('click', handler);
    return button;
  }

  openCreate() {
    document.getElementById('accountModalTitle').textContent = 'Create account';
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    document.getElementById('passwordField').classList.remove('hidden');
    document.getElementById('accountPassword').required = true;
    document.getElementById('saveAccountBtn').textContent = 'Create account';
    this.accountModal.classList.remove('hidden');
  }

  openEdit(account) {
    document.getElementById('accountModalTitle').textContent = 'Update account';
    document.getElementById('accountId').value = account.id;
    document.getElementById('accountUsername').value = account.username;
    document.getElementById('accountEmail').value = account.email ?? '';
    document.getElementById('accountProfile').value = String(account.profile_id);
    document.getElementById('passwordField').classList.add('hidden');
    document.getElementById('accountPassword').required = false;
    document.getElementById('saveAccountBtn').textContent = 'Save changes';
    this.accountModal.classList.remove('hidden');
  }

  closeAccountModal() { this.accountModal.classList.add('hidden'); }
  closePasswordModal() { this.passwordModal.classList.add('hidden'); }

  async saveAccount(event) {
    event.preventDefault();
    const id = document.getElementById('accountId').value;
    const body = {
      username: document.getElementById('accountUsername').value,
      email: document.getElementById('accountEmail').value,
      profileId: document.getElementById('accountProfile').value
    };
    if (!id) body.password = document.getElementById('accountPassword').value;
    const result = await (id
      ? Api.request('PUT', `/api/admin/accounts/${id}`, body)
      : Api.post('/api/admin/accounts', body));
    if (!result.success) return this.formMessage('accountFormMessage', result.message || 'Unable to save account', 'error');
    this.closeAccountModal();
    this.showMessage(result.message || 'Account saved successfully', 'success');
    await this.loadAccounts();
  }

  openPassword(account) {
    document.getElementById('passwordUserId').value = account.id;
    document.getElementById('newPassword').value = '';
    document.getElementById('passwordModalTitle').textContent = `Reset password: ${account.username}`;
    this.passwordModal.classList.remove('hidden');
  }

  async resetPassword(event) {
    event.preventDefault();
    const userId = document.getElementById('passwordUserId').value;
    const password = document.getElementById('newPassword').value;
    const result = await Api.post(`/api/admin/accounts/${userId}/reset-password`, { password });
    if (!result.success) return this.formMessage('passwordFormMessage', result.message || 'Unable to reset password', 'error');
    this.closePasswordModal();
    this.showMessage(result.message || 'Password reset successfully', 'success');
  }

  async toggleSuspension(account) {
    const action = account.is_active ? 'suspend' : 'reactivate';
    const result = await Api.post(`/api/admin/accounts/${account.id}/${action}`);
    if (!result.success) return this.showMessage(result.message || 'Unable to update account', 'error');
    this.showMessage(result.message, 'success');
    await this.loadAccounts();
  }

  async toggleLock(account) {
    const action = account.is_locked ? 'unlock' : 'lock';
    const result = await Api.post(`/api/admin/accounts/${account.id}/${action}`);
    if (!result.success) return this.showMessage(result.message || 'Unable to update account', 'error');
    this.showMessage(result.message, 'success');
    await this.loadAccounts();
  }

  formMessage(id, text, type) {
    const message = document.getElementById(id);
    message.className = `message ${type}`;
    message.textContent = text;
  }

  showMessage(text, type) {
    this.message.className = `message ${type}`;
    this.message.textContent = text;
  }
}
