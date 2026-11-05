// BOUNDARY: My IDPs page (Interior Designers) - list of the designer's own IDPs.
// Calls /api/idps/mine
class MyIDPsPage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    LogoutAction.bind();
    await this.openMyIDPs();
  }

  async openMyIDPs() {
    const result = await Api.get('/api/idps/mine');
    if (!result.success) return this.displayMessage(result.message ?? 'Could not load your IDPs');
    if (result.idps.length === 0) return this.displayMessage('You have no IDPs yet.');
    this.displayIDPs(result.idps);
  }

  displayIDPs(idps) {
    const grid = document.getElementById('results');
    grid.textContent = '';
    for (const idp of idps) grid.append(drawIDPCard(idp));
  }

  displayMessage(text) {
    const grid = document.getElementById('results');
    grid.textContent = '';
    grid.append(el('p', { className: 'muted', textContent: text }));
  }
}
