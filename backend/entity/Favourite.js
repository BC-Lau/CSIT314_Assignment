// ENTITY: the IDPs a customer saved to their favourites list
const IDP = require('./IDP');

class Favourite {
  constructor(db) {
    this.db = db;
  }

  // The customer's favourite IDPs with style and room tags
  getFavouriteIDPs(userId) {
    return this.db
      .prepare(
        `${IDP.SELECT}
           JOIN favourite f ON f.idp_id = i.id
          WHERE f.user_id = ?
          GROUP BY i.id
          ORDER BY f.saved_at DESC, i.id DESC`
      )
      .all(userId)
      .map(IDP.fromRow);
  }
}

module.exports = Favourite;