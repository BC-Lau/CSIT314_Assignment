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
    const response = await this.client.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
      contents: `Pick the ONE interior design style that best fits this project, and every room type the description says was worked on.
Only pick a style if the description mentions it or clearly describes it; otherwise answer ${NO_STYLE} for the style.
Styles: ${styleNames.join(', ')}
Room types: ${typeNames.join(', ')}

${description}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            style: { type: 'string', enum: [...styleNames, NO_STYLE] },
            types: { type: 'array', items: { type: 'string', enum: typeNames } },
          },
          required: ['style', 'types'],
        },
        httpOptions: { timeout: 10000 },
      },
    });
    const answer = JSON.parse(response.text);
    return { style: answer.style === NO_STYLE ? null : answer.style, types: answer.types };
  }
}

module.exports = AIService;
