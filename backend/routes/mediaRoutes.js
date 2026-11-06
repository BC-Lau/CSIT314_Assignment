const express = require('express');
const UserAccount = require('../entity/UserAccount');
const IDP = require('../entity/IDP');
const IDPMedia = require('../entity/IDPMedia');
const MediaUploadController = require('../controller/MediaUploadController');

function mediaRoutes(db) {
  const router = express.Router();
  const userAccount = new UserAccount(db);
  const controller = new MediaUploadController(new IDP(db), new IDPMedia(db));
  const actor = (req) => userAccount.findById(req.get('X-User-Id'));
  const reply = (res, result, successStatus = 200) => res.status(result.success ? successStatus : 400).json(result);

  // Public IDPs are readable by anyone. Private IDPs are readable only by their designer.
  router.get('/:idpId/media', (req, res) => reply(res, controller.listMedia(actor(req), req.params.idpId)));
  router.get('/media/:mediaId/file', (req, res) => {
    const file = controller.getMediaContent(actor(req), req.params.mediaId);
    if (!file) return res.status(404).json({ success: false, message: 'Media not found' });
    res.set('Content-Type', file.mimeType);
    res.set('Content-Disposition', 'inline');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', file.public ? 'public, max-age=3600' : 'private, no-store');
    return res.send(Buffer.from(file.bytes));
  });

  // Browser submits binary bytes directly; no external multipart dependency required.
  router.post('/:idpId/media', express.raw({ type: 'application/octet-stream', limit: '8mb' }), (req, res) => {
    let name;
    try { name = decodeURIComponent(req.get('X-File-Name') ?? ''); } catch { name = ''; }
    reply(res, controller.uploadMedia(actor(req), req.params.idpId, name,
      req.get('X-Mime-Type'), req.body), 201);
  });
  router.delete('/:idpId/media/:mediaId', (req, res) => reply(res,
    controller.deleteMedia(actor(req), req.params.idpId, req.params.mediaId)));

  return router;
}
module.exports = mediaRoutes;
