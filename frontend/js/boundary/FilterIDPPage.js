// BOUNDARY: #2 Filter IDPs page
// Calls /api/filter/*
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
    this.displayFilterOptions(result.styles ?? []);
  }

  displayFilterOptions(styles) {
    const select = document.getElementById('styleTag');
    select.textContent = '';
    select.append(el('option', { value: '', textContent: 'Any style' }));
    for (const style of styles) select.append(el('option', { value: style, textContent: style }));
  }

  async submitFilter(minBudget, maxBudget, minHouseSize, maxHouseSize, duration, styleTag) {
    const query = new URLSearchParams({ minBudget, maxBudget, minHouseSize, maxHouseSize, duration, styleTag });
    const result = await Api.get(`/api/filter/idps?${query}`);
    if (!result.success) return this.displayInvalidFilter(result.message);
    if (result.idps.length === 0) return this.displayNoResults();
    this.canSave = this.account.profile === 'Customer'; // #6 only Customers can save
    this.saved = this.canSave ? await loadSavedIDPIds() : new Set();
    this.displayResults(result.idps);
  }

  displayResults(idps) {
    this.clearMessage();
    document.getElementById('count').textContent = `${idps.length} project${idps.length === 1 ? '' : 's'} found`;
    const grid = document.getElementById('results');
    grid.textContent = '';
    for (const idp of idps) grid.append(drawIDPCard(idp, { showSave: this.canSave, saved: this.saved.has(idp.id) }));
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