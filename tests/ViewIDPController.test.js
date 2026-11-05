const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const IDP = require('../backend/entity/IDP');
const ViewIDPController = require('../backend/controller/ViewIDPController');
const ViewMyIDPsController = require('../backend/controller/ViewMyIDPsController');
const { createTestDatabase, profileId, PRESET_TAGS } = require('./helpers');

let viewIDP;
let viewMyIDPs;
let designer;
let otherDesigner;
let customer;
let publicIDP;
let privateIDP;

const IDP_DATA = {
  title: 'Loft', description: 'Open plan', budget: 50000, houseSize: 900, duration: '8 weeks', style: 'Modern', type: ['Kitchen'],
};

beforeEach(() => {
  const db = createTestDatabase();
  const userAccount = new UserAccount(db);
  const newUser = (username, profile) =>
    userAccount.findById(userAccount.createUserAccount({ username, password: 'pass1234', profileId: profileId(db, profile) }));
  designer = newUser('designer1', 'Interior Designer');
  otherDesigner = newUser('designer2', 'Interior Designer');
  customer = newUser('cust1', 'Customer');

  const idp = new IDP(db, () => PRESET_TAGS);
  publicIDP = idp.createIDP(designer.id, { ...IDP_DATA, visibility: 'public' });
  privateIDP = idp.createIDP(designer.id, { ...IDP_DATA, title: 'Secret', visibility: 'private' });
  idp.createIDP(otherDesigner.id, { ...IDP_DATA, title: 'Not mine', visibility: 'public' });

  viewIDP = new ViewIDPController(idp);
  viewMyIDPs = new ViewMyIDPsController(idp);
});

test('anyone can view a public IDP, even when not logged in', () => {
  const result = viewIDP.viewIDP(null, publicIDP.id);
  assert.equal(result.success, true);
  assert.equal(result.idp.title, 'Loft');
  assert.equal(result.isOwner, false);
});

test('the owner can view their private IDP', () => {
  assert.deepEqual(viewIDP.viewIDP(designer, privateIDP.id), { success: true, idp: privateIDP, isOwner: true });
});

test('other users cannot view a private IDP', () => {
  for (const user of [null, customer, otherDesigner]) {
    assert.deepEqual(viewIDP.viewIDP(user, privateIDP.id), { success: false, message: 'IDP not found' });
  }
});

test('unknown IDP id returns IDP not found', () => {
  assert.deepEqual(viewIDP.viewIDP(customer, 9999), { success: false, message: 'IDP not found' });
});

test('designer sees only their own IDPs, public and private', () => {
  const result = viewMyIDPs.getMyIDPs(designer);
  assert.equal(result.success, true);
  assert.deepEqual(result.idps.map((i) => i.title).sort(), ['Loft', 'Secret']);
});

test('customer or not logged in cannot view My IDPs', () => {
  for (const user of [null, customer]) {
    assert.equal(viewMyIDPs.getMyIDPs(user).success, false);
  }
});
