// Tests for #1 "As a Customer, I want to be recommended IDPs based on my favourites list".
// Test ids (R-xx) match the Test Cases document. Test data: tests/idpTestData.js
// Favourites: c1 = IDP 1, 3   c2 = none   c3 = IDP 6
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const IDP = require('../backend/entity/IDP');
const Favourite = require('../backend/entity/Favourite');
const RecommendIDPController = require('../backend/controller/RecommendIDPController');
const { buildTestData, addFavourite } = require('./idpTestData');

let db;
let customers;
let idp;
let favourite;
let controller;

beforeEach(() => {
  ({ db, customers } = buildTestData());
  addFavourite(db, customers.c1, 1);
  addFavourite(db, customers.c1, 3);
  addFavourite(db, customers.c3, 6);
  idp = new IDP(db);
  favourite = new Favourite(db);
  controller = new RecommendIDPController(favourite, idp);
});

const ids = (idps) => idps.map((i) => i.id);

test('R-01 recommends similar IDPs, best match first, and never a favourite', () => {
  const result = controller.getRecommendations(customers.c1);
  assert.equal(result.success, true);
  assert.equal(result.hasFavourites, true);
  assert.deepEqual(ids(result.idps), [5, 2]); // IDP 4 and 6 share no tag, IDP 1 and 3 are favourites
});

test('R-03 getPreferredTags counts how often each tag appears in the favourites', () => {
  const preferences = controller.getPreferredTags(favourite.getFavouriteIDPs(customers.c1));
  assert.deepEqual(Object.fromEntries(preferences), { Modern: 2, Kitchen: 2, 'Living Room': 1, Bathroom: 1 });
});

test('R-05 rankBySimilarity puts the IDP with the heavier shared tags first', () => {
  const preferences = new Map([['Modern', 2], ['Kitchen', 2], ['Living Room', 1], ['Bathroom', 1]]);
  const candidates = [idp.getIDPById(2), idp.getIDPById(5)];
  // IDP 5 scores Kitchen 2 + Living Room 1 = 3, IDP 2 scores Living Room 1
  assert.deepEqual(ids(controller.rankBySimilarity(candidates, preferences)), [5, 2]);
});

test('R-06 keeps only the top maxRecommendations IDPs', () => {
  const small = new RecommendIDPController(favourite, idp, { maxRecommendations: 1 });
  assert.deepEqual(ids(small.getRecommendations(customers.c1).idps), [5]);
});

test('R-07 a customer with no favourites gets no recommendations and the search is skipped', () => {
  let searched = false;
  idp.findSimilarIDPs = () => { searched = true; return []; };
  const result = controller.getRecommendations(customers.c2);
  assert.equal(result.success, true);
  assert.equal(result.hasFavourites, false);
  assert.deepEqual(result.idps, []);
  assert.equal(searched, false);
});

test('R-08 favourites that no other IDP resembles give an empty list', () => {
  const result = controller.getRecommendations(customers.c3); // IDP 6 = Minimalism + Balcony, shared by no other IDP
  assert.equal(result.success, true);
  assert.equal(result.hasFavourites, true);
  assert.deepEqual(result.idps, []);
});

test('R-09 an unknown user id is treated as having no favourites', () => {
  const result = controller.getRecommendations(999);
  assert.equal(result.success, true);
  assert.equal(result.hasFavourites, false);
  assert.deepEqual(result.idps, []);
});

test('R-10 getPreferredTags of an empty list is an empty map', () => {
  assert.equal(controller.getPreferredTags([]).size, 0);
});

test('R-11 IDPs with the same score are ordered newest first', () => {
  addFavourite(db, customers.c2, 4); // IDP 4 = Industrial + Bedroom; IDP 2 and IDP 5 both share only Bedroom
  const setCreated = (id, when) => db.prepare('UPDATE idp SET created_at = ? WHERE id = ?').run(when, id);

  setCreated(2, '2026-01-01 00:00:00');
  setCreated(5, '2026-02-01 00:00:00');
  assert.deepEqual(ids(controller.getRecommendations(customers.c2).idps), [5, 2]);

  setCreated(2, '2026-03-01 00:00:00');
  assert.deepEqual(ids(controller.getRecommendations(customers.c2).idps), [2, 5]);
});
