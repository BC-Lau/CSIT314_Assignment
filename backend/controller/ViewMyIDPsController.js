// CONTROLLER: My IDPs - an interior designer's list of their own IDPs (public and private).
// Boundary (MyIDPsPage) -> ViewMyIDPsController -> IDP (entity)
class ViewMyIDPsController {
  /** @param {import('../entity/IDP')} idp */
  constructor(idp) {
    this.idp = idp;
  }

  getMyIDPs(user) {
    if (!user || !user.canViewMyIDPs()) {
      return { success: false, message: 'Only interior designers can view their IDPs' };
    }
    return { success: true, idps: this.idp.getIDPsByDesigner(user.id) };
  }
}

module.exports = ViewMyIDPsController;
