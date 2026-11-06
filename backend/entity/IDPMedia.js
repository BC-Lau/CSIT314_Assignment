// ENTITY: media data and database persistence for an Interior Design Project.
// Byte data lives in SQLite for this coursework prototype (max 8 MiB/file).
class IDPMedia {
  constructor(db) { this.db = db; }

  createMedia(idpId, fileName, mimeType, bytes) {
    const result = this.db.prepare(`INSERT INTO idp_media (idp_id, file_name, mime_type, file_size, data)
      VALUES (?, ?, ?, ?, ?)`).run(idpId, fileName, mimeType, bytes.length, bytes);
    return this.getMetadata(Number(result.lastInsertRowid));
  }

  getMetadata(mediaId) {
    const row = this.db.prepare(`SELECT m.id, m.idp_id, m.file_name, m.mime_type, m.file_size, m.created_at,
      i.designer_id, i.visibility FROM idp_media m JOIN idp i ON i.id = m.idp_id WHERE m.id = ?`).get(mediaId);
    return row ? IDPMedia.fromRow(row) : null;
  }

  getContent(mediaId) {
    const row = this.db.prepare(`SELECT m.data, m.mime_type, m.file_name, i.designer_id, i.visibility
      FROM idp_media m JOIN idp i ON i.id = m.idp_id WHERE m.id = ?`).get(mediaId);
    return row ?? null;
  }

  getMediaForIDP(idpId) {
    return this.db.prepare(`SELECT m.id, m.idp_id, m.file_name, m.mime_type, m.file_size, m.created_at,
      i.designer_id, i.visibility FROM idp_media m JOIN idp i ON i.id = m.idp_id
      WHERE m.idp_id = ? ORDER BY m.created_at DESC, m.id DESC`).all(idpId).map(IDPMedia.fromRow);
  }

  deleteMedia(mediaId, idpId) {
    return this.db.prepare('DELETE FROM idp_media WHERE id = ? AND idp_id = ?')
      .run(mediaId, idpId).changes > 0;
  }

  static fromRow(row) {
    return {
      id: row.id, idpId: row.idp_id, fileName: row.file_name, mimeType: row.mime_type,
      fileSize: row.file_size, createdAt: row.created_at,
      designerId: row.designer_id, visibility: row.visibility,
    };
  }
}
module.exports = IDPMedia;
