// BOUNDARY: My IDPs page (Interior Designers) - list of the designer's own IDPs.
// Calls /api/idps/mine, DELETE /api/idps/:id
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
    for (const idp of idps) {
      const deleteBtn = el('button', { className: 'btn secondary', textContent: 'Delete' });
      deleteBtn.addEventListener('click', () => this.clickDeleteIDP(idp));
      const wrapper = el('div', { className: idp.isSuspended ? 'moderation-item is-suspended' : '' });
      if (idp.isSuspended) wrapper.append(el('p', { className: 'suspension-notice', textContent: 'SUSPENDED — this IDP is hidden from customers.' }));
      wrapper.append(drawIDPCard(idp), deleteBtn);
      grid.append(wrapper);
    }
  }

  async clickDeleteIDP(idp) {
    if (!confirm(`Delete "${idp.title}"? This cannot be undone.`)) return;
    const result = await Api.delete(`/api/idps/${idp.id}`);
    if (!result.success) return alert(result.message ?? 'Could not delete the IDP');
    await this.openMyIDPs();
  }

  displayMessage(text) {
    const grid = document.getElementById('results');
    grid.textContent = '';
    grid.append(el('p', { className: 'muted', textContent: text }));
  }
}
