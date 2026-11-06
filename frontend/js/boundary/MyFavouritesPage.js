// BOUNDARY: #7 My favourites page (Customers)
// Shows the saved IDPs in a table so they can be compared
// Calls /api/favourites/idps
class MyFavouritesPage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    LogoutAction.bind();
    await this.openFavourites();
  }

  async openFavourites() {
    const result = await Api.get('/api/favourites/idps');
    if (!result.success) return this.displayMessage(result.message ?? 'Could not load your favourites');
    if (result.idps.length === 0) return this.displayNoFavourites();
    this.displayFavourites(result.idps);
  }

  displayFavourites(idps) {
    const columns = ['Project', 'Designer', 'Budget', 'House size', 'Duration', 'Style', 'Types'];
    const head = el('tr', {}, ...columns.map((name) => el('th', { textContent: name })));
    const rows = idps.map((idp) => el('tr', {},
      el('td', {}, el('a', { href: `/idp-view.html?id=${idp.id}`, textContent: idp.title })),
      el('td', { textContent: idp.designerName }),
      el('td', { className: 'nowrap', textContent: money(idp.budget) }),
      el('td', { className: 'nowrap', textContent: idp.houseSize == null ? '' : `${Number(idp.houseSize).toLocaleString('en-SG')} sq ft` }),
      el('td', { className: 'nowrap', textContent: idp.duration ?? '' }),
      el('td', { textContent: idp.style ?? '' }),
      el('td', { textContent: idp.type.join(', ') })
    ));
    const table = el('table', { className: 'compare-table' }, el('thead', {}, head), el('tbody', {}, ...rows));
    const results = document.getElementById('results');
    results.textContent = '';
    results.append(el('p', { className: 'muted', textContent: `${idps.length} saved ${idps.length === 1 ? 'project' : 'projects'}, newest first` }));
    results.append(el('div', { className: 'table-wrap' }, table));
  }

  displayNoFavourites() {
    this.displayMessage('You have no favourites yet. Save IDPs you like from the home page and they will appear here.');
  }

  displayMessage(text) {
    const results = document.getElementById('results');
    results.textContent = '';
    results.append(el('p', { className: 'muted', textContent: text }));
  }
}