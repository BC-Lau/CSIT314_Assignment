// CONTROL: Story #24. Check authorization, file size and true file signatures.
// Boundary (IDPMediaPage) -> MediaUploadController -> IDP / IDPMedia entities.
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']);

function signatureMatches(mime, bytes) {
  const ascii = (start, end) => bytes.subarray(start, end).toString('ascii');
  switch (mime) {
    case 'image/jpeg': return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png': return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    case 'image/gif': return ascii(0, 6) === 'GIF89a' || ascii(0, 6) === 'GIF87a';
    case 'image/webp': return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'video/mp4': return ascii(4, 8) === 'ftyp';
    case 'video/webm': return bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'));
    default: return false;
  }
}

class MediaUploadController {
  constructor(idp, media) { this.idp = idp; this.media = media; }

  canUpload(user) {
    return !!(user && user.canUploadIDPMedia());
  }

  ownsIDP(user, idpId) {
    const id = Number(idpId);
    const project = Number.isSafeInteger(id) && id > 0 ? this.idp.getIDPById(id) : null;
    return project && user && project.designerId === user.id ? project : null;
  }

  uploadMedia(user, idpId, fileName, mimeType, bytes) {
    if (!this.canUpload(user)) return { success: false, message: 'Only interior designers can upload media' };
    const project = this.ownsIDP(user, idpId);
    if (!project) return { success: false, message: 'IDP not found or not owned by you' };
    const safeName = typeof fileName === 'string' ? fileName.replace(/[\\/\x00-\x1f\x7f]/g, '').trim().slice(0, 120) : '';
    if (!safeName || safeName === '.' || safeName === '..') return { success: false, message: 'Choose a file with a valid name' };
    if (!ALLOWED.has(mimeType)) return { success: false, message: 'Unsupported image or video format' };
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) return { success: false, message: 'Empty or invalid file' };
    if (bytes.length > MAX_FILE_BYTES || (mimeType.startsWith('image/') && bytes.length > MAX_IMAGE_BYTES)) {
      return { success: false, message: 'Image must be under 5 MB; video must be under 8 MB' };
    }
    if (!signatureMatches(mimeType, bytes)) return { success: false, message: 'File contents do not match the selected format' };
    return { success: true, media: this.media.createMedia(project.id, safeName, mimeType, bytes) };
  }

  listMedia(user, idpId) {
    const id = Number(idpId);
    const project = Number.isSafeInteger(id) && id > 0 ? this.idp.getIDPById(id) : null;
    if (!project || (project.visibility !== 'public' && (!user || user.id !== project.designerId))) {
      return { success: false, message: 'IDP not found' };
    }
    return { success: true, media: this.media.getMediaForIDP(id) };
  }

  getMediaContent(user, mediaId) {
    const id = Number(mediaId);
    if (!Number.isSafeInteger(id) || id < 1) return null;
    const record = this.media.getContent(id);
    if (!record || (record.visibility !== 'public' && (!user || user.id !== record.designer_id))) return null;
    return { bytes: record.data, mimeType: record.mime_type, fileName: record.file_name,
      public: record.visibility === 'public' };
  }

  deleteMedia(user, idpId, mediaId) {
    if (!this.canUpload(user) || !this.ownsIDP(user, idpId)) {
      return { success: false, message: 'IDP not found or not owned by you' };
    }
    const media = this.media.getMetadata(Number(mediaId));
    if (!media || media.idpId !== Number(idpId)) return { success: false, message: 'Media not found' };
    return { success: this.media.deleteMedia(media.id, Number(idpId)) };
  }
}
module.exports = MediaUploadController;
