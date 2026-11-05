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

  /** Only suggests: nothing is saved,need login . */
  async suggestTags(description) {
    const text = typeof description === 'string' ? description.trim() : '';
    if (!text) return { success: false, message: 'Description is required' };

    const styleNames = this.idp.getTagsByType('style');
    const typeNames = this.idp.getTagsByType('type');

    let suggestedTags = [];
    try {
      if (!this.aiService) throw new Error('AI service is not configured');
      const { style, types } = await this.aiService.requestTags(text, styleNames, typeNames);
      suggestedTags = this.idp.findByNames([style, ...types]); // names not in the preset list are discarded
    } catch {
      // AI failed or timed out: fall back to keyword matching below
    }
    if (suggestedTags.length === 0) suggestedTags = this.idp.matchByKeywords(text);

    const { styleTag, typeTags } = this.keepOneStyle(suggestedTags);
    const result = { success: true, styleTag, typeTags };
    if (!styleTag) result.message = 'No style matched, please choose a style';
    return result;
  }

  /** Exactly 1 style (the first = best match) + all types. */
  keepOneStyle(tags) {
    const styleNames = this.idp.getTagsByType('style');
    return {
      styleTag: tags.find((t) => styleNames.includes(t)) ?? null,
      typeTags: tags.filter((t) => !styleNames.includes(t)),
    };
  }
}

module.exports = SuggestTagsController;
