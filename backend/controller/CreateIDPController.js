// CONTROLLER: #13 "As an Interior Designer, I want to create an IDP".
// Boundary (IDPFormPage) -> CreateIDPController -> Tag, IDP (entities)
const VISIBILITIES = ['public', 'private'];
const isBlank = (v) => v == null || v === '';
const toNumber = (v) => (isBlank(v) ? null : Number(v));

class CreateIDPController {
  /**
   * @param {import('../entity/Tag')} tag
   * @param {import('../entity/IDP')} idp
   */
  constructor(tag, idp) {
    this.tag = tag;
    this.idp = idp;
  }

  getTagOptions() {
    return this.tag.getAllTags();
  }

  /** @param {import('../entity/UserAccount') | null} user  the logged-in user (a profile subclass) */
  createIDP(user, idpData = {}) {
    if (!user || !user.canCreateIDP()) {
      return { success: false, message: 'Only interior designers can create IDPs' };
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

    const tagNames = [...new Set(idpData.tagNames ?? [])];
    const validTags = this.tag.findByNames(tagNames);
    const styleCount = validTags.filter((t) => t.type === 'style').length;
    if (validTags.length !== tagNames.length || styleCount !== 1) {
      return { success: false, message: 'Invalid tags: need exactly 1 style' };
    }

    const newIDP = this.idp.createIDP(
      user.id,
      {
        title,
        description,
        budget: toNumber(idpData.budget),
        houseSize: toNumber(idpData.houseSize),
        duration: idpData.duration ? String(idpData.duration).trim() : null,
        visibility,
      },
      validTags
    );
    return { success: true, idp: newIDP };
  }
}

module.exports = CreateIDPController;
