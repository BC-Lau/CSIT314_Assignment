// CONTROLLER: customers contact designers about a project or renovation idea.
class ContactRequestController {
  constructor(contactRequest) {
    this.contactRequest = contactRequest;
  }

  createRequest(user, designerId, idpId, message) {
    if (!user) {
      return { success: false, status: 401, message: 'Login required' };
    }
    if (user.profile !== 'Customer') {
      return { success: false, status: 403, message: 'Only customers can contact designers' };
    }

    const targetDesignerId = Number(designerId);
    if (!Number.isSafeInteger(targetDesignerId) || targetDesignerId <= 0) {
      return { success: false, status: 400, message: 'Invalid designer' };
    }
    if (!this.contactRequest.isActiveDesigner(targetDesignerId)) {
      return { success: false, status: 404, message: 'Designer not found' };
    }

    let targetIDPId = null;
    if (idpId !== undefined && idpId !== null && idpId !== '') {
      targetIDPId = Number(idpId);
      if (!Number.isSafeInteger(targetIDPId) || targetIDPId <= 0) {
        return { success: false, status: 400, message: 'Invalid project' };
      }
      if (!this.contactRequest.hasPublicIDP(targetIDPId, targetDesignerId)) {
        return { success: false, status: 400, message: 'Project does not belong to this designer or is unavailable' };
      }
    }

    if (typeof message !== 'string' || !message.trim() || message.length > 2000) {
      return { success: false, status: 400, message: 'Message must be between 1 and 2000 characters' };
    }

    const requestId = this.contactRequest.createRequest(
      user.id,
      targetDesignerId,
      targetIDPId,
      message.trim()
    );
    return {
      success: true,
      status: 201,
      message: 'Your message has been sent to the designer',
      requestId
    };
  }

  getDesignerRequests(user) {
    if (!user) {
      return { success: false, status: 401, message: 'Login required' };
    }
    if (user.profile !== 'Interior Designer') {
      return { success: false, status: 403, message: 'Only interior designers can view these messages' };
    }
    return {
      success: true,
      status: 200,
      requests: this.contactRequest.getRequestsForDesigner(user.id)
    };
  }
}

module.exports = ContactRequestController;
