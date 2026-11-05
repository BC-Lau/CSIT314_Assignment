const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const IDP = require('../backend/entity/IDP');
const DeleteIDPController = require('../backend/controller/DeleteIDPController');
const { createTestDatabase, profileId, PRESET_TAGS } = require('./helpers');

let db;
let idp;
let deleteIDP;
let designer;
let otherDesigner;
let customer;
let myIDP;

const IDP_DATA = {
  title: 'Loft', description: 'Open plan', budget: 50000, houseSize: 900, duration: '8 weeks', visibility: 'public', style: 'Modern', type: ['Kitchen'],
};

beforeEach(() => {
  db = createTestDatabase();
  const userAccount = new UserAccount(db);
  const newUser = (username, profile) =>
    userAccount.findById(userAccount.createUserAccount({ username, password: 'pass1234', profileId: profileId(db, profile) }));
  designer = newUser('designer1', 'Interior Designer');
  otherDesigner = newUser('designer2', 'Interior Designer');
  customer = newUser('cust1', 'Customer');

  idp = new IDP(db, () => PRESET_TAGS);
  myIDP = idp.createIDP(designer.id, IDP_DATA);
  deleteIDP = new DeleteIDPController(idp);
});

test('designer can delete their own IDP', () => {
  assert.deepEqual(deleteIDP.deleteIDP(designer, myIDP.id), { success: true });
  assert.equal(idp.getIDPById(myIDP.id), null);
});

test('deleting an IDP that has favourites and contact requests still works', () => {
  db.prepare('INSERT INTO favourite (user_id, idp_id) VALUES (?, ?)').run(customer.id, myIDP.id);
  db.prepare('INSERT INTO contact_request (customer_id, designer_id, idp_id) VALUES (?, ?, ?)').run(customer.id, designer.id, myIDP.id);
  assert.equal(deleteIDP.deleteIDP(designer, myIDP.id).success, true);
  assert.equal(idp.getIDPById(myIDP.id), null);
});

test('another designer cannot delete my IDP', () => {
  assert.deepEqual(deleteIDP.deleteIDP(otherDesigner, myIDP.id), { success: false, message: 'IDP not found' });
  assert.notEqual(idp.getIDPById(myIDP.id), null);
});

test('customer or not logged in cannot delete IDPs', () => {
  for (const user of [null, customer]) {
    assert.deepEqual(deleteIDP.deleteIDP(user, myIDP.id), { success: false, message: 'Only interior designers can delete IDPs' });
  }
});

test('unknown IDP id returns IDP not found', () => {
  assert.deepEqual(deleteIDP.deleteIDP(designer, 9999), { success: false, message: 'IDP not found' });
});
