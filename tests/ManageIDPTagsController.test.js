const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ManageIDPTagsController = require('../backend/controller/ManageIDPTagsController');
const { createTestDatabase, profileId } = require('./helpers');

function setup() {
  const db = createTestDatabase();
  const designerId = db.prepare('INSERT INTO user_account (username, password_hash, profile_id) VALUES (?, ?, ?)')
    .run('designer', 'hash', profileId(db, 'Interior Designer')).lastInsertRowid;
  const idpId = db.prepare(`INSERT INTO idp (designer_id, title, description, style, type)
    VALUES (?, 'Test project', 'Description', 'Modern', ?)`)
    .run(designerId, JSON.stringify(['Kitchen', 'Bedroom'])).lastInsertRowid;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idp-tags-'));
  const tagsPath = path.join(dir, 'tags.txt');
  fs.writeFileSync(tagsPath, 'IDP Tags\nStyles:\nModern\nJapanese\n\nTypes:\nKitchen\nBedroom\n\nKeywords:\nModern: modern\nKitchen: kitchen\n');
  return { db, idpId: Number(idpId), tagsPath, controller: new ManageIDPTagsController(db, tagsPath), cleanup: () => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

test('MI-01 bulk add accepts one- and two-word tags, rejects duplicates and three-word tags with reasons', (t) => {
  const s = setup(); t.after(s.cleanup);
  const result = s.controller.add('style', ['Art Deco', 'Modern', 'Too Many Words', 'Coastal', 'coastal']);
  assert.deepEqual(result.added, ['Art Deco', 'Coastal']);
  assert.deepEqual(result.failed.map((x) => x.reason), [
    'This tag already exists.', 'Tag must contain one or two words.', 'This tag already exists.'
  ]);
  assert.deepEqual(s.controller.list().styles, ['Modern', 'Japanese', 'Art Deco', 'Coastal']);
});

test('MI-02 deleting a room type removes it from existing IDP JSON type arrays', (t) => {
  const s = setup(); t.after(s.cleanup);
  const result = s.controller.remove('type', ['Kitchen']);
  assert.equal(result.success, true);
  assert.deepEqual(JSON.parse(s.db.prepare('SELECT type FROM idp WHERE id = ?').get(s.idpId).type), ['Bedroom']);
  assert.deepEqual(s.controller.list().types, ['Bedroom']);
});

test('MI-03 deleting a style clears it from existing IDPs and removes its keyword entry', (t) => {
  const s = setup(); t.after(s.cleanup);
  s.controller.remove('style', ['Modern']);
  assert.equal(s.db.prepare('SELECT style FROM idp WHERE id = ?').get(s.idpId).style, '');
  assert.doesNotMatch(fs.readFileSync(s.tagsPath, 'utf8'), /Modern/);
});
