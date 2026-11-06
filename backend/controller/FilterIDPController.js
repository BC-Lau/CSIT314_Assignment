// CONTROLLER: #2 "As a Customer, I want to filter IDPs by categories (budget, design style, house size, duration)".
// Boundary (FilterIDPPage) -> FilterIDPController -> IDP (entity)
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
   */
  constructor(idp) {
    this.idp = idp;
  }

  // The preset style names the customer can pick from
  loadFilterOptions() {
    return this.idp.getTagsByType('style');
  }

  //Returns { success, idps } or { success: false, message, idps: [] }
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

  // True when every given value is a number >= 0 and the minimum is not above the maximum
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