// #2 Filter IDPs
// Tests for IDP.findByFilters
// Test data: tests/idpTestData.js
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

test('F-20a findByFilters with no criteria returns every IDP', () => {
  const result = idp.findByFilters(null, null, null, null, null, null);
  assert.deepEqual(sortedIds(result), [1, 2, 3, 4, 5, 6]);
});

test('F-20b findByFilters returns IDPs with their style and types', () => {
  const [first] = idp.findByFilters(null, null, null, null, null, 'Scandinavian').sort((a, b) => a.id - b.id);
  assert.equal(first.id, 2);
  assert.equal(first.style, 'Scandinavian');
  assert.deepEqual([...first.type].sort(), ['Bedroom', 'Living Room']);
});

test('F-20c findByFilters treats a malicious duration as plain text (no SQL injection)', () => {
  const result = idp.findByFilters(null, null, null, null, "'; DROP TABLE idp; --", null);
  assert.deepEqual(result, []);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM idp').get().n, 6);
});

test('F-20d findByFilters leaves out private IDPs', () => {
  db.prepare("UPDATE idp SET visibility = 'private' WHERE id IN (1, 4)").run();
  assert.deepEqual(sortedIds(idp.findByFilters(null, null, null, null, null, null)), [2, 3, 5, 6]);
});