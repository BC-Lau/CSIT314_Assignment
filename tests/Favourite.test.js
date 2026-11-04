// #1 Recommend IDPs
// Tests for the Favourite entity: getFavouriteIDPs(userId).
// Returns the IDPs a customer has saved to their favourites list,
// to find out what the customer likes before searching for similar IDPs.
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
  addFavourite(data.db, customers.c3, 6);
  favourite = new Favourite(data.db);
});

test('R-02 getFavouriteIDPs returns the IDPs the customer saved, with their tags', () => {
  const result = favourite.getFavouriteIDPs(customers.c1);
  assert.deepEqual(sortedIds(result), [1, 3]);
  const first = result.find((i) => i.id === 1);
  assert.equal(first.style, 'Modern');
  assert.deepEqual([...first.rooms].sort(), ['Kitchen', 'Living Room']);
});

test('getFavouriteIDPs only returns that customer\'s favourites', () => {
  assert.deepEqual(sortedIds(favourite.getFavouriteIDPs(customers.c3)), [6]);
});

test('getFavouriteIDPs returns an empty list for a customer with no favourites', () => {
  assert.deepEqual(favourite.getFavouriteIDPs(customers.c2), []);
});

test('getFavouriteIDPs returns an empty list for an unknown user id', () => {
  assert.deepEqual(favourite.getFavouriteIDPs(999), []);
});