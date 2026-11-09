// CONTROLLER: User Stories #38, #39 and #40, daily, weekly, monthly and yearly activity reports.
const PERIODS = new Set(['daily', 'weekly', 'monthly', 'yearly']);

function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

class PlatformActivityReportController {
  constructor(report, getToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }) {
    this.report = report;
    this.getToday = getToday;
  }

  getReport(user, period, date) {
    if (!user) {
      return { success: false, status: 401, message: 'Login required' };
    }
    if (!user.canViewMetrics()) {
      return { success: false, status: 403, message: 'Only platform managers can view reports' };
    }
    if (!PERIODS.has(period)) {
      return { success: false, status: 400, message: 'Period must be daily, weekly, monthly or yearly' };
    }
    if (!isValidDate(date)) {
      return { success: false, status: 400, message: 'Choose a valid date in YYYY-MM-DD format' };
    }

    let startDate;
    let endDateExclusive;
    if (period === 'daily') {
      startDate = date;
      endDateExclusive = addDays(date, 1);
    } else if (period === 'weekly') {
      const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
      startDate = addDays(date, -((weekday + 6) % 7));
      endDateExclusive = addDays(startDate, 7);
    } else if (period === 'monthly') {
      startDate = `${date.slice(0, 7)}-01`;
      const nextMonth = new Date(`${startDate}T00:00:00.000Z`);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      endDateExclusive = nextMonth.toISOString().slice(0, 10);
    } else {
      startDate = `${date.slice(0, 4)}-01-01`;
      endDateExclusive = `${Number(date.slice(0, 4)) + 1}-01-01`;
    }

    const endDate = addDays(endDateExclusive, -1);
    return {
      success: true,
      status: 200,
      report: {
        period,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        metrics: this.report.getActivitySummary(startDate, endDateExclusive)
      }
    };
  }
}

module.exports = PlatformActivityReportController;
