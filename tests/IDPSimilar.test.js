// #1 Recommend IDPs
// Tests for IDP.findSimilarIDPs(tagPreferences, favouriteIDPs).
// Finds candidate IDPs that share at least one tag with the customer's favourites, 
// leaves out the IDPs already in favourites list.

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const IDP = require('../backend/entity/IDP');
const { buildTestData, sortedIds } = require('./idpTestData');

let db;
let idp;

beforeEach(() => {
  ({ db } = buildTestData());
  idp = new IDP(db);
});

test('R-04a findSimilarIDPs returns IDPs sharing a preferred tag and leaves out the favourites', () => {
  const preferences = new Map([['Modern', 2], ['Kitchen', 2], ['Living Room', 1], ['Bathroom', 1]]);
  const favourites = [idp.getIDPById(1), idp.getIDPById(3)];
  assert.deepEqual(sortedIds(idp.findSimilarIDPs(preferences, favourites)), [2, 5]);
});

test('R-04b findSimilarIDPs with no preferences returns an empty list', () => {
  assert.deepEqual(idp.findSimilarIDPs(new Map(), [idp.getIDPById(1)]), []);
});

test('R-04c findSimilarIDPs works when there are no favourites to leave out', () => {
  assert.deepEqual(sortedIds(idp.findSimilarIDPs(new Map([['Balcony', 1]]), [])), [6]);
});

test('R-04d findSimilarIDPs leaves out private IDPs', () => {
  db.prepare("UPDATE idp SET visibility = 'private' WHERE id = 2").run();
  const preferences = new Map([['Modern', 2], ['Kitchen', 2], ['Living Room', 1], ['Bathroom', 1]]);
  const favourites = [idp.getIDPById(1), idp.getIDPById(3)];
  assert.deepEqual(sortedIds(idp.findSimilarIDPs(preferences, favourites)), [5]);
});