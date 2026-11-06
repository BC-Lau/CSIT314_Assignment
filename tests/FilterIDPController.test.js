// #2 Filter IDPs
// Test ids (F-xx) match the Test Cases document. Test data: tests/idpTestData.js
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const IDP = require('../backend/entity/IDP');
const FilterIDPController = require('../backend/controller/FilterIDPController');
const { buildTestData, sortedIds } = require('./idpTestData');
const { PRESET_TAGS } = require('./helpers');

let db;
let idp;
let controller;

beforeEach(() => {
  ({ db } = buildTestData());
  idp = new IDP(db, () => PRESET_TAGS);
  controller = new FilterIDPController(idp);
});

const filter = (...args) => controller.filterIDPs(...args);
// filterIDPs(minBudget, maxBudget, minHouseSize, maxHouseSize, duration, styleTag)

test('F-01 loadFilterOptions returns only the preset style names', () => {
  assert.deepEqual(controller.loadFilterOptions(), ['Modern', 'Japanese', 'Industrial', 'Wabi Sabi']);
});

test('F-02 filters by budget only', () => {
  const result = filter(10000, 40000, null, null, null, null);
  assert.equal(result.success, true);
  assert.deepEqual(sortedIds(result.idps), [1, 2, 4, 6]);
});

test('F-03 filters by style only', () => {
  assert.deepEqual(sortedIds(filter(null, null, null, null, null, 'Modern').idps), [1, 3]);
});

test('F-04 filters by budget and style together', () => {
  assert.deepEqual(sortedIds(filter(10000, 40000, null, null, null, 'Scandinavian').idps), [2]);
});

test('F-05 filters by house size', () => {
  assert.deepEqual(sortedIds(filter(null, null, 700, 1200, null, null).idps), [1, 2, 6]);
});

test('F-06 filters by duration', () => {
  assert.deepEqual(sortedIds(filter(null, null, null, null, '6 months', null).idps), [2, 3]);
});

test('F-07 filters by all criteria at once', () => {
  assert.deepEqual(sortedIds(filter(10000, 60000, 700, 1600, '6 months', 'Modern').idps), [3]);
});

test('F-08 nothing selected returns every IDP', () => {
  const result = filter(null, null, null, null, null, null);
  assert.equal(result.success, true);
  assert.deepEqual(sortedIds(result.idps), [1, 2, 3, 4, 5, 6]);
});

test('F-08b blank form values (empty strings from the page) count as not selected', () => {
  assert.deepEqual(sortedIds(filter('', '', '', '', '', '').idps), [1, 2, 3, 4, 5, 6]);
});

test('F-09 range ends are inclusive', () => {
  assert.deepEqual(sortedIds(filter(20000, 20000, null, null, null, null).idps), [1]);
});

test('F-10 criteria that match nothing return an empty list (not an error)', () => {
  const result = filter(90000, 100000, null, null, null, null);
  assert.equal(result.success, true);
  assert.deepEqual(result.idps, []);
});

test('F-11 reversed budget range is invalid and no search is made', () => {
  let searched = false;
  idp.findByFilters = () => { searched = true; return []; };
  const result = filter(40000, 10000, null, null, null, null);
  assert.equal(result.success, false);
  assert.equal(result.message, 'Please check your budget and house size ranges');
  assert.deepEqual(result.idps, []);
  assert.equal(searched, false);
});

test('F-12 reversed house size range is invalid', () => {
  const result = filter(null, null, 1500, 800, null, null);
  assert.equal(result.success, false);
  assert.equal(result.message, 'Please check your budget and house size ranges');
});

test('F-13 a blank minimum means no lower limit', () => {
  assert.deepEqual(sortedIds(filter(null, 20000, null, null, null, null).idps), [1, 4]);
});

test('F-14 negative or non-numeric values are invalid', () => {
  assert.equal(filter(-100, 40000, null, null, null, null).success, false);
  assert.equal(filter('abc', null, null, null, null, null).success, false);
  assert.equal(filter(null, null, null, 'big', null, null).success, false);
});

test('F-15 getTagsByType returns names of that category and an empty list for an unknown category', () => {
  assert.equal(idp.getTagsByType('style').length, 4);
  assert.equal(idp.getTagsByType('type').length, 3);
  assert.deepEqual(idp.getTagsByType('colour'), []);
});

test('F-16 validateFilter accepts valid ranges and rejects reversed ones', () => {
  assert.equal(controller.validateFilter(10000, 40000, 700, 1200), true);
  assert.equal(controller.validateFilter(20000, 20000, 800, 800), true);
  assert.equal(controller.validateFilter(null, null, null, null), true);
  assert.equal(controller.validateFilter(40000, 10000, 700, 1200), false);
  assert.equal(controller.validateFilter(10000, 40000, 1500, 800), false);
});

test('F-17 numbers sent as text (from the query string) work the same as numbers', () => {
  assert.deepEqual(sortedIds(filter('10000', '40000', '', '', '', '').idps), [1, 2, 4, 6]);
});

test('F-18 an unknown style or a type name used as style matches nothing', () => {
  assert.deepEqual(filter(null, null, null, null, null, 'Baroque').idps, []);
  assert.deepEqual(filter(null, null, null, null, null, 'Kitchen').idps, []);
});

test('F-19 private IDPs are never shown in the results', () => {
  db.prepare("UPDATE idp SET visibility = 'private' WHERE id IN (2, 4)").run();
  const result = filter('', '', '', '', '', '');
  assert.deepEqual(sortedIds(result.idps), [1, 3, 5, 6]);
});