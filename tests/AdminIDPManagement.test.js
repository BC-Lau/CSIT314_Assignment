const test = require('node:test');
const assert = require('node:assert/strict');
const IDP = require('../backend/entity/IDP');
const Moderation = require('../backend/entity/Moderation');
const { createTestDatabase, profileId } = require('./helpers');

test('User Admin IDP inventory includes suspended projects and supports lifecycle actions', () => {
  const db = createTestDatabase();
  try {
    const designerId = Number(db.prepare(`INSERT INTO user_account
      (username,password_hash,email,profile_id) VALUES(?,?,?,?)`)
      .run('designer-admin-test', 'hash', 'designer-admin@example.com', profileId(db, 'Interior Designer')).lastInsertRowid);
    const idpId = Number(db.prepare(`INSERT INTO idp
      (designer_id,title,description,style,type) VALUES(?,?,?,?,?)`)
      .run(designerId, 'Admin managed project', 'Project description', 'Modern', '["Kitchen"]').lastInsertRowid);
    const idp = new IDP(db);
    const moderation = new Moderation(db);

    moderation.flag('idp', idpId, 'Test moderation flag');
    assert.equal(idp.getAllIDPsForAdmin().length, 1);
    assert.equal(idp.getAllIDPsForAdmin()[0].designerIsActive, true);

    assert.equal(idp.setSuspended(idpId, true), true);
    assert.equal(idp.getAllIDPsForAdmin()[0].isSuspended, true);
    assert.equal(idp.canReactivate(idpId), true);

    assert.equal(idp.setSuspended(idpId, false), true);
    assert.equal(idp.getAllIDPsForAdmin()[0].isSuspended, false);
    assert.equal(moderation.clearIDPFlag(idpId), true);
    assert.equal(moderation.list().length, 0);

    db.prepare('UPDATE user_account SET is_active=0 WHERE id=?').run(designerId);
    assert.equal(idp.canReactivate(idpId), false);
  } finally {
    db.close();
  }
});
