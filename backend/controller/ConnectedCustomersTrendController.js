// CONTROLLER: #25 extra (alternative flow) — how the connected customers change over time.
// Boundary (MetricsPage) -> ConnectedCustomersTrendController -> ContactRequest (entity)
// Total + the top 10 designers, one number per day / month / year. Dates are 'YYYY-MM-DD', inclusive.

/** Today's local date as 'YYYY-MM-DD'. */
function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' plus n days (n can be negative). */
function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** True for a real calendar date such as '2026-03-01' (not '2026-02-30'). */
function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && addDays(date, 0) === date;
}

const KEY_LENGTH = { day: 10, month: 7, year: 4 }; // '2026-03-31', '2026-03', '2026'

/** Every period from startDate to endDate, e.g. ['2026-01', '2026-02', '2026-03']. */
function listPeriods(startDate, endDate, unit) {
  const size = KEY_LENGTH[unit];
  const d = new Date(`${startDate}T00:00:00Z`);
  const periods = [];
  while (d.toISOString().slice(0, size) <= endDate.slice(0, size)) {
    periods.push(d.toISOString().slice(0, size));
    if (unit === 'day') d.setUTCDate(d.getUTCDate() + 1);
    else if (unit === 'month') d.setUTCMonth(d.getUTCMonth() + 1, 1);
    else d.setUTCFullYear(d.getUTCFullYear() + 1, 0, 1);
  }
  return periods;
}

/** First day of the preset range that ends today: last 30 days / 18 months / 5 years. */
function presetStart(range, today) {
  const [y, m] = today.split('-').map(Number);
  if (range === 'day') return addDays(today, -29);
  if (range === 'month') return new Date(Date.UTC(y, m - 1 - 17, 1)).toISOString().slice(0, 10);
  return `${y - 4}-01-01`;
}

class ConnectedCustomersTrendController {
  /**
   * @param {import('../entity/ContactRequest')} contactRequest
   * @param {() => string} getToday  injected so tests can fix "today"
   */
  constructor(contactRequest, getToday = todayString) {
    this.contactRequest = contactRequest;
    this.getToday = getToday;
  }

  /**
   * @param range 'year' (5 years) | 'month' (18 months) | 'day' (30 days) | 'custom' (startDate..endDate, max 2 years)
   */
  getConnectedCustomersTrend(user, range = 'month', startDate, endDate) {
    if (!user || !user.canViewMetrics()) {
      return { success: false, message: 'Only platform managers can view metrics' };
    }
    if (range !== 'custom' && !KEY_LENGTH[range]) {
      return { success: false, message: 'Unknown range' };
    }
    const today = this.getToday();
    let unit = range;
    if (range === 'custom') {
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return { success: false, message: 'Dates must be in YYYY-MM-DD format' };
      }
      if (endDate > today) endDate = today;
      if (startDate > endDate) {
        return { success: false, message: 'Start date must be before end date' };
      }
      const twoYearsBefore = `${Number(endDate.slice(0, 4)) - 2}${endDate.slice(4)}`;
      if (startDate < twoYearsBefore) {
        return { success: false, message: 'The date range cannot be longer than 2 years' };
      }
      unit = addDays(startDate, 30) >= endDate ? 'day' : 'month'; // up to 31 days: by day
    } else {
      endDate = today;
      startDate = presetStart(range, today);
    }

    const periods = listPeriods(startDate, endDate, unit);
    const totals = {};
    for (const row of this.contactRequest.countConnectedCustomersByPeriod(startDate, endDate, unit)) {
      totals[row.period] = row.total;
    }
    const counts = {}; // counts[designerId][period]
    for (const row of this.contactRequest.countByDesignerAndPeriod(startDate, endDate, unit)) {
      counts[row.designerId] = { ...counts[row.designerId], [row.period]: row.customerCount };
    }
    // top 10 = most customers in the whole range (countByDesigner is already sorted)
    const designers = this.contactRequest.countByDesigner(startDate, endDate).slice(0, 10).map((d) => ({
      designerName: d.designerName,
      counts: periods.map((p) => counts[d.designerId][p] ?? 0),
    }));

    const result = {
      success: true, range, unit, startDate, endDate, periods,
      total: periods.map((p) => totals[p] ?? 0),
      designers,
    };
    if (designers.length === 0) result.message = 'No contacts in this period';
    return result;
  }
}

module.exports = ConnectedCustomersTrendController;
