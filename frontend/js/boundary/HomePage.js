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
    for (const idp of idps) {
      const tags = el('div');
      if (idp.style) tags.append(el('span', { className: 'pill', textContent: idp.style }));
      for (const t of idp.type) tags.append(el('span', { className: 'pill type', textContent: t }));
      grid.append(el('article', { className: 'idp-card' },
        el('h3', { textContent: idp.title }),
        el('div', { className: 'meta', textContent: `by ${idp.designerName} · ${money(idp.budget)} · ${idp.duration ?? ''}` }),
        tags,
        el('p', { className: 'meta', textContent: idp.description })
      ));
    }
  }
}
