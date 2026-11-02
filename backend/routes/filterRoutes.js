// Routes for #2 Filter IDPs (Customers only).
const express = require('express');
const IDP = require('../entity/IDP');
const Tag = require('../entity/Tag');
const FilterIDPController = require('../controller/FilterIDPController');
const { requireProfile } = require('../middleware/auth');

function filterRoutes(db) {
  const router = express.Router();
  const controller = new FilterIDPController(new IDP(db), new Tag(db));

  // The style tags to show on the filter page
  router.get('/options', requireProfile('Customer'), (req, res) => {
    res.json({ success: true, tags: controller.loadFilterOptions() });
  });

  // GET /api/filter/idps?minBudget=&maxBudget=&minHouseSize=&maxHouseSize=&duration=&styleTag=
  router.get('/idps', requireProfile('Customer'), (req, res) => {
    const q = req.query;
    const result = controller.filterIDPs(q.minBudget, q.maxBudget, q.minHouseSize, q.maxHouseSize, q.duration, q.styleTag);
    res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}

module.exports = filterRoutes;
