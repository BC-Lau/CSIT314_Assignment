class IdpInteractionRatePage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    LogoutAction.bind();
    await this.loadInteractionCategories();
    document.getElementById('interactionRateForm').addEventListener('submit', (event) => {
      event.preventDefault();
      this.applyFilters();
    });
    await this.applyFilters();
  }

  async loadInteractionCategories() {
    const result = await Api.get('/api/idps/tag-options');
    if (!result.success) return;
    const select = document.getElementById('interactionCategory');
    for (const style of result.styles ?? []) {
      select.append(el('option', { value: style, textContent: style }));
    }
  }

  async applyFilters() {
    const query = new URLSearchParams({
      timeframe: document.getElementById('interactionTimeframe').value,
      categoryId: document.getElementById('interactionCategory').value,
      interactionType: document.getElementById('interactionType').value
    });
    const result = await Api.get(`/api/metrics/idp-interaction-rate?${query}`);
    if (!result.success) return this.displayErrorMessage(result.message || 'Could not load interaction analytics');
    this.displayAnalyticsReport(result.report);
  }

  displayAnalyticsReport(report) {
    const message = document.getElementById('interactionRateMessage');
    message.textContent = report.metricsData.length ? '' : 'No published IDPs match these filters.';
    const rows = document.getElementById('interactionRateRows');
    rows.textContent = '';
    for (const metric of [...report.metricsData].sort((a, b) => b.interactionRate - a.interactionRate)) {
      rows.append(el('tr', {},
        el('td', { textContent: metric.title }),
        el('td', { textContent: metric.viewCount }),
        el('td', { textContent: metric.interactionCount }),
        el('td', { textContent: `${Number(metric.interactionRate).toFixed(2)}%` })
      ));
    }
  }

  displayErrorMessage(message) {
    document.getElementById('interactionRateMessage').className = 'message error';
    document.getElementById('interactionRateMessage').textContent = message;
  }
}
