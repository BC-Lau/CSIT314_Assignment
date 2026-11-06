// BOUNDARY: #1 Recommended IDPs page (Customers)
// Calls /api/recommendations
class RecommendedIDPPage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    LogoutAction.bind();
    await this.openRecommendations();
  }

  async openRecommendations() {
    const result = await Api.get('/api/recommendations');
    if (!result.success) return this.displayMessage(result.message ?? 'Could not load recommendations');
    if (!result.hasFavourites) return this.displayNoFavouritesPrompt();
    if (result.idps.length === 0) return this.displayNoRecommendations();
    this.displayRecommendations(result.idps);
  }

  displayRecommendations(idps) {
    const grid = document.getElementById('results');
    grid.textContent = '';
    for (const idp of idps) grid.append(drawIDPCard(idp, { showSave: true })); // #6 only customers can save
  }

  displayNoFavouritesPrompt() {
    this.displayMessage('You have no favourites yet. Save some IDPs you like and we will recommend similar projects.');
  }

  displayNoRecommendations() {
    this.displayMessage('No recommendations available yet');
  }

  displayMessage(text) {
    const grid = document.getElementById('results');
    grid.textContent = '';
    grid.append(el('p', { className: 'muted', textContent: text }));
  }
}