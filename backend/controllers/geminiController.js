const GeminiService = require('../services/geminiService');
const ActivityLogger = require('../services/activityLogger');

class GeminiController {
  // POST /api/gemini/chat
  static async chat(req, res) {
    try {
      const user = req.user;
      const input = req.body || {};
      const prompt = (input.prompt || '').trim();
      const codeContext = input.code_context || null;
      const repoId = input.repo_id ? parseInt(input.repo_id, 10) : null;

      if (!prompt) {
        return res.status(422).json({ error: 'Prompt cannot be empty.' });
      }

      const gemini = new GeminiService();
      const result = await gemini.generateResponse(prompt, codeContext);

      await ActivityLogger.log(
        user.id,
        repoId,
        'GEMINI_AI_QUERY',
        `Queried Gemini AI: ${prompt.substring(0, 50)}`,
        req
      );

      res.json(result);
    } catch (err) {
      console.error('[Gemini Chat Error]', err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = GeminiController;
