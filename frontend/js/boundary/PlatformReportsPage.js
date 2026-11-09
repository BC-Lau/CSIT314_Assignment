// BOUNDARY: Platform Manager daily, weekly, monthly and yearly activity reports (#38, #39, #40).
class PlatformReportsPage {
  async init() {
    this.account = Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    LogoutAction.bind();
    if (this.account.profile !== 'Platform Manager') {
      window.location.href = '/dashboard.html';
      return;
    }

    const now = new Date();
    document.getElementById('reportDate').value =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    document.getElementById('reportForm').addEventListener('submit', (event) => {
      event.preventDefault();
      this.loadReport();
    });
    await this.loadReport();
  }

  async loadReport() {
    const button = document.getElementById('showReport');
    const message = document.getElementById('reportMessage');
    const results = document.getElementById('reportResults');
    button.disabled = true;
    message.className = 'message hidden';
    results.classList.add('hidden');
    try {
      const query = new URLSearchParams({
        period: document.getElementById('reportPeriod').value,
        date: document.getElementById('reportDate').value
      });
      const result = await Api.get(`/api/metrics/reports?${query}`);
      if (!result.success) {
        message.textContent = result.message || 'Could not generate the report.';
        message.className = 'message error';
        return;
      }
      this.displayReport(result.report);
    } catch {
      message.textContent = 'Could not generate the report. Please try again.';
      message.className = 'message error';
    } finally {
      button.disabled = false;
    }
  }

  displayReport(report) {
    const title = report.period[0].toUpperCase() + report.period.slice(1);
    document.getElementById('reportTitle').textContent =
      `${title} report: ${report.startDate} to ${report.endDate}`;
    document.getElementById('reportGenerated').textContent =
      `Generated ${new Date(report.generatedAt).toLocaleString()}`;
    const metrics = document.getElementById('reportMetrics');
    metrics.replaceChildren(...report.metrics.map((metric) =>
      el('article', { className: 'report-metric' },
        el('strong', { textContent: Number(metric.count).toLocaleString() }),
        el('span', { textContent: metric.label })
      )
    ));
    document.getElementById('reportResults').classList.remove('hidden');
  }
}
