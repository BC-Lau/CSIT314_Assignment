// BOUNDARY: User Admin license-verification queue.
class AdminLicensePage {
  async init() {
    this.account = Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'User Admin') {
      window.location.href = '/dashboard.html';
      return;
    }
    LogoutAction.bind();
    this.rows = document.getElementById('applicationList');
    this.message = document.getElementById('message');
    this.modal = document.getElementById('rejectModal');
    document.getElementById('rejectForm').addEventListener('submit', (event) => this.submitRejection(event));
    document.getElementById('cancelReject').addEventListener('click', () => this.closeRejectModal());
    await this.loadApplications();
  }

  async loadApplications() {
    const result = await Api.get('/api/admin/verifications/pending');
    if (!result.success) return this.showMessage(result.message || 'Unable to load applications', 'error');
    const applications = result.applications ?? [];
    if (applications.length === 0) {
      this.rows.replaceChildren(el('p', { className: 'muted', textContent: 'There are no pending license applications.' }));
      return;
    }
    this.rows.replaceChildren(...applications.map((application) => this.applicationCard(application)));
  }

  applicationCard(application) {
    const documentLink = el('button', {
      className: 'btn secondary',
      type: 'button',
      textContent: application.documentFileName || 'View submitted document'
    });
    documentLink.addEventListener('click', () => this.openDocument(application.appId));
    const details = el('dl', { className: 'idp-details' },
      el('dt', { textContent: 'Designer account ID' }), el('dd', { textContent: application.designerId }),
      el('dt', { textContent: 'Company' }), el('dd', { textContent: application.companyName }),
      el('dt', { textContent: 'UEN' }), el('dd', { textContent: application.uen }),
      el('dt', { textContent: 'License number' }), el('dd', { textContent: application.licenseNumber }),
      el('dt', { textContent: 'Document' }), el('dd', null, documentLink),
      el('dt', { textContent: 'Submitted' }), el('dd', { textContent: new Date(application.submittedDate).toLocaleString() })
    );
    const card = el('article', { className: 'card verification-card' },
      el('h2', { textContent: application.companyName }),
      details
    );
    const actions = el('div', { className: 'form-actions' });
    const approveButton = el('button', { className: 'btn', type: 'button', textContent: 'Approve' });
    approveButton.addEventListener('click', () => this.approve(application.appId, approveButton));
    const rejectButton = el('button', { className: 'btn secondary', type: 'button', textContent: 'Reject' });
    rejectButton.addEventListener('click', () => this.openRejectModal(application));
    actions.append(approveButton, rejectButton);
    card.append(actions);
    return card;
  }

  async approve(appId, button) {
    button.disabled = true;
    const result = await Api.post(`/api/admin/verifications/${appId}/approve`);
    if (!result.success) {
      button.disabled = false;
      return this.showMessage(result.message || 'Unable to approve license', 'error');
    }
    this.showMessage(result.message, 'success');
    await this.loadApplications();
  }

  openRejectModal(application) {
    this.rejectAppId = application.appId;
    document.getElementById('rejectReason').value = '';
    document.getElementById('rejectFormMessage').textContent = '';
    this.modal.classList.remove('hidden');
    document.getElementById('rejectReason').focus();
  }

  closeRejectModal() {
    this.modal.classList.add('hidden');
    this.rejectAppId = null;
  }

  async submitRejection(event) {
    event.preventDefault();
    const reason = document.getElementById('rejectReason').value.trim();
    if (!reason) {
      document.getElementById('rejectFormMessage').textContent = 'A rejection reason is required.';
      return;
    }
    const result = await Api.post(`/api/admin/verifications/${this.rejectAppId}/reject`, { reason });
    if (!result.success) {
      document.getElementById('rejectFormMessage').textContent = result.message || 'Unable to reject license';
      return;
    }
    this.closeRejectModal();
    this.showMessage(result.message, 'success');
    await this.loadApplications();
  }

  async openDocument(appId) {
    const account = Auth.get();
    const response = await fetch(`/api/admin/verifications/${appId}/document`, {
      headers: account ? { 'X-User-Id': account.id } : {}
    });
    if (!response.ok) {
      this.showMessage('License document could not be opened.', 'error');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  showMessage(text, type) {
    this.message.className = `message ${type}`;
    this.message.textContent = text;
  }
}
