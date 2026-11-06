// Routes for #2 Filter IDPs
const express = require('express');
const IDP = require('../entity/IDP');
const FilterIDPController = require('../controller/FilterIDPController');

function filterRoutes(db) {
  const router = express.Router();
  const controller = new FilterIDPController(new IDP(db));

  // The preset style names to show on the filter page
  router.get('/options', (req, res) => {
    res.json({ success: true, styles: controller.loadFilterOptions() });
  });

  // GET /api/filter/idps?minBudget=&maxBudget=&minHouseSize=&maxHouseSize=&duration=&styleTag=
  router.get('/idps', (req, res) => {
    const q = req.query;
    const result = controller.filterIDPs(q.minBudget, q.maxBudget, q.minHouseSize, q.maxHouseSize, q.duration, q.styleTag);
    res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}

module.exports = filterRoutes;