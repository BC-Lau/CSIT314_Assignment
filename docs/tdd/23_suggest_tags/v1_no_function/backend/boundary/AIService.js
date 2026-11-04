// BOUNDARY: talks to the external AI service (Google Gemini) for #23 suggest tags.
const { GoogleGenAI } = require('@google/genai');

const NO_STYLE = 'None'; // lets the AI say "no style fits" instead of guessing one

class AIService {
  /** @param client  Gemini's `models` object; tests pass a fake one so the real API is never called */
  constructor(apiKey = process.env.GEMINI_API_KEY, client = apiKey && new GoogleGenAI({ apiKey }).models) {
    this.client = client;
  }

  /**
   * Asks the AI for 1 style and the room types in the description. The answer is limited
   * (JSON schema enums) to the preset names. Throws if the AI fails (the controller then uses keywords).
   * @returns {Promise<{style: string | null, types: string[]}>}  style is null when no style fits
   */
  async requestTags(description, styleNames, typeNames) {
  }
}

module.exports = AIService;
