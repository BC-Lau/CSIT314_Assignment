// CONTROLLER: #2 "As a Customer, I want to filter IDPs by categories (budget, design style, house size, duration)".
// Boundary (FilterIDPPage) -> FilterIDPController -> Tag, IDP (entities)
const INVALID_FILTER_MESSAGE = 'Please check your budget and house size ranges';

// "", null and undefined all mean "not selected".
const toBound = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
const toText = (v) => {
  const text = String(v ?? '').trim();
  return text === '' ? null : text;
};

class FilterIDPController {
  /**
   * @param {import('../entity/IDP')} idp
   * @param {import('../entity/Tag')} tag
   */
  constructor(idp, tag) {
    this.idp = idp;
    this.tag = tag;
  }

  /** The style tags the customer can pick from. */
  loadFilterOptions() {
    return this.tag.getTagsByType('style');
  }

  /** styleTag is the name of a style tag. Returns { success, idps } or { success: false, message, idps: [] }. */
  filterIDPs(minBudget, maxBudget, minHouseSize, maxHouseSize, duration, styleTag) {
    if (!this.validateFilter(minBudget, maxBudget, minHouseSize, maxHouseSize)) {
      return { success: false, message: INVALID_FILTER_MESSAGE, idps: [] };
    }
    const idps = this.idp.findByFilters(
      toBound(minBudget), toBound(maxBudget),
      toBound(minHouseSize), toBound(maxHouseSize),
      toText(duration), toText(styleTag)
    );
    return { success: true, idps };
  }

  /** True when every given value is a number >= 0 and each minimum is not above its maximum. */
  validateFilter(minBudget, maxBudget, minHouseSize, maxHouseSize) {
    for (const [min, max] of [[minBudget, maxBudget], [minHouseSize, maxHouseSize]]) {
      const [low, high] = [toBound(min), toBound(max)];
      for (const v of [low, high]) {
        if (v !== null && !(Number.isFinite(v) && v >= 0)) return false;
      }
      if (low !== null && high !== null && low > high) return false;
    }
    return true;
  }
}

module.exports = FilterIDPController;
