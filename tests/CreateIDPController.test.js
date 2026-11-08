const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const IDP = require('../backend/entity/IDP');
const CreateIDPController = require('../backend/controller/CreateIDPController');
const { createTestDatabase, profileId, PRESET_TAGS } = require('./helpers');

let userAccount;
let idp;
let controller;
let designer;
let customer;

const VALID = { title: 'Loft', description: 'Open plan', style: 'Modern', type: ['Kitchen', 'Bedroom'] };
const INVALID_TAGS = 'Invalid tags: need exactly 1 style';

beforeEach(() => {
  const db = createTestDatabase();
  userAccount = new UserAccount(db);
  const designerId = userAccount.createUserAccount({
    username: 'designer1', password: 'pass1234', profileId: profileId(db, 'Interior Designer'),
  });
  const customerId = userAccount.createUserAccount({
    username: 'cust1', password: 'pass1234', profileId: profileId(db, 'Customer'),
  });
  designer = userAccount.findById(designerId);
  designer.setVerifiedStatus(true);
  customer = userAccount.findById(customerId);
  idp = new IDP(db, () => PRESET_TAGS);
  controller = new CreateIDPController(idp);
});

test('findById returns the subclass for the profile', () => {
  assert.ok(designer instanceof UserAccount.InteriorDesigner);
  assert.ok(customer instanceof UserAccount.Customer);
  assert.ok(customer instanceof UserAccount);
  assert.equal(designer.canCreateIDP(), true);
  assert.equal(customer.canCreateIDP(), false);
});

test('getTagOptions returns the style names and the type names', () => {
  assert.deepEqual(controller.getTagOptions(), {
    styles: ['Modern', 'Japanese', 'Industrial', 'Wabi Sabi'],
    types: ['Kitchen', 'Bedroom', 'Bar Counter'],
  });
});

test('interior designer can create an IDP with a style and types', () => {
  const result = controller.createIDP(designer, VALID);
  assert.equal(result.success, true);
  assert.equal(result.idp.designerId, designer.id);
  assert.equal(result.idp.visibility, 'public');
  assert.equal(result.idp.style, 'Modern');
  assert.deepEqual(idp.getIDPById(result.idp.id).type, ['Kitchen', 'Bedroom']); // read back as a list
});

test('unverified designer cannot publish an IDP', () => {
  designer.setVerifiedStatus(false);
  assert.deepEqual(controller.createIDP(designer, VALID), {
    success: false,
    statusCode: 403,
    message: 'Only verified Interior Designers can interact with customers or publish IDPs.'
  });
});

test('at least 1 type is required and duplicates are removed', () => {
  for (const type of [undefined, []]) {
    assert.deepEqual(controller.createIDP(designer, { ...VALID, type }), { success: false, message: 'Please choose at least 1 room type' });
  }
  assert.deepEqual(controller.createIDP(designer, { ...VALID, type: ['Kitchen', 'Kitchen'] }).idp.type, ['Kitchen']);
});

test('customer cannot create an IDP', () => {
  assert.equal(controller.createIDP(customer, VALID).success, false);
});

test('not logged in cannot create an IDP', () => {
  assert.equal(controller.createIDP(userAccount.findById(undefined), VALID).success, false);
});

test('rejects a missing or unknown style', () => {
  for (const style of [undefined, '', 'Gothic', 'Kitchen']) {
    assert.deepEqual(controller.createIDP(designer, { ...VALID, style }), { success: false, message: INVALID_TAGS }, `style: ${style}`);
  }
});

test('rejects unknown types or types that are not a list', () => {
  for (const type of [['Garden'], ['Kitchen', 'Modern'], 'Kitchen', 42]) {
    assert.deepEqual(controller.createIDP(designer, { ...VALID, type }), { success: false, message: INVALID_TAGS }, `type: ${type}`);
  }
});
