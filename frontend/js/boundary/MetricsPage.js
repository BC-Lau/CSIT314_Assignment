// BOUNDARY: #25 Connected-customers metric page (Platform Manager)
// MetricsPage -> GET /api/metrics/connected-customers -> ConnectedCustomersController.getConnectedCustomers()
// Trend (extra): MetricsPage -> GET /api/metrics/connected-customers/trend
//                -> ConnectedCustomersTrendController.getConnectedCustomersTrend()

// one colour per top-10 designer (lines); the total is drawn as light bars behind them
const TREND_COLOURS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
const TOTAL_COLOUR = '#a8d5cf';

/** Creates an SVG element, e.g. svgEl('line', { x1: 0, y1: 0, x2: 10, y2: 10 }). */
function svgEl(tag, attrs, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

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

    const range = document.getElementById('trendRange');
    range.addEventListener('change', () => {
      for (const box of document.querySelectorAll('.trend-custom')) box.hidden = range.value !== 'custom';
    });
    document.getElementById('trendForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.selectTrendRange(range.value, document.getElementById('trendStart').value, document.getElementById('trendEnd').value);
    });
    document.getElementById('chartView').addEventListener('change', (e) => this.selectChartView(e.target.value));
    document.getElementById('demoToggle').addEventListener('click', () => this.toggleDemoPanel());
    document.getElementById('demoAdd').addEventListener('click', () => this.clickAddDemoContacts());
    await this.selectTrendRange('month'); // default: last 18 months
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
    this.fillDemoDesigners(metrics);
  }

  displayError(message) {
    document.getElementById('results').hidden = true;
    this.showMessage('error', message);
  }

  // ---------- trend (extra) ----------

  async selectTrendRange(range, startDate, endDate) {
    const query = new URLSearchParams({ range });
    if (range === 'custom') {
      if (!startDate || !endDate) return this.displayTrendError('Please choose a start date and an end date');
      query.set('startDate', startDate);
      query.set('endDate', endDate);
    }
    const trend = await Api.get(`/api/metrics/connected-customers/trend?${query}`);
    if (!trend.success) return this.displayTrendError(trend.message ?? 'Could not load the trend');
    this.displayTrend(trend);
  }

  displayTrend(trend) {
    this.trend = trend; // kept so the Total / Top 10 / Mix switch can redraw without asking the server
    this.showMessage(trend.message ? 'info' : null, trend.message, 'trendMessage');
    document.getElementById('trendPeriod').textContent = `${trend.startDate} to ${trend.endDate}, by ${trend.unit}`;
    this.selectChartView(document.querySelector('input[name="chartView"]:checked').value);
    document.getElementById('trendResults').hidden = false;
  }

  /** view: 'total' (bar chart) | 'top10' (line chart) | 'mix' (both). Redraws chart, legend and table. */
  selectChartView(view) {
    const trend = this.trend;
    const showTotal = view !== 'top10';
    const designers = view === 'total' ? [] : trend.designers;
    this.drawChart(trend, showTotal, designers);

    const legend = document.getElementById('trendLegend');
    legend.textContent = '';
    const items = designers.map((d, i) => ({ name: d.designerName, colour: TREND_COLOURS[i] }));
    if (showTotal) items.unshift({ name: 'Total (bars)', colour: TOTAL_COLOUR });
    for (const item of items) {
      const span = el('span', { textContent: item.name });
      span.style.setProperty('--swatch', item.colour);
      legend.append(span);
    }

    // table: the total row and/or one row per designer, one column per period
    const head = document.getElementById('trendHead');
    head.textContent = '';
    head.append(el('th', { textContent: 'Designer' }), ...trend.periods.map((p) => el('th', { textContent: p })));
    const body = document.getElementById('trendBody');
    body.textContent = '';
    const row = (name, counts) => el('tr', {}, el('td', { textContent: name }), ...counts.map((n) => el('td', { textContent: n })));
    if (showTotal) body.append(Object.assign(row('Total', trend.total), { className: 'total' }));
    for (const d of designers) body.append(row(d.designerName, d.counts));
  }

  /** Chart in the <svg>: x = periods, y = number of customers. Total = bars, designers = lines. */
  drawChart(trend, showTotal, designers) {
    const svg = document.getElementById('trendChart');
    svg.textContent = '';
    const [width, height, left, right, top, bottom] = [800, 320, 40, 12, 10, 40];
    const n = trend.periods.length;
    const slot = (width - left - right) / n; // each period gets one slot; bars and line points sit in the middle
    const values = showTotal ? trend.total : designers.flatMap((d) => d.counts);
    const max = Math.max(1, ...values);
    const x = (i) => left + (i + 0.5) * slot;
    const y = (value) => top + (1 - value / max) * (height - top - bottom);

    for (const value of new Set([0, 1, 2, 3, 4].map((k) => Math.round((max * k) / 4)))) {
      svg.append(svgEl('line', { x1: left, x2: width - right, y1: y(value), y2: y(value), stroke: '#dde2e8' }));
      svg.append(svgEl('text', { x: left - 6, y: y(value) + 4, 'text-anchor': 'end' }, value));
    }
    const every = Math.ceil(n / 12); // at most ~12 labels under the chart
    trend.periods.forEach((period, i) => {
      if (i % every !== 0) return;
      const label = trend.unit === 'day' ? period.slice(5) : period; // day: 'MM-DD'
      svg.append(svgEl('text', { x: x(i), y: height - bottom + 18, 'text-anchor': 'middle' }, label));
    });

    if (showTotal) {
      trend.total.forEach((value, i) => {
        const bar = svgEl('rect', { x: x(i) - slot * 0.35, y: y(value), width: slot * 0.7, height: y(0) - y(value), fill: TOTAL_COLOUR });
        bar.append(svgEl('title', {}, `${trend.periods[i]}: ${value}`)); // hover shows the number
        svg.append(bar);
      });
    }
    designers.forEach((d, i) => svg.append(svgEl('polyline', {
      points: d.counts.map((value, j) => `${x(j)},${y(value)}`).join(' '),
      fill: 'none', stroke: TREND_COLOURS[i], 'stroke-width': 2, 'stroke-linejoin': 'round',
    })));
  }

  displayTrendError(message) {
    document.getElementById('trendResults').hidden = true;
    this.showMessage('error', message, 'trendMessage');
  }

  // ---------- demo tool: add contacts so the numbers change ----------

  toggleDemoPanel() {
    const panel = document.getElementById('demoPanel');
    panel.hidden = !panel.hidden;
    document.getElementById('demoToggle').textContent = panel.hidden ? '‹' : '›';
  }

  /** Only the designers who have contacts in the chosen range, so the list stays short. */
  fillDemoDesigners(metrics) {
    const list = document.getElementById('demoDesigner');
    const selected = list.value;
    list.textContent = '';
    for (const d of metrics.byDesigner) {
      list.append(el('option', { value: d.designerId, textContent: `${d.designerName} (${d.customerCount})` }));
    }
    list.value = selected; // keep the same designer after adding
    document.getElementById('demoRange').textContent = `Designers with contacts from ${metrics.startDate} to ${metrics.endDate}`;
    const date = document.getElementById('demoDate');
    date.min = metrics.startDate;
    date.max = metrics.endDate;
    if (!date.value || date.value < date.min || date.value > date.max) date.value = metrics.endDate;
  }

  async clickAddDemoContacts() {
    const result = await Api.post('/api/metrics/demo-contacts', {
      designerId: document.getElementById('demoDesigner').value,
      date: document.getElementById('demoDate').value,
      count: document.getElementById('demoCount').value,
    });
    // reload the metric and the trend so the new contacts show up
    await this.selectDateRange(document.getElementById('startDate').value, document.getElementById('endDate').value);
    document.getElementById('trendForm').requestSubmit();
    this.showMessage(result.success ? 'info' : 'error', result.message, 'demoMessage');
  }

  showMessage(type, text, boxId = 'message') {
    const box = document.getElementById(boxId);
    box.hidden = !type;
    box.className = `message ${type === 'error' ? 'error' : 'success'}`;
    box.textContent = text ?? '';
  }
}
