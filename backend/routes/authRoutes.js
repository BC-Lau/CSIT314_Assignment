// HTTP layer: receives requests from the boundary (web page) and forwards to controllers.
const express = require('express');
const UserAccount = require('../entity/UserAccount');
const LoginController = require('../controller/LoginController');

function authRoutes(db) {
  const router = express.Router();
  const loginController = new LoginController(new UserAccount(db));

  // #11 Login. The browser keeps the returned account and sends its id (X-User-Id) on later requests.
  router.post('/login', (req, res) => {
    const { username, password } = req.body ?? {};
    const result = loginController.login(username, password);
    res.status(result.success ? 200 : 401).json(result);
  });

  return router;
}

module.exports = authRoutes;
