// #25 Connected customers metric: ContactRequest entity.
// Dates are 'YYYY-MM-DD'; both startDate and endDate are inclusive (whole day).
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const ContactRequest = require('../backend/entity/ContactRequest');
const { createTestDatabase, profileId } = require('./helpers');

let db;
let contactRequest;
let alice; // designer
let bob;   // designer
let c1;
let c2;
let c3;

function addUser(username, profile) {
  return new UserAccount(db).createUserAccount({ username, password: 'pass1234', profileId: profileId(db, profile) });
}

function contact(customerId, designerId, createdAt) {
  db.prepare('INSERT INTO contact_request (customer_id, designer_id, created_at) VALUES (?, ?, ?)')
    .run(customerId, designerId, createdAt);
}

beforeEach(() => {
  db = createTestDatabase();
  contactRequest = new ContactRequest(db);
  alice = addUser('alice', 'Interior Designer');
  bob = addUser('bob', 'Interior Designer');
  c1 = addUser('c1', 'Customer');
  c2 = addUser('c2', 'Customer');
  c3 = addUser('c3', 'Customer');
});

test('countConnectedCustomers returns 0 when there are no contacts', () => {
  assert.equal(contactRequest.countConnectedCustomers('2026-01-01', '2026-12-31'), 0);
});

test('countConnectedCustomers counts each customer once', () => {
  contact(c1, alice, '2026-03-01 10:00:00');
  contact(c1, alice, '2026-03-02 10:00:00'); // same customer again
  contact(c1, bob, '2026-03-03 10:00:00');   // same customer, other designer
  contact(c2, bob, '2026-03-04 10:00:00');
  assert.equal(contactRequest.countConnectedCustomers('2026-03-01', '2026-03-31'), 2);
});

test('countConnectedCustomers only counts contacts inside the date range', () => {
  contact(c1, alice, '2026-02-28 23:59:59'); // day before start
  contact(c2, alice, '2026-03-01 00:00:00'); // first second of start date
  contact(c3, alice, '2026-03-31 23:59:59'); // last second of end date
  contact(c1, bob, '2026-04-01 00:00:00');   // day after end
  assert.equal(contactRequest.countConnectedCustomers('2026-03-01', '2026-03-31'), 2);
});

test('countConnectedCustomers works for a single day', () => {
  contact(c1, alice, '2026-03-15 08:00:00');
  contact(c2, alice, '2026-03-16 08:00:00');
  assert.equal(contactRequest.countConnectedCustomers('2026-03-15', '2026-03-15'), 1);
});

test('countByDesigner returns distinct customers per designer, most first', () => {
  contact(c1, alice, '2026-03-01 10:00:00');
  contact(c1, bob, '2026-03-01 11:00:00');
  contact(c2, bob, '2026-03-02 10:00:00');
  contact(c2, bob, '2026-03-03 10:00:00'); // repeat, still 1 for bob
  assert.deepEqual(contactRequest.countByDesigner('2026-03-01', '2026-03-31'), [
    { designerId: bob, designerName: 'bob', customerCount: 2 },
    { designerId: alice, designerName: 'alice', customerCount: 1 },
  ]);
});

test('countByDesigner ignores contacts outside the date range', () => {
  contact(c1, alice, '2026-02-28 10:00:00');
  contact(c2, bob, '2026-03-10 10:00:00');
  assert.deepEqual(contactRequest.countByDesigner('2026-03-01', '2026-03-31'), [
    { designerId: bob, designerName: 'bob', customerCount: 1 },
  ]);
});

test('countByDesigner returns an empty list when there are no contacts', () => {
  assert.deepEqual(contactRequest.countByDesigner('2026-03-01', '2026-03-31'), []);
});
