// CONTROLLER: View IDP - the details of one IDP (opened by clicking an IDP card).
// Boundary (ViewIDPPage) -> ViewIDPController -> IDP (entity)
class ViewIDPController {
  /** @param {import('../entity/IDP')} idp */
  constructor(idp) {
    this.idp = idp;
  }

  /**
   * Public IDPs: anyone (even not logged in). Private IDPs: only the designer who made it.
   * isOwner lets the page show owner-only buttons later (e.g. Update / Delete IDP).
   */
  viewIDP(user, idpId) {
    const idp = this.idp.getIDPById(Number(idpId));
    const isOwner = Boolean(user && idp && idp.designerId === user.id);
    if (!idp || (idp.visibility === 'private' && !isOwner)) {
      return { success: false, message: 'IDP not found' };
    }
    return { success: true, idp, isOwner };
  }
}

module.exports = ViewIDPController;
