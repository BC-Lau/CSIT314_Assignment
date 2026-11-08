class AnalyticsReport {
  constructor(reportId = null, generatedDate = new Date(), metricsData = []) {
    this.reportId = Number(reportId ?? Date.now());
    this.generatedDate = generatedDate instanceof Date ? generatedDate : new Date(generatedDate);
    this.metricsData = metricsData;
  }

  addMetric(idpId, title, views, interactions, rate) {
    this.metricsData.push({
      idpId: Number(idpId),
      title: String(title),
      viewCount: Number(views),
      interactionCount: Number(interactions),
      interactionRate: Number(rate)
    });
    return this.metricsData[this.metricsData.length - 1];
  }
}

module.exports = AnalyticsReport;
