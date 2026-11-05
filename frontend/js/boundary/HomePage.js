// BOUNDARY: public home page (before and after login).
class HomePage {
  async init() {
    this.account = await Nav.render();
    LogoutAction.bind();
    this.showHero();
    await this.loadLatestIDPs();
  }

  showHero() {
    const cta = document.getElementById('heroCta');
    if (this.account) {
      cta.textContent = 'Go to my dashboard';
      cta.href = '/dashboard.html';
    }
  }

  async loadLatestIDPs() {
    const result = await Api.get('/api/idps/latest?limit=12');
    this.displayIDPs(result.idps ?? []);
  }

  displayIDPs(idps) {
    const grid = document.getElementById('idpGrid');
    grid.textContent = '';
    if (!idps.length) {
      grid.append(el('p', { className: 'muted', textContent: 'No projects yet.' }));
      return;
    }
    const showSave = this.account?.profile === 'Customer'; // #6 only Customers can save
    for (const idp of idps) grid.append(drawIDPCard(idp, { showSave }));
  }
}
