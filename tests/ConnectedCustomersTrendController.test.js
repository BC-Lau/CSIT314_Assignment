// CONTROLLER: #25 extra — connected customers over time (total + top 10 designers).
// "Today" is faked as 2026-03-31, so the results do not change with the real date.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const ContactRequest = require('../backend/entity/ContactRequest');
const ConnectedCustomersTrendController = require('../backend/controller/ConnectedCustomersTrendController');
const { createTestDatabase, profileId } = require('./helpers');

const TODAY = '2026-03-31';

let db;
let controller;
let alice; // designer
let c1;
let c2;
let manager;

function addUser(username, profile) {
  return new UserAccount(db).createUserAccount({ username, password: 'pass1234', profileId: profileId(db, profile) });
}

function contact(customerId, designerId, createdAt) {
  db.prepare('INSERT INTO contact_request (customer_id, designer_id, created_at) VALUES (?, ?, ?)')
    .run(customerId, designerId, createdAt);
}

beforeEach(() => {
  db = createTestDatabase();
  controller = new ConnectedCustomersTrendController(new ContactRequest(db), () => TODAY);
  alice = addUser('alice', 'Interior Designer');
  c1 = addUser('c1', 'Customer');
  c2 = addUser('c2', 'Customer');
  manager = new UserAccount(db).findById(addUser('boss', 'Platform Manager'));
});

test('day range: last 30 days, one number per day, empty days are 0', () => {
  contact(c1, alice, '2026-03-30 09:00:00');
  contact(c1, alice, '2026-03-30 10:00:00'); // same customer, same day: counted once
  contact(c2, alice, '2026-03-31 10:00:00');
  const result = controller.getConnectedCustomersTrend(manager, 'day');
  assert.equal(result.unit, 'day');
  assert.equal(result.periods.length, 30);
  assert.equal(result.periods[0], '2026-03-02');
  assert.deepEqual(result.total.slice(-3), [0, 1, 1]);
  assert.deepEqual(result.designers, [{ designerName: 'alice', counts: result.total }]);
});

test('month range has 18 months and year range has 5 years', () => {
  contact(c1, alice, '2024-10-05 10:00:00');
  const months = controller.getConnectedCustomersTrend(manager, 'month');
  assert.equal(months.periods.length, 18);
  assert.equal(months.periods[0], '2024-10');
  assert.equal(months.total[0], 1);
  const years = controller.getConnectedCustomersTrend(manager, 'year');
  assert.deepEqual(years.periods, ['2022', '2023', '2024', '2025', '2026']);
  assert.deepEqual(years.total, [0, 0, 1, 0, 0]);
});

test('shows only the top 10 designers, most customers first', () => {
  for (let i = 1; i <= 11; i++) {
    const designer = addUser(`d${i}`, 'Interior Designer');
    contact(c1, designer, '2026-03-10 10:00:00');
    if (i <= 10) contact(c2, designer, '2026-03-11 10:00:00'); // d11 has only 1 customer
  }
  const result = controller.getConnectedCustomersTrend(manager, 'day');
  assert.equal(result.designers.length, 10);
  assert.ok(!result.designers.some((d) => d.designerName === 'd11'));
});

test('custom range: up to 31 days by day, longer by month', () => {
  assert.equal(controller.getConnectedCustomersTrend(manager, 'custom', '2026-03-01', '2026-03-31').unit, 'day');
  const longer = controller.getConnectedCustomersTrend(manager, 'custom', '2026-01-01', '2026-03-31');
  assert.equal(longer.unit, 'month');
  assert.deepEqual(longer.periods, ['2026-01', '2026-02', '2026-03']);
  assert.equal(longer.message, 'No contacts in this period');
});

test('custom range: rejects start after end and ranges longer than 2 years', () => {
  assert.equal(controller.getConnectedCustomersTrend(manager, 'custom', '2026-03-10', '2026-03-01').message,
    'Start date must be before end date');
  assert.equal(controller.getConnectedCustomersTrend(manager, 'custom', '2024-03-30', '2026-03-31').message,
    'The date range cannot be longer than 2 years');
  assert.equal(controller.getConnectedCustomersTrend(manager, 'custom', '2024-03-31', '2026-03-31').success, true);
});

test('only a Platform Manager can view the trend', () => {
  const designer = new UserAccount(db).findById(alice);
  assert.deepEqual(controller.getConnectedCustomersTrend(designer, 'day'), {
    success: false,
    message: 'Only platform managers can view metrics',
  });
});
