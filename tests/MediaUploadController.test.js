const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const UserAccount = require('../backend/entity/UserAccount');
const IDP = require('../backend/entity/IDP');
const IDPMedia = require('../backend/entity/IDPMedia');
const MediaUploadController = require('../backend/controller/MediaUploadController');
const { createTestDatabase, profileId } = require('./helpers');

let account, designer, otherDesigner, customer, idp, controller, publicIdp, privateIdp;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ZkAAAAASUVORK5CYII=', 'base64');

beforeEach(() => {
  const db = createTestDatabase();
  account = new UserAccount(db);
  const add = (username, profile) => account.findById(account.createUserAccount({
    username, password: 'pass1234', profileId: profileId(db, profile),
  }));
  designer = add('designer1', 'Interior Designer');
  otherDesigner = add('designer2', 'Interior Designer');
  customer = add('customer1', 'Customer');
  idp = new IDP(db);
  const create = (visibility) => idp.createIDP(designer.id, {
    title: `${visibility} project`, description: 'Sample', budget: null, houseSize: null,
    duration: null, visibility, style: 'Modern', type: [],
  });
  publicIdp = create('public');
  privateIdp = create('private');
  controller = new MediaUploadController(idp, new IDPMedia(db));
});

test('a designer may upload images to their own project, then view and delete them', () => {
  const uploaded = controller.uploadMedia(designer, publicIdp.id, 'kitchen.png', 'image/png', png);
  assert.equal(uploaded.success, true);
  assert.equal(uploaded.media.fileName, 'kitchen.png');
  assert.equal(controller.listMedia(null, publicIdp.id).media.length, 1);
  assert.deepEqual(Buffer.from(controller.getMediaContent(null, uploaded.media.id).bytes), png);
  assert.equal(controller.deleteMedia(designer, publicIdp.id, uploaded.media.id).success, true);
  assert.equal(controller.listMedia(null, publicIdp.id).media.length, 0);
});

test('uploading and deleting require the owning designer', () => {
  assert.equal(controller.uploadMedia(customer, publicIdp.id, 'p.png', 'image/png', png).success, false);
  assert.equal(controller.uploadMedia(otherDesigner, publicIdp.id, 'p.png', 'image/png', png).success, false);
  const media = controller.uploadMedia(designer, publicIdp.id, 'p.png', 'image/png', png).media;
  assert.equal(controller.deleteMedia(otherDesigner, publicIdp.id, media.id).success, false);
  assert.equal(controller.deleteMedia(designer, privateIdp.id, media.id).success, false);
});

test('private media is invisible to customers, but viewable by owner', () => {
  const media = controller.uploadMedia(designer, privateIdp.id, 'secret.png', 'image/png', png).media;
  assert.equal(controller.listMedia(customer, privateIdp.id).success, false);
  assert.equal(controller.getMediaContent(customer, media.id), null);
  assert.equal(controller.listMedia(designer, privateIdp.id).success, true);
  assert.ok(controller.getMediaContent(designer, media.id));
});

test('rejects unsupported or mislabelled formats and invalid files', () => {
  assert.equal(controller.uploadMedia(designer, publicIdp.id, 'x.svg', 'image/svg+xml', png).success, false);
  assert.equal(controller.uploadMedia(designer, publicIdp.id, 'x.png', 'image/png', Buffer.from('not a png')).success, false);
  assert.equal(controller.uploadMedia(designer, publicIdp.id, '../', 'image/png', png).success, false);
  assert.equal(controller.uploadMedia(designer, publicIdp.id, 'x.png', 'image/png', Buffer.alloc(0)).success, false);
  assert.equal(controller.uploadMedia(designer, publicIdp.id, 'x.png', 'image/png', Buffer.alloc(5 * 1024 * 1024 + 1)).success, false);
});
