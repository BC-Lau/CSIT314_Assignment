// CONTROLLER: #7 "As a Customer, I want to view my IDP favourite list, so that I can compare them with each other".
// Boundary (MyFavouritesPage) -> ViewFavouritesController -> Favourite (entity)
class ViewFavouritesController {
  /**
   * @param {import('../entity/Favourite')} favourite
   */
  constructor(favourite) {
    this.favourite = favourite;
  }

  /**
   * @param {import('../entity/UserAccount') | null} user  the logged-in user (a profile subclass)
   * Returns { success, idps } with the newest saved IDP first, or { success: false, message }.
   */
  getFavourites(user) {
    if (!user || !user.canViewFavourites()) {
      return { success: false, message: 'Only customers can view favourites' };
    }
    const favouriteIDPs = this.favourite.getFavouriteIDPs(user.id);
    return { success: true, idps: this.keepPublicIDPs(favouriteIDPs) };
  }

  // An IDP the designer made private after it was saved is no longer shown to customers
  keepPublicIDPs(idps) {
    return idps.filter((idp) => idp.visibility === 'public');
  }
}

module.exports = ViewFavouritesController;