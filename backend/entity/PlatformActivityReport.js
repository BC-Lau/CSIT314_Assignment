// ENTITY: aggregates platform activity for the Platform Manager's daily, weekly, monthly and yearly reports.
class PlatformActivityReport {
  constructor(db) {
    this.db = db;
  }

  getActivitySummary(startDate, endDateExclusive) {
    const count = (sql, ...params) => Number(this.db.prepare(sql).get(...params).count);
    const interval = (column) => `${column} >= ? AND ${column} < ?`;

    return [
      {
        key: 'newAccounts',
        label: 'New user accounts',
        count: count(`
          SELECT COUNT(*) AS count FROM user_account
           WHERE ${interval('created_at')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'newCustomers',
        label: 'New customers',
        count: count(`
          SELECT COUNT(*) AS count
            FROM user_account a
            JOIN user_profile p ON p.id = a.profile_id
           WHERE p.name = 'Customer' AND ${interval('a.created_at')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'newDesigners',
        label: 'New interior designers',
        count: count(`
          SELECT COUNT(*) AS count
            FROM user_account a
            JOIN user_profile p ON p.id = a.profile_id
           WHERE p.name = 'Interior Designer' AND ${interval('a.created_at')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'newIDPs',
        label: 'IDPs created',
        count: count(`
          SELECT COUNT(*) AS count FROM idp
           WHERE ${interval('created_at')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'customerContacts',
        label: 'Customer inquiries sent',
        count: count(`
          SELECT COUNT(*) AS count FROM contact_request
           WHERE ${interval('created_at')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'consultationsBooked',
        label: 'Consultations booked',
        count: count(`
          SELECT COUNT(*) AS count FROM consultation_request
           WHERE ${interval('created_at')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'consultationsCancelled',
        label: 'Consultations cancelled',
        count: count(`
          SELECT COUNT(*) AS count FROM consultation_request
           WHERE cancelled_at IS NOT NULL AND ${interval('cancelled_at')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'idpViews',
        label: 'IDP views',
        count: count(`
          SELECT COUNT(*) AS count FROM interaction_log
           WHERE interaction_type = 'view' AND ${interval('timestamp')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'idpFavourites',
        label: 'IDPs added to favourites',
        count: count(`
          SELECT COUNT(*) AS count FROM interaction_log
           WHERE interaction_type = 'favourite' AND ${interval('timestamp')}
        `, startDate, endDateExclusive)
      },
      {
        key: 'idpMessages',
        label: 'IDP-linked messages sent',
        count: count(`
          SELECT COUNT(*) AS count FROM interaction_log
           WHERE interaction_type = 'message' AND ${interval('timestamp')}
        `, startDate, endDateExclusive)
      }
    ];
  }
}

module.exports = PlatformActivityReport;
