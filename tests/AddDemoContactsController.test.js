// CONTROLLER: demo tool on the #25 Metrics page — add contacts for a designer on a date.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const ContactRequest = require('../backend/entity/ContactRequest');
const AddDemoContactsController = require('../backend/controller/AddDemoContactsController');
const { createTestDatabase, profileId } = require('./helpers');

let db;
let controller;
let alice; // designer
let manager;

function addUser(username, profile) {
  return new UserAccount(db).createUserAccount({ username, password: 'pass1234', profileId: profileId(db, profile) });
}

beforeEach(() => {
  db = createTestDatabase();
  controller = new AddDemoContactsController(new ContactRequest(db));
  alice = addUser('alice', 'Interior Designer');
  for (const name of ['c1', 'c2', 'c3']) addUser(name, 'Customer');
  manager = new UserAccount(db).findById(addUser('boss', 'Platform Manager'));
});

test('adds contacts from different customers on the chosen date', () => {
  const result = controller.addDemoContacts(manager, alice, '2026-03-15', 2);
  assert.deepEqual(result, { success: true, added: 2, message: 'Added 2 contacts on 2026-03-15' });
  assert.equal(new ContactRequest(db).countConnectedCustomers('2026-03-15', '2026-03-15'), 2);
});

test('cannot add more contacts than there are customers', () => {
  assert.equal(controller.addDemoContacts(manager, alice, '2026-03-15', 10).added, 3);
});

test('rejects a missing designer, a bad date or a bad count', () => {
  assert.equal(controller.addDemoContacts(manager, '', '2026-03-15', 1).message, 'Please choose a designer');
  assert.equal(controller.addDemoContacts(manager, alice, '2026-02-30', 1).message, 'Dates must be in YYYY-MM-DD format');
  assert.equal(controller.addDemoContacts(manager, alice, '2026-03-15', 0).message, 'Count must be between 1 and 100');
});

test('only a Platform Manager can add demo contacts', () => {
  const designer = new UserAccount(db).findById(alice);
  assert.equal(controller.addDemoContacts(designer, alice, '2026-03-15', 1).success, false);
});
