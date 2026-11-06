// #7 View my IDP favourite list
// Tests for the permission and for ViewFavouritesController.getFavourites(user).
// A customer sees the public IDPs they saved, newest saved first, with the details they
// need to compare them (budget, size, duration, style, types). Only a customer may see this.
// Test ids (V-xx) match the Test Cases document. Test data: tests/idpTestData.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const IDP = require('../backend/entity/IDP');
const Favourite = require('../backend/entity/Favourite');
const SaveFavouriteController = require('../backend/controller/SaveFavouriteController');
const ViewFavouritesController = require('../backend/controller/ViewFavouritesController');
const { buildTestData, addFavourite, userOf } = require('./idpTestData');

let db;
let customers;
let designerId;
let controller;

beforeEach(() => {
  ({ db, customers, designerId } = buildTestData());
  controller = new ViewFavouritesController(new Favourite(db));
  addFavourite(db, customers.c1, 1); // customer 1 saved IDP 1 and 3
  addFavourite(db, customers.c1, 3);
  addFavourite(db, customers.c3, 6); // customer 3 saved IDP 6
});

const idsFor = (userId) => controller.getFavourites(userOf(db, userId)).idps.map((idp) => idp.id);

test('V-01 a customer sees the IDPs they saved', () => {
  const result = controller.getFavourites(userOf(db, customers.c1));
  assert.equal(result.success, true);
  assert.deepEqual(idsFor(customers.c1).sort((a, b) => a - b), [1, 3]);
});

test('V-02 the most recently saved IDP comes first', () => {
  const save = db.prepare('INSERT INTO favourite (user_id, idp_id, saved_at) VALUES (?, ?, ?)');
  save.run(customers.c2, 2, '2026-01-01 10:00:00');
  save.run(customers.c2, 4, '2026-03-01 10:00:00');
  save.run(customers.c2, 5, '2026-02-01 10:00:00');
  assert.deepEqual(idsFor(customers.c2), [4, 5, 2]);
});

test('V-03 a customer with no favourites gets an empty list, not an error', () => {
  assert.deepEqual(controller.getFavourites(userOf(db, customers.c2)), { success: true, idps: [] });
});

test('V-04 each customer sees only their own favourites', () => {
  assert.deepEqual(idsFor(customers.c3), [6]);
  assert.equal(idsFor(customers.c1).includes(6), false);
});

test('V-05 an IDP that was set to private after it was saved is not shown', () => {
  db.prepare("UPDATE idp SET visibility = 'private' WHERE id = 3").run();
  assert.deepEqual(idsFor(customers.c1), [1]);
});

test('V-06 each IDP has the details needed to compare them', () => {
  const idp = controller.getFavourites(userOf(db, customers.c3)).idps[0];
  for (const field of ['title', 'designerName', 'budget', 'houseSize', 'duration', 'style', 'type']) {
    assert.notEqual(idp[field], undefined, `missing ${field}`);
  }
  assert.equal(Array.isArray(idp.type), true);
});

test('V-07 an interior designer cannot view favourites', () => {
  const result = controller.getFavourites(userOf(db, designerId));
  assert.deepEqual(result, { success: false, message: 'Only customers can view favourites' });
});

test('V-08 nobody logged in cannot view favourites', () => {
  assert.deepEqual(controller.getFavourites(null), { success: false, message: 'Only customers can view favourites' });
});

test('V-09 only a customer can view favourites', () => {
  assert.equal(userOf(db, customers.c1).canViewFavourites(), true);
  assert.equal(userOf(db, designerId).canViewFavourites(), false);
  assert.equal(new UserAccount(db).canViewFavourites(), false); // not allowed by default
});

test('V-10 an IDP saved with Story #6 appears in the list', () => {
  const save = new SaveFavouriteController(new Favourite(db), new IDP(db));
  save.saveFavourite(userOf(db, customers.c2), 2);
  assert.deepEqual(idsFor(customers.c2), [2]);
});