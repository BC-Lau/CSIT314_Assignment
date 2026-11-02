// BOUNDARY: talks to the external AI service (Google Gemini) for #23 suggest tags.
const { GoogleGenAI } = require('@google/genai');

class AIService {
  /** @param client  Gemini's `models` object; tests pass a fake one so the real API is never called */
  constructor(apiKey = process.env.GEMINI_API_KEY, client = apiKey && new GoogleGenAI({ apiKey }).models) {
    this.client = client;
  }

  /** Returns the tag names the AI picked. Throws if the AI fails (the controller then uses keywords). */
  async requestTags(description, tagNames) {
    if (!this.client) throw new Error('GEMINI_API_KEY is not set (see .env.example)');
    const response = await this.client.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
      contents: `Pick ONE interior design style and the rooms mentioned in this description.
Only use names from this list: ${tagNames.join(', ')}

${description}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: { type: 'array', items: { type: 'string', enum: tagNames } },
        httpOptions: { timeout: 10000 },
      },
    });
    const names = JSON.parse(response.text);
    if (!Array.isArray(names)) throw new Error('AI did not return a list');
    return names;
  }
}

module.exports = AIService;
