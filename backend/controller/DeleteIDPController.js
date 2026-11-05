// CONTROLLER: "As an Interior Designer, I want to delete my IDP, so I can remove unwanted projects".
// Boundary (MyIDPsPage) -> DeleteIDPController -> IDP (entity)
class DeleteIDPController {
  /** @param {import('../entity/IDP')} idp */
  constructor(idp) {
    this.idp = idp;
  }

  deleteIDP(user, idpId) {
    if (!user || !user.canDeleteIDP()) {
      return { success: false, message: 'Only interior designers can delete IDPs' };
    }
    const found = this.idp.getIDPById(Number(idpId));
    if (!found || found.designerId !== user.id) {
      return { success: false, message: 'IDP not found' };
    }
    this.idp.deleteIDP(found.id);
    return { success: true };
  }
}

module.exports = DeleteIDPController;
