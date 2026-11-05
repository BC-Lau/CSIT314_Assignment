// #6 Save IDP to favourites
// Tests for the Favourite entity: exists(userId, idpId) and addFavourite(userId, idpId).
// exists tells the controller whether the customer already saved the IDP,
// addFavourite stores the favourite (once per customer and IDP) with the time it was saved.
// Test ids (S-xx) match the Test Cases document. Test data: tests/idpTestData.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Favourite = require('../backend/entity/Favourite');
const { buildTestData, addFavourite, sortedIds } = require('./idpTestData');

let favourite;
let customers;

beforeEach(() => {
  const data = buildTestData();
  customers = data.customers;
  addFavourite(data.db, customers.c1, 1);
  addFavourite(data.db, customers.c1, 3);
  favourite = new Favourite(data.db);
});

test('S-09 exists is true only for a favourite the customer saved', () => {
  assert.equal(favourite.exists(customers.c1, 1), true);
  assert.equal(favourite.exists(customers.c1, 2), false);
  assert.equal(favourite.exists(customers.c2, 1), false); // another customer saved IDP 1, not this one
});

test('S-10 addFavourite saves the IDP so getFavouriteIDPs returns it', () => {
  assert.equal(favourite.addFavourite(customers.c2, 4), true);
  const saved = favourite.getFavouriteIDPs(customers.c2);
  assert.deepEqual(sortedIds(saved), [4]);
});

test('S-11 addFavourite for a pair that already exists returns false and adds no second row', () => {
  assert.equal(favourite.addFavourite(customers.c1, 1), false);
  assert.deepEqual(sortedIds(favourite.getFavouriteIDPs(customers.c1)), [1, 3]);
});

test('S-15 each customer has their own favourites', () => {
  favourite.addFavourite(customers.c1, 5);
  favourite.addFavourite(customers.c3, 5);
  assert.deepEqual(sortedIds(favourite.getFavouriteIDPs(customers.c1)), [1, 3, 5]);
  assert.deepEqual(sortedIds(favourite.getFavouriteIDPs(customers.c3)), [5]);
  assert.deepEqual(favourite.getFavouriteIDPs(customers.c2), []);
});