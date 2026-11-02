// BOUNDARY: #2 Filter IDPs page (Customers). Calls /api/filter/*; no business rules here.
class FilterIDPPage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    LogoutAction.bind();
    document.getElementById('filterForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const value = (id) => document.getElementById(id).value;
      this.submitFilter(value('minBudget'), value('maxBudget'), value('minHouseSize'),
        value('maxHouseSize'), value('duration'), value('styleTag'));
    });
    await this.openFilterPage();
  }

  async openFilterPage() {
    const result = await Api.get('/api/filter/options');
    if (result.status === 401 || result.status === 403) return this.displayInvalidFilter(result.message);
    this.displayFilterOptions(result.tags ?? []);
  }

  displayFilterOptions(styleTags) {
    const select = document.getElementById('styleTag');
    select.textContent = '';
    select.append(el('option', { value: '', textContent: 'Any style' }));
    for (const tag of styleTags) select.append(el('option', { value: tag.name, textContent: tag.name }));
  }

  async submitFilter(minBudget, maxBudget, minHouseSize, maxHouseSize, duration, styleTag) {
    const query = new URLSearchParams({ minBudget, maxBudget, minHouseSize, maxHouseSize, duration, styleTag });
    const result = await Api.get(`/api/filter/idps?${query}`);
    if (!result.success) return this.displayInvalidFilter(result.message);
    if (result.idps.length === 0) return this.displayNoResults();
    this.displayResults(result.idps);
  }

  displayResults(idps) {
    this.clearMessage();
    document.getElementById('count').textContent = `${idps.length} project${idps.length === 1 ? '' : 's'} found`;
    const grid = document.getElementById('results');
    grid.textContent = '';
    for (const idp of idps) grid.append(drawIDPCard(idp));
  }

  displayNoResults() {
    this.clearMessage();
    document.getElementById('count').textContent = '';
    const grid = document.getElementById('results');
    grid.textContent = '';
    grid.append(el('p', { className: 'muted', textContent: 'No IDPs match your filters' }));
  }

  displayInvalidFilter(message) {
    document.getElementById('count').textContent = '';
    document.getElementById('results').textContent = '';
    const box = document.getElementById('message');
    box.textContent = message || 'Please check your budget and house size ranges';
    box.className = 'message error';
  }

  clearMessage() {
    const box = document.getElementById('message');
    box.textContent = '';
    box.className = '';
  }
}
