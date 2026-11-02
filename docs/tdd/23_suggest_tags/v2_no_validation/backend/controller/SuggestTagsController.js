// CONTROLLER: #23 "As an Interior Designer, I want tags suggested from my IDP description".
// Boundary (IDPFormPage) -> SuggestTagsController -> AIService (boundary), Tag (entity)
// TDD v2: main flow + AI-failure fallback work, but no invalid data checks
// (who the user is, empty description, AI suggests nothing valid).
class SuggestTagsController {
  constructor(tag, aiService) {
    this.tag = tag;
    this.aiService = aiService;
  }

  async suggestTags(user, description) {
    try {
      const names = await this.aiService.requestTags(description, this.tag.getAllTags().map((t) => t.name));
      return { success: true, tags: this.tag.findByNames(names) };
    } catch {
      return { success: true, tags: this.tag.matchByKeywords(description) };
    }
  }
}

module.exports = SuggestTagsController;
