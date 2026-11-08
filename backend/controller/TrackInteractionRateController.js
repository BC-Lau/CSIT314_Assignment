const InteractionLog = require('../entity/InteractionLog');
const AnalyticsReport = require('../entity/AnalyticsReport');

class TrackInteractionRateController {
  constructor(db, userAccount) {
    this.db = db;
    this.userAccount = userAccount;
    InteractionLog.useDatabase(db);
  }

  logInteraction(customerId, idpId, type) {
    const customer = this.userAccount.findById(customerId);
    if (!customer || customer.profile !== 'Customer' || !Number.isInteger(Number(idpId))) return false;
    const idp = this.db.prepare('SELECT id FROM idp WHERE id = ?').get(Number(idpId));
    if (!idp || !InteractionLog.allowedTypes.includes(type)) return false;
    InteractionLog.createLog(Number(customerId), Number(idpId), type);
    return true;
  }

  convertLogsToData(idpId) {
    return InteractionLog.getLogsByIdp(idpId, 'all');
  }

  computeInteractionRate(totalInteractions, totalViews) {
    const interactions = Number(totalInteractions) || 0;
    const views = Number(totalViews) || 0;
    return views === 0 ? 0 : Number(((interactions / views) * 100).toFixed(2));
  }

  computeIdpInteractionRate(totalInteractions, totalViews) {
    return this.computeInteractionRate(totalInteractions, totalViews);
  }

  generateAnalyticsReport(timeframe = '30d', catId = '', interactionType = '') {
    return this.generateIdpInteractionRateReport(timeframe, catId, interactionType);
  }

  generateIdpInteractionRateReport(timeframe = '30d', catId = '', interactionType = '') {
    const report = new AnalyticsReport();
    const allowedTimeframes = new Set(['7d', '30d', '90d', 'all']);
    const period = allowedTimeframes.has(timeframe) ? timeframe : '30d';
    const params = [];
    let categoryFilter = '';
    if (catId) {
      categoryFilter = ' AND i.style = ?';
      params.push(catId);
    }
    const idps = this.db.prepare(`
      SELECT id, title, style, COALESCE(view_count, 0) AS view_count
      FROM idp i WHERE visibility = 'public'${categoryFilter}
      ORDER BY title
    `).all(...params);

    for (const idp of idps) {
      const logs = InteractionLog.getLogsByIdp(idp.id, period);
      const interactions = logs.filter((log) => {
        if (log.interactionType === 'view') return false;
        return !interactionType || interactionType === 'all' || log.interactionType === interactionType;
      }).length;
      const views = period === 'all'
        ? Number(idp.view_count) || logs.filter((log) => log.interactionType === 'view').length
        : logs.filter((log) => log.interactionType === 'view').length;
      report.addMetric(idp.id, idp.title, views, interactions, this.computeIdpInteractionRate(interactions, views));
    }
    report.metricsData.sort((a, b) => b.interactionRate - a.interactionRate || b.interactionCount - a.interactionCount);
    return report;
  }
}

module.exports = TrackInteractionRateController;
