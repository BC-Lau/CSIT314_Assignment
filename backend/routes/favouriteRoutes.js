// Routes for #6 Save IDP to favourites and #7 View my IDP favourite list

const express = require('express');
const IDP = require('../entity/IDP');
const Favourite = require('../entity/Favourite');
const UserAccount = require('../entity/UserAccount');
const SaveFavouriteController = require('../controller/SaveFavouriteController');
const ViewFavouritesController = require('../controller/ViewFavouritesController');

function favouriteRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  const controller = new SaveFavouriteController(new Favourite(db), new IDP(db));
  const viewController = new ViewFavouritesController(new Favourite(db));

  // #6 Save an IDP to the logged-in customer's favourites
  router.post('/:idpId', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = controller.saveFavourite(user, req.params.idpId);
    res.status(result.success ? 200 : 400).json(result);
  });

  // #6 The ids of the IDPs the logged-in customer saved
  router.get('/', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = controller.getSavedIDPIds(user);
    res.status(result.success ? 200 : 400).json(result);
  });

  // #7 The logged-in customer's favourite IDPs (newest saved first)
  router.get('/idps', (req, res) => {
    const user = userAccount.findById(req.get('X-User-Id'));
    const result = viewController.getFavourites(user);
    res.status(result.success ? 200 : 400).json(result);
  });

  return router;
}

module.exports = favouriteRoutes;