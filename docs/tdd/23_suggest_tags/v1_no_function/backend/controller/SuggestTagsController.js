// CONTROLLER: #23 "As an Interior Designer, I want tags suggested from my IDP description".
// TDD v1: class and method exist, but nothing is written yet.
class SuggestTagsController {
  constructor(tag, aiService) {
    this.tag = tag;
    this.aiService = aiService;
  }

  async suggestTags(user, description) {}
}

module.exports = SuggestTagsController;
