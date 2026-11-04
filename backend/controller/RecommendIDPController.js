// CONTROLLER: #1 "As a Customer, I want to be recommended IDPs based on my favourites list".
// Boundary (RecommendedIDPPage) -> RecommendIDPController -> Favourite, IDP (entities)

const DEFAULT_MAX_RECOMMENDATIONS = 10;

const tagNames = (idp) => [idp.style, ...idp.type].filter(Boolean);

class RecommendIDPController {
  /**
   * @param {import('../entity/Favourite')} favourite
   * @param {import('../entity/IDP')} idp
   */
  constructor(favourite, idp, { maxRecommendations = DEFAULT_MAX_RECOMMENDATIONS } = {}) {
    this.favourite = favourite;
    this.idp = idp;
    this.maxRecommendations = maxRecommendations;
  }

  /**
   * @param {import('../entity/UserAccount') | null} user  the logged-in user (a profile subclass)
   * Returns { success, hasFavourites, idps }. hasFavourites lets the page choose between
   * "save some IDPs first" and "no recommendations yet" when idps is empty.
   */
  getRecommendations(user) {
    if (!user || !user.canViewRecommendations()) {
      return { success: false, message: 'Only customers can see recommendations' };
    }
    const favouriteIDPs = this.favourite.getFavouriteIDPs(user.id);
    if (favouriteIDPs.length === 0) return { success: true, hasFavourites: false, idps: [] };

    const tagPreferences = this.getPreferredTags(favouriteIDPs);
    const candidateIDPs = this.idp.findSimilarIDPs(tagPreferences, favouriteIDPs);
    const rankedIDPs = this.rankBySimilarity(candidateIDPs, tagPreferences);
    return { success: true, hasFavourites: true, idps: rankedIDPs };
  }

  // Map of tag name -> how many of the favourite IDPs have that tag
  getPreferredTags(favouriteIDPs) {
    const counts = new Map();
    for (const idp of favouriteIDPs) {
      for (const name of tagNames(idp)) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }

  // Best match first, ties newest first, cut to maxRecommendations
  rankBySimilarity(candidateIDPs, tagPreferences) {
    const score = (idp) => tagNames(idp).reduce((sum, name) => sum + (tagPreferences.get(name) ?? 0), 0);
    const newestFirst = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id);
    return candidateIDPs
      .map((idp) => ({ idp, score: score(idp) }))
      .sort((a, b) => b.score - a.score || newestFirst(a.idp, b.idp))
      .slice(0, this.maxRecommendations)
      .map((entry) => entry.idp);
  }
}

module.exports = RecommendIDPController;