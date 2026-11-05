// CONTROLLER: #25 connected-customers metric for the Platform Manager.
// "Today" is faked as 2026-03-31, so the results do not change with the real date.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const ContactRequest = require('../backend/entity/ContactRequest');
const ConnectedCustomersController = require('../backend/controller/ConnectedCustomersController');
const { createTestDatabase, profileId } = require('./helpers');

const TODAY = '2026-03-31';

let db;
let controller;
let alice; // designer
let c1;
let c2;
let manager; // the logged-in Platform Manager (a UserAccount subclass)

function addUser(username, profile) {
  return new UserAccount(db).createUserAccount({ username, password: 'pass1234', profileId: profileId(db, profile) });
}

function contact(customerId, designerId, createdAt) {
  db.prepare('INSERT INTO contact_request (customer_id, designer_id, created_at) VALUES (?, ?, ?)')
    .run(customerId, designerId, createdAt);
}

beforeEach(() => {
  db = createTestDatabase();
  controller = new ConnectedCustomersController(new ContactRequest(db), () => TODAY);
  alice = addUser('alice', 'Interior Designer');
  c1 = addUser('c1', 'Customer');
  c2 = addUser('c2', 'Customer');
  manager = new UserAccount(db).findById(addUser('boss', 'Platform Manager'));
});

test('returns the total and the per-designer counts for the date range', () => {
  contact(c1, alice, '2026-03-01 10:00:00');
  contact(c1, alice, '2026-03-02 10:00:00'); // same customer again
  contact(c2, alice, '2026-03-03 10:00:00');
  assert.deepEqual(controller.getConnectedCustomers(manager, '2026-03-01', '2026-03-31'), {
    success: true,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    total: 2,
    byDesigner: [{ designerId: alice, designerName: 'alice', customerCount: 2 }],
  });
});

test('uses the last 30 days when no dates are given', () => {
  contact(c1, alice, '2026-03-01 23:59:59'); // 31 days ago: outside
  contact(c2, alice, '2026-03-02 00:00:00'); // 30th day: inside
  const result = controller.getConnectedCustomers(manager);
  assert.equal(result.startDate, '2026-03-02');
  assert.equal(result.endDate, TODAY);
  assert.equal(result.total, 1);
});

test('returns 0 and a message when there are no contacts in the period', () => {
  assert.deepEqual(controller.getConnectedCustomers(manager, '2026-03-01', '2026-03-31'), {
    success: true,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    total: 0,
    byDesigner: [],
    message: 'No contacts in this period',
  });
});

test('rejects a start date after the end date', () => {
  assert.deepEqual(controller.getConnectedCustomers(manager, '2026-03-10', '2026-03-01'), {
    success: false,
    message: 'Start date must be before end date',
  });
});

test('counts only up to today when the end date is in the future', () => {
  contact(c1, alice, '2026-03-15 10:00:00');
  const result = controller.getConnectedCustomers(manager, '2026-03-01', '2026-12-31');
  assert.equal(result.endDate, TODAY);
  assert.equal(result.total, 1);
});

test('rejects dates that are not real YYYY-MM-DD dates', () => {
  for (const bad of ['abc', '2026/03/01', '2026-02-30']) {
    assert.deepEqual(controller.getConnectedCustomers(manager, bad, '2026-03-31'), {
      success: false,
      message: 'Dates must be in YYYY-MM-DD format',
    });
  }
});

test('only a Platform Manager can view the metric', () => {
  const users = new UserAccount(db);
  for (const user of [null, users.findById(alice), users.findById(c1)]) {
    assert.deepEqual(controller.getConnectedCustomers(user, '2026-03-01', '2026-03-31'), {
      success: false,
      message: 'Only platform managers can view metrics',
    });
  }
});
