// BOUNDARY: Interior Designer license submission and verification status.
class DesignerLicenseSubmissionPage {
  async init() {
    this.account = Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'Interior Designer') {
      window.location.href = '/dashboard.html';
      return;
    }
    LogoutAction.bind();
    this.form = document.getElementById('licenseForm');
    this.message = document.getElementById('message');
    this.form.addEventListener('submit', (event) => this.submit(event));
    document.getElementById('resubmitLicense').addEventListener('click', () => this.startResubmission());
    await this.loadStatus();
  }

  async loadStatus() {
    const result = await Api.get('/api/designer/verification');
    if (!result.success) return this.showMessage(result.message || 'Unable to load verification status', 'error');
    const labels = {
      'Unverified': 'Unverified — submit your license details for review.',
      'Pending Review': 'Pending Review — your application is awaiting an admin decision.',
      'Verified': 'Verified — you can publish IDPs and interact with customers.',
      'Rejected': 'Rejected — update your details and resubmit for review.'
    };
    document.getElementById('verificationStatus').textContent = labels[result.status] ?? result.status;
    const application = result.application;
    if (application) {
      document.getElementById('companyName').value = application.companyName;
      document.getElementById('uen').value = application.uen;
      document.getElementById('licenseNumber').value = application.licenseNumber;
      document.getElementById('previousDocument').textContent = application.documentFileName
        ? `Previously submitted: ${application.documentFileName}`
        : '';
      this.showSubmittedLicense(application, result.status);
    } else {
      document.getElementById('submittedLicense').classList.add('hidden');
      this.form.classList.remove('hidden');
      document.getElementById('verificationStatus').className = 'message license-status status-unverified';
    }
    const rejection = application?.rejectionReason;
    const rejectionBox = document.getElementById('rejectionReason');
    rejectionBox.textContent = '';
    rejectionBox.classList.add('hidden');
    if (result.status === 'Rejected' && rejection) {
      rejectionBox.textContent = `Admin's reason: ${rejection}`;
      rejectionBox.classList.remove('hidden');
    }
    document.getElementById('verificationStatus').className =
      `message license-status status-${result.status.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  }

  showSubmittedLicense(application, status) {
    const submittedLicense = document.getElementById('submittedLicense');
    submittedLicense.classList.remove('hidden');
    submittedLicense.dataset.status = status;
    document.getElementById('submittedCompany').textContent = application.companyName;
    document.getElementById('submittedUen').textContent = application.uen;
    document.getElementById('submittedLicenseNumber').textContent = application.licenseNumber;
    const documentName = document.getElementById('submittedDocument');
    documentName.replaceChildren();
    if (application.documentFileName) {
      const viewButton = document.createElement('button');
      viewButton.type = 'button';
      viewButton.className = 'link-button';
      viewButton.textContent = application.documentFileName;
      viewButton.addEventListener('click', () => this.openSubmittedDocument());
      documentName.append(viewButton);
    } else {
      documentName.textContent = 'Document submitted';
    }
    this.form.classList.add('hidden');
    const resubmitButton = document.getElementById('resubmitLicense');
    resubmitButton.classList.toggle('hidden', status === 'Verified');
  }

  startResubmission() {
    document.getElementById('submittedLicense').classList.add('hidden');
    document.getElementById('resubmitLicense').classList.add('hidden');
    this.form.classList.remove('hidden');
    document.getElementById('licenseDocument').value = '';
    this.showMessage('Update the details below, choose your license file, then submit again.', 'success');
    document.getElementById('companyName').focus();
  }

  async openSubmittedDocument() {
    const account = Auth.get();
    const response = await fetch('/api/designer/verification/document', {
      headers: account ? { 'X-User-Id': account.id } : {}
    });
    if (!response.ok) {
      return this.showMessage('The submitted license file could not be opened.', 'error');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async submit(event) {
    event.preventDefault();
    const fileInput = document.getElementById('licenseDocument');
    const file = fileInput.files[0];
    if (!file) return this.showMessage('Please select a PDF or DOCX license document.', 'error');
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['pdf', 'docx'].includes(extension)) {
      return this.showMessage('License document must be a PDF or DOCX file.', 'error');
    }
    if (file.size > 8 * 1024 * 1024) {
      return this.showMessage('License document must be 8 MB or smaller.', 'error');
    }
    const headers = {
      'Content-Type': 'application/octet-stream',
      'X-Company-Name': encodeURIComponent(document.getElementById('companyName').value.trim()),
      'X-UEN': encodeURIComponent(document.getElementById('uen').value.trim()),
      'X-License-Number': encodeURIComponent(document.getElementById('licenseNumber').value.trim()),
      'X-File-Name': encodeURIComponent(file.name),
      'X-Mime-Type': file.type || (extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    };
    const account = Auth.get();
    if (account) headers['X-User-Id'] = account.id;
    const submitButton = this.form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const response = await fetch('/api/designer/verification/submit', {
        method: 'POST',
        headers,
        body: await file.arrayBuffer()
      });
      const result = await response.json().catch(() => ({ success: false, message: 'Unable to submit license' }));
      sessionStorage.setItem('licenseSubmissionResult', JSON.stringify({
        success: Boolean(result.success),
        message: result.message || (result.success
          ? 'Your license was submitted successfully.'
          : 'Your license could not be submitted.')
      }));
      window.location.href = '/designer-license-result.html';
    } catch {
      sessionStorage.setItem('licenseSubmissionResult', JSON.stringify({
        success: false,
        message: 'Unable to submit the license because the server could not be reached.'
      }));
      window.location.href = '/designer-license-result.html';
    }
  }

  showMessage(text, type) {
    this.message.className = `message ${type}`;
    this.message.textContent = text;
  }
}
