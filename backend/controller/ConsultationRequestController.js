
/**
 * CONTROL: User Story #3
 * Customer Consultation Requests
 */
class ConsultationRequestController {
  constructor(consultationRequest) {
    this.consultationRequest = consultationRequest;
  }

  // Only customers may request consultations.
  isCustomer(user) {
    return Boolean(
      user &&
      user.profile === 'Customer'
    );
  }

  // Record a customer's consultation request.
  requestConsultation(user, slotID, message = '', idpID = null) {
    if (!this.isCustomer(user)) {
      return {
        success: false,
        message: 'Only Customers can request consultations',
        status: 403
      };
    }

    const id = Number(slotID);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return {
        success: false,
        message: 'Invalid consultation slot',
        status: 400
      };
    }

    if (typeof message !== 'string' || message.length > 2000) {
      return {
        success: false,
        message: 'Message must be 2000 characters or fewer',
        status: 400
      };
    }

    try {
      const booking = this.consultationRequest.createRequest(
        id,
        user.id,
        message.trim(),
        idpID
      );

      return {
        success: true,
        message: 'Consultation requested successfully',
        booking,
        status: 201
      };
    } catch (error) {
      const conflict = /already booked|no longer available/.test(
        error.message
      );

      return {
        success: false,
        message: error.message,
        status: conflict ? 409 : 400
      };
    }
  }
  
  // Customer views their consultation history.
  getMyConsultations(user) {
    if (!this.isCustomer(user)) {
      return {
        success: false,
        status: 403,
        message: 'Only Customers can view their consultations'
      };
    }

    return {
      success: true,
      status: 200,
      consultations: this.consultationRequest.getCustomerRequests(user.id)
    };
  }

  // Customer cancels their own consultation.
  cancelConsultation(user, requestID) {
    if (!this.isCustomer(user)) {
      return {
        success: false,
        status: 403,
        message: 'Only Customers can cancel consultations'
      };
    }

    const id = Number(requestID);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return {
        success: false,
        status: 400,
        message: 'Invalid consultation request ID'
      };
    }

    try {
      const result = this.consultationRequest.cancelRequest(id, user.id);

      return {
        ...result,
        status: 200
      };
    } catch (error) {
      return {
        success: false,
        status: 400,
        message: error.message
      };
    }
  }

  // Designer views consultations booked with them.
  getDesignerConsultations(user) {
    if (!user || user.profile !== 'Interior Designer') {
      return {
        success: false,
        status: 403,
        message: 'Only Interior Designers can view these consultations'
      };
    }

    return {
      success: true,
      status: 200,
      consultations: this.consultationRequest.getDesignerRequests(user.id)
    };
  }

}

module.exports = ConsultationRequestController;
