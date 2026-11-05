// #6 Save IDP to favourites
// Tests for the permission and for SaveFavouriteController saveFavourite(user, idpId).
// Only a customer may save, and only a public IDP that exists. 
// If a customer tries to save the same IDP twice, 
// nothing is added and the customer is told it is already saved.
// Test ids (S-xx) match the Test Cases document. Test data: tests/idpTestData.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const IDP = require('../backend/entity/IDP');
const Favourite = require('../backend/entity/Favourite');
const SaveFavouriteController = require('../backend/controller/SaveFavouriteController');
const RecommendIDPController = require('../backend/controller/RecommendIDPController');
const { buildTestData, userOf, sortedIds } = require('./idpTestData');

let db;
let customers;
let designerId;
let idp;
let favourite;
let controller;

beforeEach(() => {
  ({ db, customers, designerId } = buildTestData());
  idp = new IDP(db);
  favourite = new Favourite(db);
  controller = new SaveFavouriteController(favourite, idp);
  favourite.addFavourite(customers.c1, 1); // customer 1 already saved IDP 1 and 3
  favourite.addFavourite(customers.c1, 3);
});

const savedBy = (userId) => sortedIds(favourite.getFavouriteIDPs(userId));

test('S-01 a customer saves an IDP and it appears in their favourites', () => {
  const result = controller.saveFavourite(userOf(db, customers.c2), 2);
  assert.equal(result.success, true);
  assert.equal(result.alreadySaved, false);
  assert.deepEqual(savedBy(customers.c2), [2]);
});

test('S-02 saving another IDP keeps the existing favourites', () => {
  controller.saveFavourite(userOf(db, customers.c1), 5);
  assert.deepEqual(savedBy(customers.c1), [1, 3, 5]);
});

test('S-03 saving an IDP that is already a favourite adds nothing and says so', () => {
  const result = controller.saveFavourite(userOf(db, customers.c1), 1);
  assert.equal(result.success, true);
  assert.equal(result.alreadySaved, true);
  assert.equal(result.message, 'Already in your favourites');
  assert.deepEqual(savedBy(customers.c1), [1, 3]);
});

test('S-04 an IDP that does not exist is refused and nothing is saved', () => {
  const result = controller.saveFavourite(userOf(db, customers.c1), 999);
  assert.deepEqual(result, { success: false, message: 'IDP not found' });
  assert.deepEqual(savedBy(customers.c1), [1, 3]);
});

test('S-05 a private IDP cannot be saved', () => {
  db.prepare("UPDATE idp SET visibility = 'private' WHERE id = 2").run();
  const result = controller.saveFavourite(userOf(db, customers.c2), 2);
  assert.deepEqual(result, { success: false, message: 'IDP not found' });
  assert.deepEqual(savedBy(customers.c2), []);
});

test('S-06 an interior designer cannot save favourites', () => {
  const result = controller.saveFavourite(userOf(db, designerId), 1);
  assert.deepEqual(result, { success: false, message: 'Only customers can save favourites' });
  assert.deepEqual(savedBy(designerId), []);
});

test('S-07 nobody logged in cannot save favourites', () => {
  const result = controller.saveFavourite(null, 1);
  assert.deepEqual(result, { success: false, message: 'Only customers can save favourites' });
});

test('S-08 the IDP id can arrive as text, as it does in a URL', () => {
  const customer = userOf(db, customers.c2);
  assert.equal(controller.saveFavourite(customer, 'abc').message, 'IDP not found');
  assert.equal(controller.saveFavourite(customer, '5').success, true);
  assert.deepEqual(savedBy(customers.c2), [5]);
});

test('S-12 getIDPById returns the IDP with its style and types, or null', () => {
  assert.deepEqual(idp.getIDPById(2).type, ['Bedroom', 'Living Room']);
  assert.equal(idp.getIDPById(999), null);
});

test('S-13 only a customer can save favourites', () => {
  assert.equal(userOf(db, customers.c1).canSaveFavourite(), true);
  assert.equal(userOf(db, designerId).canSaveFavourite(), false);
  assert.equal(new UserAccount(db).canSaveFavourite(), false); // not allowed by default
});

test('S-14 a saved IDP feeds Story #1: the customer gets recommendations afterwards', () => {
  const recommend = new RecommendIDPController(favourite, idp);
  const customer = userOf(db, customers.c2);
  assert.equal(recommend.getRecommendations(customer).hasFavourites, false);
  controller.saveFavourite(customer, 4); // IDP 4: Industrial, Bedroom
  const result = recommend.getRecommendations(customer);
  assert.equal(result.hasFavourites, true);
  assert.deepEqual(sortedIds(result.idps), [2, 5]); // both share Bedroom; IDP 4 itself is not recommended
});