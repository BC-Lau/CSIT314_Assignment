// CONTROLLER: #23 "As an Interior Designer, I want to have automated categorisation of my IDPs".
// Boundary (IDPFormPage) -> SuggestTagsController -> AIService (boundary), IDP (entity)
class SuggestTagsController {
  /**
   * @param {import('../entity/IDP')} idp
   * @param {import('../boundary/AIService') | null} aiService  null = no AI, keyword matching only
   */
  constructor(idp, aiService) {
    this.idp = idp;
    this.aiService = aiService;
  }

  /** Only suggests: nothing is saved, so no login check here (createIDP checks it). */
  async suggestTags(description) {
  }

  /** Exactly 1 style (the first = best match) + all types. */
  keepOneStyle(tags) {
  }
}

module.exports = SuggestTagsController;
