const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const Tag = require('../backend/entity/Tag');
const IDP = require('../backend/entity/IDP');
const CreateIDPController = require('../backend/controller/CreateIDPController');
const { createTestDatabase, profileId } = require('./helpers');

let userAccount;
let controller;
let designer;
let customer;
let styleName;

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
  customer = userAccount.findById(customerId);
  styleName = 'Modern';
  db.prepare("INSERT INTO tag (name, type) VALUES (?, 'style')").run(styleName);
  const tag = new Tag(db);
  controller = new CreateIDPController(tag, new IDP(db));
});

test('findById returns the subclass for the profile', () => {
  assert.ok(designer instanceof UserAccount.InteriorDesigner);
  assert.ok(customer instanceof UserAccount.Customer);
  assert.ok(customer instanceof UserAccount);
  assert.equal(designer.canCreateIDP(), true);
  assert.equal(customer.canCreateIDP(), false);
});

test('interior designer can create an IDP', () => {
  const result = controller.createIDP(designer, { title: 'Loft', description: 'Open plan', tagNames: [styleName] });
  assert.equal(result.success, true);
  assert.equal(result.idp.designerId, designer.id);
  assert.equal(result.idp.visibility, 'public');
});

test('customer cannot create an IDP', () => {
  const result = controller.createIDP(customer, { title: 'Loft', description: 'Open plan', tagNames: [styleName] });
  assert.equal(result.success, false);
});

test('not logged in cannot create an IDP', () => {
  assert.equal(controller.createIDP(userAccount.findById(undefined), { title: 'x', description: 'y' }).success, false);
});
