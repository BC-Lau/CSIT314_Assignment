const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const { createTestDatabase, profileId } = require('./helpers');

let db;
let userAccount;

beforeEach(() => {
  db = createTestDatabase();
  userAccount = new UserAccount(db);
  userAccount.createUserAccount({
    username: 'hsu',
    password: 'secret123',
    email: 'hsu@example.com',
    profileId: profileId(db, 'Customer'),
  });
});

test('password is not stored in plain text', () => {
  const row = userAccount.findByUsername('hsu');
  assert.notEqual(row.password_hash, 'secret123');
});

test('login succeeds with correct password', () => {
  const account = userAccount.login('hsu', 'secret123');
  assert.equal(account.username, 'hsu');
  assert.equal(account.profile, 'Customer');
  assert.equal(account.password_hash, undefined);
});

test('login fails with wrong password', () => {
  assert.equal(userAccount.login('hsu', 'wrong'), null);
});

test('login fails for unknown user', () => {
  assert.equal(userAccount.login('nobody', 'secret123'), null);
});

test('login fails for suspended account', () => {
  db.prepare("UPDATE user_account SET is_active = 0 WHERE username = 'hsu'").run();
  assert.equal(userAccount.login('hsu', 'secret123'), null);
});

test('admin updates an interior designer verification status', () => {
  const designerId = userAccount.createUserAccount({
    username: 'designer-admin-edit',
    password: 'secret123',
    profileId: profileId(db, 'Interior Designer')
  });

  const verified = userAccount.updateAccount(designerId, { isVerified: true });
  assert.equal(verified.profile, 'Interior Designer');
  assert.equal(verified.isVerified, true);
  assert.equal(verified.hasVerifiedBadge, true);

  const unverified = userAccount.updateAccount(designerId, { isVerified: false });
  assert.equal(unverified.isVerified, false);
  assert.equal(unverified.hasVerifiedBadge, false);
});
