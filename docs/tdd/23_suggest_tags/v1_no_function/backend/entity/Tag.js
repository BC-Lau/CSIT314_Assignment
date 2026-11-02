// ENTITY: preset tags. type is 'style' (exactly 1 per IDP) or 'room' (0..* per IDP).
class Tag {
  constructor(db) {
    this.db = db;
  }

  static fromRow(row) {
    return { id: row.id, name: row.name, type: row.type, keywords: JSON.parse(row.keywords || '[]') };
  }

  getAllTags() {
    return this.db.prepare('SELECT * FROM tag ORDER BY type DESC, name').all().map(Tag.fromRow);
  }

  getTagsByType(type) {
    return this.db.prepare('SELECT * FROM tag WHERE type = ? ORDER BY name').all(type).map(Tag.fromRow);
  }

  /** Returns only the names that exist in the preset list (unknown names are dropped). */
  findByNames(names) {
    if (!Array.isArray(names) || names.length === 0) return [];
    const placeholders = names.map(() => '?').join(', ');
    return this.db
      .prepare(`SELECT * FROM tag WHERE name IN (${placeholders})`)
      .all(...names)
      .map(Tag.fromRow);
  }

  /** #23 fallback: tags whose name or keywords appear in the description (case-insensitive). */
  // TDD v1: not written yet
  matchByKeywords(description) {}

  getTagsByIDP(idpId) {
    return this.db
      .prepare(
        `SELECT t.* FROM tag t JOIN idp_tag it ON it.tag_id = t.id
          WHERE it.idp_id = ? ORDER BY t.type DESC, t.name`
      )
      .all(idpId)
      .map(Tag.fromRow);
  }
}

module.exports = Tag;
