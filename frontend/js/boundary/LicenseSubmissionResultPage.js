// BOUNDARY: Confirm the outcome of a designer license submission.
class LicenseSubmissionResultPage {
  init() {
    this.account = Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'Interior Designer') {
      window.location.href = '/dashboard.html';
      return;
    }
    LogoutAction.bind();

    let result;
    try {
      result = JSON.parse(sessionStorage.getItem('licenseSubmissionResult'));
    } catch {
      result = null;
    }

    const success = Boolean(result?.success);
    document.getElementById('resultIcon').textContent = success ? 'Submission successful' : 'Submission unsuccessful';
    document.getElementById('resultIcon').className = `message ${success ? 'success' : 'error'}`;
    document.getElementById('resultTitle').textContent = success
      ? 'License submitted for review'
      : 'License was not submitted';
    document.getElementById('resultMessage').textContent = success
      ? `${result.message || 'Your license was submitted successfully.'} A User Admin will review it before you can interact with customers.`
      : result?.message || 'No submission result was found. Please return to the license page and try again.';
    sessionStorage.removeItem('licenseSubmissionResult');
  }
}
