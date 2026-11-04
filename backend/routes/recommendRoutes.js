// Routes for #1 Recommended IDPs

const express = require('express');
const IDP = require('../entity/IDP');
const Favourite = require('../entity/Favourite');
const UserAccount = require('../entity/UserAccount');
const RecommendIDPController = require('../controller/RecommendIDPController');

function recommendRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  const controller = new RecommendIDPController(new Favourite(db), new IDP(db));

  // Recommendations for the logged-in customer
  router.get('/', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = controller.getRecommendations(user);
    res.status(result.success ? 200 : 403).json(result);
  });

  return router;
}

module.exports = recommendRoutes;