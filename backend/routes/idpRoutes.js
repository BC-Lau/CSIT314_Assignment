const express = require('express');
const IDP = require('../entity/IDP');
const UserAccount = require('../entity/UserAccount');
const CreateIDPController = require('../controller/CreateIDPController');
const BrowseIDPController = require('../controller/BrowseIDPController');
const SuggestTagsController = require('../controller/SuggestTagsController');
const ViewIDPController = require('../controller/ViewIDPController');
const ViewMyIDPsController = require('../controller/ViewMyIDPsController');
const DeleteIDPController = require('../controller/DeleteIDPController');
const AIService = require('../boundary/AIService');

function idpRoutes(db, { aiService = new AIService() } = {}) {
  const router = express.Router();
  const idp = new IDP(db);
  const userAccount = new UserAccount(db);
  const createIDPController = new CreateIDPController(idp);
  const browseIDPController = new BrowseIDPController(idp);
  const suggestTagsController = new SuggestTagsController(idp, aiService);
  const viewIDPController = new ViewIDPController(idp);
  const viewMyIDPsController = new ViewMyIDPsController(idp);
  const deleteIDPController = new DeleteIDPController(idp);

  // Public: latest IDPs for the home page
  router.get('/latest', (req, res) => {
    res.json({ success: true, idps: browseIDPController.getLatestIDPs(req.query.limit) });
  });

  // #24 Select only the current designer's projects for uploading media.
  router.get('/mine', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    if (!user || !user.canUploadIDPMedia()) {
      return res.status(403).json({ success: false, message: 'Only designers can view their projects' });
    }
    return res.json({ success: true, idps: idp.getIDPsByDesigner(user.id) });
  });

  // #13 Create IDP
  router.get('/tag-options', (req, res) => {
    res.json({ success: true, ...createIDPController.getTagOptions() });
  });

  router.post('/', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = createIDPController.createIDP(user, req.body ?? {});
    const { statusCode = result.success ? 201 : 400, ...body } = result;
    res.status(statusCode).json(body);
  });

  // #23 Suggest tags (used by the Create IDP form; Update IDP will reuse it)
  router.post('/suggest-tags', async (req, res) => {
    const result = await suggestTagsController.suggestTags(req.body?.description);
    res.status(result.success ? 200 : 400).json(result);
  });

  // My IDPs (designer's own list). Must be before '/:id' so "mine" is not read as an id.
  router.get('/mine', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = viewMyIDPsController.getMyIDPs(user);
    res.status(result.success ? 200 : 403).json(result);
  });

  // View one IDP
  router.get('/:id', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = viewIDPController.viewIDP(user, req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  });

  // Delete my IDP (from the My IDPs page)
  router.delete('/:id', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = deleteIDPController.deleteIDP(user, req.params.id);
    res.status(result.success ? 200 : 403).json(result);
  });

  return router;
}

module.exports = idpRoutes;
