const VerificationApp = require('../entity/VerificationApp');
const MAX_LICENSE_BYTES = 8 * 1024 * 1024;
const ALLOWED_LICENSE_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

// #48: Validate and track license applications submitted by Interior Designers.
class SubmitLicenseController {
  constructor(userAccount) {
    this.userAccount = userAccount;
  }

  getStatus(user) {
    if (!user || user.profile !== 'Interior Designer') {
      return { success: false, message: 'Only interior designers can view license status' };
    }

    const application = VerificationApp.findLatestByDesigner(user.id);
    const status = user.isVerified
      ? 'Verified'
      : application?.status === 'Pending'
        ? 'Pending Review'
        : application?.status === 'Rejected'
          ? 'Rejected'
          : 'Unverified';
    return {
      success: true,
      status,
      isVerified: user.isVerified,
      application: application ? application.getDetails() : null
    };
  }

  submitLicense(user, data = {}) {
    if (!user || user.profile !== 'Interior Designer') {
      return { success: false, message: 'Only interior designers can submit a license' };
    }
    if (user.isVerified) {
      return { success: false, message: 'Your license is already verified' };
    }

    const companyName = typeof data.companyName === 'string' ? data.companyName.trim() : '';
    const uen = typeof data.uen === 'string' ? data.uen.trim() : '';
    const licenseNumber = typeof data.licenseNumber === 'string' ? data.licenseNumber.trim() : '';
    const documentFileName = typeof data.documentFileName === 'string'
      ? data.documentFileName.replace(/[\\/\x00-\x1f\x7f]/g, '').trim().slice(0, 120)
      : '';
    const extension = documentFileName.toLowerCase().split('.').pop();
    if (!companyName || !uen || !licenseNumber || !documentFileName || !Buffer.isBuffer(data.documentData)) {
      return { success: false, message: 'Company name, UEN, license number, and PDF/DOCX file are required' };
    }
    if (!['pdf', 'docx'].includes(extension)) {
      return { success: false, message: 'License document must be a PDF or DOCX file' };
    }
    if (!ALLOWED_LICENSE_MIME_TYPES.has(data.documentMimeType)) {
      return { success: false, message: 'License document must be a PDF or DOCX file' };
    }
    if (data.documentData.length === 0 || data.documentData.length > MAX_LICENSE_BYTES) {
      return { success: false, message: 'License document must be 8 MB or smaller' };
    }
    const bytes = data.documentData;
    const isPdf = bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    const isDocx = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
      && bytes[2] === 0x03 && bytes[3] === 0x04;
    if ((extension === 'pdf' && (!isPdf || data.documentMimeType !== 'application/pdf'))
      || (extension === 'docx' && (!isDocx || data.documentMimeType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))) {
      return { success: false, message: 'The uploaded file type does not match its PDF or DOCX extension' };
    }

    const application = VerificationApp.submitForDesigner(this.userAccount.db, user.id, {
      companyName, uen, licenseNumber,
      documentFileName, documentMimeType: data.documentMimeType, documentData: data.documentData
    });
    return {
      success: true,
      status: 'Pending Review',
      application: application.getDetails(),
      message: 'License submitted for review'
    };
  }
}

module.exports = SubmitLicenseController;
