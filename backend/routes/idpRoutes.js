const express = require('express');
const IDP = require('../entity/IDP');
const Tag = require('../entity/Tag');
const UserAccount = require('../entity/UserAccount');
const CreateIDPController = require('../controller/CreateIDPController');
const BrowseIDPController = require('../controller/BrowseIDPController');

function idpRoutes(db) {
  const router = express.Router();
  const idp = new IDP(db);
  const tag = new Tag(db);
  const userAccount = new UserAccount(db);
  const createIDPController = new CreateIDPController(tag, idp);
  const browseIDPController = new BrowseIDPController(idp);

  // Public: latest IDPs for the home page
  router.get('/latest', (req, res) => {
    res.json({ success: true, idps: browseIDPController.getLatestIDPs(req.query.limit) });
  });

  // #13 Create IDP
  router.get('/tag-options', (req, res) => {
    res.json({ success: true, tags: createIDPController.getTagOptions() });
  });

  router.post('/', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = createIDPController.createIDP(user, req.body ?? {});
    res.status(result.success ? 201 : 400).json(result);
  });

  return router;
}

module.exports = idpRoutes;
