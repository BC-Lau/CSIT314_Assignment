const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../database/db');
const UserAccount = require('../backend/entity/UserAccount');
const IDP = require('../backend/entity/IDP');
const Moderation = require('../backend/entity/Moderation');
const ManageUserAccountsController = require('../backend/controller/ManageUserAccountsController');

function setup() {
  const db = createDatabase(':memory:');
  return { db, users: new UserAccount(db), idp: new IDP(db), moderation: new Moderation(db) };
}

test('flags a newly created customer with no email', () => {
  const { users, moderation, db } = setup();
  const id = users.createUserAccount({ username: 'new-customer', password: 'password123', profileId: 3 });
  moderation.inspectCustomer(users.findByIdIncludingInactive(id));
  const flag = moderation.list()[0];
  assert.equal(flag.subject_type, 'customer');
  assert.match(flag.reason, /No email/);
  assert.equal(flag.status, 'pending');
  db.close();
});

test('suspending a flagged IDP hides it from public listings', () => {
  const { users, idp, moderation, db } = setup();
  const designerId = users.createUserAccount({ username: 'designer', password: 'password123', profileId: 2 });
  const id = Number(db.prepare(`INSERT INTO idp(designer_id,title,description,style,type)
    VALUES(?,?,?,?,?)`).run(designerId, 'Project', 'Contact by WhatsApp https://spam.test', 'Modern', '["Bedroom"]').lastInsertRowid);
  moderation.inspectIDP({ ...idp.getIDPById(id), description: 'Contact by WhatsApp https://spam.test' });
  const flag = moderation.list()[0];
  assert.equal(moderation.review(flag.id, 'suspend').success, true);
  assert.equal(idp.getLatestIDPs().length, 0);
  assert.equal(idp.getIDPById(id).isSuspended, true);
  db.close();
});

test('suspending a designer suspends their account and every IDP', () => {
  const { users, moderation, db } = setup();
  const designerId = users.createUserAccount({ username: 'designer', password: 'password123', profileId: 2 });
  for (const title of ['Project One', 'Project Two']) {
    db.prepare(`INSERT INTO idp(designer_id,title,description,style,type) VALUES(?,?,?,?,?)`)
      .run(designerId, title, 'Description', 'Modern', '["Bedroom"]');
  }
  assert.equal(moderation.suspendDesigner(designerId).success, true);
  assert.equal(db.prepare('SELECT is_active FROM user_account WHERE id=?').get(designerId).is_active, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM idp WHERE designer_id=? AND is_suspended=1').get(designerId).n, 2);
  db.close();
});


test('reactivating a customer account removes its moderation flag from the queue', () => {
  const { users, moderation, db } = setup();
  const customerId = users.createUserAccount({ username: 'flagged-customer', password: 'password123', profileId: 3 });
  moderation.inspectCustomer(users.findByIdIncludingInactive(customerId));
  assert.equal(moderation.list().some(flag => flag.subject_type === 'customer' && flag.subject_id === customerId), true);

  users.suspend(customerId);
  const controller = new ManageUserAccountsController(users, moderation);
  const result = controller.reactivateAccount({ id: 999, profile: 'User Admin' }, customerId);

  assert.equal(result.success, true);
  assert.equal(db.prepare('SELECT is_active FROM user_account WHERE id=?').get(customerId).is_active, 1);
  assert.equal(moderation.list().some(flag => flag.subject_type === 'customer' && flag.subject_id === customerId), false);
  db.close();
});

test('failed account reactivation does not clear a moderation flag', () => {
  const { users, moderation, db } = setup();
  const controller = new ManageUserAccountsController(users, moderation);
  const result = controller.reactivateAccount({ id: 999, profile: 'User Admin' }, 999999);
  assert.equal(result.success, false);
  assert.equal(moderation.list().length, 0);
  db.close();
});


test('creating a customer through the account controller automatically inspects and flags it', () => {
  const { users, moderation, db } = setup();
  const controller = new ManageUserAccountsController(users, moderation);
  const result = controller.createAccount({ id: 999, profile: 'User Admin' }, {
    username: 'new-customer', password: 'password123', profileId: 3, email: ''
  });
  assert.equal(result.success, true);
  const flag = moderation.list().find(item => item.subject_type === 'customer' && item.subject_id === result.account.id);
  assert.ok(flag);
  assert.match(flag.reason, /No email/);
  db.close();
});

test('reactivating a suspended IDP removes its moderation flag', () => {
  const { users, idp, moderation, db } = setup();
  const designerId = users.createUserAccount({ username: 'designer-reactivate', password: 'password123', profileId: 2 });
  const idpId = Number(db.prepare(`INSERT INTO idp(designer_id,title,description,style,type,is_suspended)
    VALUES(?,?,?,?,?,1)`).run(designerId, 'Suspended project', 'Description', 'Modern', '["Bedroom"]').lastInsertRowid);
  moderation.flag('idp', idpId, 'Suspicious content');
  assert.equal(idp.setSuspended(idpId, false), true);
  assert.equal(moderation.clearIDPFlag(idpId), true);
  assert.equal(moderation.list().some(flag => flag.subject_type === 'idp' && flag.subject_id === idpId), false);
  db.close();
});
