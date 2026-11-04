const express = require('express');
const IDP = require('../entity/IDP');
const UserAccount = require('../entity/UserAccount');
const CreateIDPController = require('../controller/CreateIDPController');
const BrowseIDPController = require('../controller/BrowseIDPController');
const SuggestTagsController = require('../controller/SuggestTagsController');
const AIService = require('../boundary/AIService');

function idpRoutes(db, { aiService = new AIService() } = {}) {
  const router = express.Router();
  const idp = new IDP(db);
  const userAccount = new UserAccount(db);
  const createIDPController = new CreateIDPController(idp);
  const browseIDPController = new BrowseIDPController(idp);
  const suggestTagsController = new SuggestTagsController(idp, aiService);

  // Public: latest IDPs for the home page
  router.get('/latest', (req, res) => {
    res.json({ success: true, idps: browseIDPController.getLatestIDPs(req.query.limit) });
  });

  // #13 Create IDP
  router.get('/tag-options', (req, res) => {
    res.json({ success: true, ...createIDPController.getTagOptions() });
  });

  router.post('/', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = createIDPController.createIDP(user, req.body ?? {});
    res.status(result.success ? 201 : 400).json(result);
  });

  // #23 Suggest tags (used by the Create IDP form; Update IDP will reuse it)
  router.post('/suggest-tags', async (req, res) => {
    const result = await suggestTagsController.suggestTags(req.body?.description);
    res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}

module.exports = idpRoutes;
