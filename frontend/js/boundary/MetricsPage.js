// BOUNDARY: #25 Connected-customers metric page (Platform Manager)
// MetricsPage -> GET /api/metrics/connected-customers -> ConnectedCustomersController.getConnectedCustomers()
class MetricsPage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    LogoutAction.bind();
    document.getElementById('rangeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.selectDateRange(document.getElementById('startDate').value, document.getElementById('endDate').value);
    });
    await this.selectDateRange('', ''); // empty dates = default range (last 30 days)
  }

  async selectDateRange(startDate, endDate) {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const metrics = await Api.get(`/api/metrics/connected-customers?${query}`);
    if (!metrics.success) return this.displayError(metrics.message ?? 'Could not load the metric');
    this.displayConnectedCustomers(metrics);
  }

  displayConnectedCustomers(metrics) {
    // show the range the server actually used (default range / end date capped at today)
    document.getElementById('startDate').value = metrics.startDate;
    document.getElementById('endDate').value = metrics.endDate;
    this.showMessage(metrics.message ? 'info' : null, metrics.message);

    document.getElementById('period').textContent = `${metrics.startDate} to ${metrics.endDate}`;
    document.getElementById('total').textContent = metrics.total;
    const rows = document.getElementById('byDesigner');
    rows.textContent = '';
    for (const d of metrics.byDesigner) {
      rows.append(el('tr', {},
        el('td', { textContent: d.designerName }),
        el('td', { textContent: d.customerCount })));
    }
    document.getElementById('results').hidden = false;
  }

  displayError(message) {
    document.getElementById('results').hidden = true;
    this.showMessage('error', message);
  }

  showMessage(type, text) {
    const box = document.getElementById('message');
    box.hidden = !type;
    box.className = `message ${type === 'error' ? 'error' : 'success'}`;
    box.textContent = text ?? '';
  }
}
