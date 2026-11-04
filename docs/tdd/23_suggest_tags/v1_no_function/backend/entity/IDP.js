// ENTITY: Interior Design Project. Each IDP has exactly 1 style and 0..* types,
// both taken from the preset list in database/tags.txt.
const { loadPresetTags } = require('../../database/presetTags');

class IDP {
  /** @param loadPreset  returns { style: {name: keywords[]}, type: {...} }; tests pass a small fixed list */
  constructor(db, loadPreset = loadPresetTags) {
    this.db = db;
    this.loadPreset = loadPreset;
  }

  /**
   * @param {number} designerId
   * @param {{title, description, budget, houseSize, duration, visibility, style, type}} idpData  already validated
   */
  createIDP(designerId, idpData) {
    const result = this.db
      .prepare(
        `INSERT INTO idp (designer_id, title, description, budget, house_size, duration, visibility, style, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        designerId,
        idpData.title,
        idpData.description,
        idpData.budget,
        idpData.houseSize,
        idpData.duration,
        idpData.visibility,
        idpData.style,
        JSON.stringify(idpData.type)
      );
    return this.getIDPById(Number(result.lastInsertRowid));
  }

  getIDPById(idpId) {
    const row = this.db.prepare(`${IDP.SELECT} WHERE i.id = ?`).get(idpId);
    return row ? IDP.fromRow(row) : null;
  }

  getIDPsByDesigner(designerId) {
    return this.db
      .prepare(`${IDP.SELECT} WHERE i.designer_id = ? ORDER BY i.created_at DESC, i.id DESC`)
      .all(designerId)
      .map(IDP.fromRow);
  }

  getLatestIDPs(limit = 12) {
    return this.db
      .prepare(`${IDP.SELECT} WHERE i.visibility = 'public' ORDER BY i.created_at DESC, i.id DESC LIMIT ?`)
      .all(limit)
      .map(IDP.fromRow);
  }

  // ---------- #23 preset styles / types ----------

  /** @param {'style' | 'type'} category */
  getTagsByType(category) {}

  findByNames(names) {}

  matchByKeywords(description) {}

  static fromRow(row) {
    return {
      id: row.id,
      designerId: row.designer_id,
      designerName: row.designer_name,
      title: row.title,
      description: row.description,
      budget: row.budget,
      houseSize: row.house_size,
      duration: row.duration,
      visibility: row.visibility,
      style: row.style,
      type: JSON.parse(row.type),
      createdAt: row.created_at,
    };
  }
}

IDP.SELECT = `
  SELECT i.*, a.username AS designer_name
    FROM idp i
    JOIN user_account a ON a.id = i.designer_id`;

module.exports = IDP;
