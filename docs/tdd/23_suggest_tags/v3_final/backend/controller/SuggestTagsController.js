// CONTROLLER: #23 "As an Interior Designer, I want tags suggested from my IDP description".
// Boundary (IDPFormPage) -> SuggestTagsController -> AIService (boundary), Tag (entity)
class SuggestTagsController {
  /**
   * @param {import('../entity/Tag')} tag
   * @param {import('../boundary/AIService')} aiService
   */
  constructor(tag, aiService) {
    this.tag = tag;
    this.aiService = aiService;
  }

  /** @param {import('../entity/UserAccount') | null} user  the logged-in user (a profile subclass) */
  async suggestTags(user, description) {
    if (!user || !user.canCreateIDP()) {
      return { success: false, message: 'Only interior designers can suggest tags' };
    }
    const text = String(description ?? '').trim();
    if (!text) {
      return { success: false, message: 'Description is required' };
    }

    let tags = [];
    try {
      const names = await this.aiService.requestTags(text, this.tag.getAllTags().map((t) => t.name));
      tags = this.tag.findByNames(names); // names not in the preset list are discarded
    } catch {
      // AI failed or timed out: fall back to keyword matching below
    }
    if (tags.length === 0) tags = this.tag.matchByKeywords(text);
    return { success: true, tags };
  }
}

module.exports = SuggestTagsController;
