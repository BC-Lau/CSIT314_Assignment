// Entity tests for the IDP queries added for #2 (findByFilters) and #1 (findSimilarIDPs).
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

test('findByFilters with no criteria returns every IDP, newest first', () => {
  const result = idp.findByFilters(null, null, null, null, null, null);
  assert.deepEqual(sortedIds(result), [1, 2, 3, 4, 5, 6]);
});

test('findByFilters returns IDPs with their style and room tags', () => {
  const [first] = idp.findByFilters(null, null, null, null, null, 'Scandinavian').sort((a, b) => a.id - b.id);
  assert.equal(first.id, 2);
  assert.equal(first.style, 'Scandinavian');
  assert.deepEqual([...first.rooms].sort(), ['Bedroom', 'Living Room']);
});

test('findByFilters treats a malicious duration as plain text (no SQL injection)', () => {
  const result = idp.findByFilters(null, null, null, null, "'; DROP TABLE idp; --", null);
  assert.deepEqual(result, []);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM idp').get().n, 6);
});

test('findSimilarIDPs returns IDPs sharing a preferred tag and leaves out the favourites', () => {
  const preferences = new Map([['Modern', 2], ['Kitchen', 2], ['Living Room', 1], ['Bathroom', 1]]);
  const favourites = [idp.getIDPById(1), idp.getIDPById(3)];
  assert.deepEqual(sortedIds(idp.findSimilarIDPs(preferences, favourites)), [2, 5]);
});

test('findSimilarIDPs with no preferences returns an empty list', () => {
  assert.deepEqual(idp.findSimilarIDPs(new Map(), [idp.getIDPById(1)]), []);
});

test('findSimilarIDPs works when there are no favourites to leave out', () => {
  assert.deepEqual(sortedIds(idp.findSimilarIDPs(new Map([['Balcony', 1]]), [])), [6]);
});
