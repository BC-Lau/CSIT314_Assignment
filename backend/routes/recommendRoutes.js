// Routes for #1 Recommended IDPs (Customers only).
const express = require('express');
const IDP = require('../entity/IDP');
const Favourite = require('../entity/Favourite');
const RecommendIDPController = require('../controller/RecommendIDPController');
const { requireProfile } = require('../middleware/auth');

function recommendRoutes(db) {
  const router = express.Router();
  const controller = new RecommendIDPController(new Favourite(db), new IDP(db));

  // Recommendations for the logged-in customer
  router.get('/', requireProfile('Customer'), (req, res) => {
    res.json(controller.getRecommendations(req.account.id));
  });

  return router;
}

module.exports = recommendRoutes;
