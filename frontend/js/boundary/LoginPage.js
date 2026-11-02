// BOUNDARY: the login page the user interacts with. (#11)
class LoginPage {
  async init() {
    const account = await Nav.render();
    if (account) return this.redirectToDashboard(account.profile);
    this.form = document.getElementById('loginForm');
    this.message = document.getElementById('message');
    if (new URLSearchParams(location.search).has('loggedOut')) {
      this.show('success', 'You have logged out.');
    }
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.onSubmit();
    });
  }

  async onSubmit() {
    const data = new FormData(this.form);
    const result = await Api.post('/api/auth/login', {
      username: data.get('username'),
      password: data.get('password'),
    });
    if (result.success) {
      Auth.save(result.account);
      this.displaySuccess(result.account);
      this.redirectToDashboard(result.account.profile);
    } else {
      this.displayError(result.message);
    }
  }

  displaySuccess(account) {
    this.show('success', `Welcome, ${account.username} (${account.profile})`);
  }

  displayError(message) {
    this.show('error', message || 'Login failed');
  }

  redirectToDashboard(profile) {
    window.location.href = '/dashboard.html';
  }

  show(type, text) {
    this.message.className = `message ${type}`;
    this.message.textContent = text;
  }
}
