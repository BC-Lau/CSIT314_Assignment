// CONTROLLER: #6 "As a Customer, I want to save an IDP to my IDP favourites list".
// Boundary (IDPCard) -> SaveFavouriteController -> IDP, Favourite (entities)
class SaveFavouriteController {
  /**
   * @param {import('../entity/Favourite')} favourite
   * @param {import('../entity/IDP')} idp
   */
  constructor(favourite, idp) {
    this.favourite = favourite;
    this.idp = idp;
  }

  /**
   * @param {import('../entity/UserAccount') | null} user  the logged-in user (a profile subclass)
   * @param {number | string} idpId  a number, or text when it comes from a URL
   * Returns { success, alreadySaved, message }.
   */
  saveFavourite(user, idpId) {
    if (!user || !user.canSaveFavourite()) {
      return { success: false, message: 'Only customers can save favourites' };
    }
    const idp = this.idp.getIDPById(Number(idpId));
    // A private IDP is treated as not found
    if (!idp || idp.visibility !== 'public') {
      return { success: false, message: 'IDP not found' };
    }
    if (this.favourite.exists(user.id, idp.id)) {
      return { success: true, alreadySaved: true, message: 'Already in your favourites' };
    }
    this.favourite.addFavourite(user.id, idp.id);
    return { success: true, alreadySaved: false, message: 'Saved to your favourites' };
  }
   //The ids of the IDPs this customer saved, so the IDP cards can show "Saved" when the page loads
  getSavedIDPIds(user) {
    if (!user || !user.canSaveFavourite()) {
      return { success: false, message: 'Only customers can save favourites' };
    }
    return { success: true, idpIds: this.favourite.getFavouriteIDPs(user.id).map((idp) => idp.id) };
  }
}

module.exports = SaveFavouriteController;