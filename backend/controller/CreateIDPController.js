// CONTROLLER: #13 "As an Interior Designer, I want to create an IDP".
// Boundary (IDPFormPage) -> CreateIDPController -> IDP (entity)
const VISIBILITIES = ['public', 'private'];
const isBlank = (v) => v == null || v === '';
const toNumber = (v) => (isBlank(v) ? null : Number(v));

class CreateIDPController {
  /** @param {import('../entity/IDP')} idp */
  constructor(idp) {
    this.idp = idp;
  }

  getTagOptions() {
    return { styles: this.idp.getTagsByType('style'), types: this.idp.getTagsByType('type') };
  }

  /** @param {import('../entity/UserAccount') | null} user  the logged-in user (a profile subclass) */
  createIDP(user, idpData = {}) {
    if (!user || !user.canCreateIDP()) {
      return { success: false, message: 'Only interior designers can create IDPs' };
    }
    if (user.isVerified !== true) {
      return {
        success: false,
        statusCode: 403,
        message: 'Only verified Interior Designers can interact with customers or publish IDPs.'
      };
    }
    const title = String(idpData.title ?? '').trim();
    const description = String(idpData.description ?? '').trim();
    if (!title || !description) {
      return { success: false, message: 'Please fill in all required fields' };
    }
    const visibility = idpData.visibility ?? 'public';
    if (!VISIBILITIES.includes(visibility)) {
      return { success: false, message: 'Visibility must be public or private' };
    }
    for (const field of ['budget', 'houseSize']) {
      if (!isBlank(idpData[field]) && !(Number(idpData[field]) >= 0)) {
        return { success: false, message: `${field} must be a non-negative number` };
      }
    }

    // Exactly 1 preset style, 1..* preset types
    const type = idpData.type ?? [];
    const styleOk = this.idp.getTagsByType('style').includes(idpData.style);
    const presetTypes = this.idp.getTagsByType('type');
    if (!styleOk || !Array.isArray(type) || !type.every((t) => presetTypes.includes(t))) {
      return { success: false, message: 'Invalid tags: need exactly 1 style' };
    }
    if (type.length === 0) {
      return { success: false, message: 'Please choose at least 1 room type' };
    }

    const newIDP = this.idp.createIDP(user.id, {
      title,
      description,
      budget: toNumber(idpData.budget),
      houseSize: toNumber(idpData.houseSize),
      duration: idpData.duration ? String(idpData.duration).trim() : null,
      visibility,
      style: idpData.style,
      type: [...new Set(type)],
    });
    return { success: true, idp: newIDP };
  }
}

module.exports = CreateIDPController;
