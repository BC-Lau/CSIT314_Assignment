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
          ORDER BY f.saved_at DESC, i.id DESC`
      )
      .all(userId)
      .map(IDP.fromRow);
  }
  // Check if this customer already saved this IDP
  exists(userId, idpId) {
    const row = this.db
      .prepare('SELECT 1 FROM favourite WHERE user_id = ? AND idp_id = ?')
      .get(userId, idpId);
    return Boolean(row);
  }

  // Saves the IDP for the customer. Returns false (and adds nothing) if it was already saved
  addFavourite(userId, idpId) {
    const result = this.db
      .prepare('INSERT OR IGNORE INTO favourite (user_id, idp_id) VALUES (?, ?)')
      .run(userId, idpId);
    return result.changes === 1;
  }
}

module.exports = Favourite;