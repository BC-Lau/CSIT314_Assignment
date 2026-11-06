// ENTITY: Interior Design Project. Each IDP has exactly 1 style and 1..* types,
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

  /** Favourites are removed by ON DELETE CASCADE; contact requests keep their history without the IDP. */
  deleteIDP(idpId) {
    this.db.prepare('UPDATE contact_request SET idp_id = NULL WHERE idp_id = ?').run(idpId);
    this.db.prepare('DELETE FROM idp WHERE id = ?').run(idpId);
  }

  getLatestIDPs(limit = 12) {
    return this.db
      .prepare(`${IDP.SELECT} WHERE i.visibility = 'public' ORDER BY i.created_at DESC, i.id DESC LIMIT ?`)
      .all(limit)
      .map(IDP.fromRow);
  }

  // ---------- #23 preset styles / types ----------

  /** @param {'style' | 'type'} category */
  getTagsByType(category) {
    return Object.keys(this.loadPreset()[category] ?? {});
  }

  /** Keeps only preset names, in the given order, without duplicates. */
  findByNames(names) {
    if (!Array.isArray(names)) return [];
    const preset = this.loadPreset();
    const known = (name) => Object.hasOwn(preset.style, name) || Object.hasOwn(preset.type, name);
    return [...new Set(names)].filter((name) => typeof name === 'string' && known(name));
  }

  /**
   * #23 fallback when the AI service fails: names whose name or keywords appear in the
   * description (whole words, any case). Best match first = most keywords found.
   */
  matchByKeywords(description) {
    if (typeof description !== 'string' || !description.trim()) return [];
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const appears = (word) => new RegExp(`\\b${escape(word)}\\b`, 'i').test(description);
    const preset = this.loadPreset();
    return [...Object.entries(preset.style), ...Object.entries(preset.type)]
      .map(([name, keywords]) => {
        const words = new Set([name, ...keywords].map((w) => w.toLowerCase()));
        return { name, hits: [...words].filter(appears).length };
      })
      .filter((m) => m.hits > 0)
      .sort((a, b) => b.hits - a.hits || a.name.localeCompare(b.name))
      .map((m) => m.name);
  }

  /**
   * #1 Recommended IDPs. Public IDPs that share at least one style or type name with
   * tagPreferences (a Map of name -> count), excluding IDPs already in customer's favourites.
   */
  findSimilarIDPs(tagPreferences, favouriteIDPs) {
    const names = [...tagPreferences.keys()];
    if (names.length === 0) return [];
    const favouriteIds = favouriteIDPs.map((f) => f.id);
    const marks = (list) => list.map(() => '?').join(', ');

    let sql = `${IDP.SELECT}
       WHERE i.visibility = 'public'
         AND (i.style IN (${marks(names)})
              OR EXISTS (SELECT 1 FROM json_each(i.type) WHERE value IN (${marks(names)})))`;
    const params = [...names, ...names];
    if (favouriteIds.length > 0) {
      sql += ` AND i.id NOT IN (${marks(favouriteIds)})`;
      params.push(...favouriteIds);
    }
    sql += ' ORDER BY i.created_at DESC, i.id DESC';
    return this.db.prepare(sql).all(...params).map(IDP.fromRow);
  }

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
      coverMediaId: row.cover_media_id,
    };
  }
}

IDP.SELECT = `
  SELECT i.*, a.username AS designer_name,
    (SELECT m.id FROM idp_media m WHERE m.idp_id = i.id AND m.mime_type LIKE 'image/%' ORDER BY m.id LIMIT 1) AS cover_media_id
    FROM idp i
    JOIN user_account a ON a.id = i.designer_id`;

module.exports = IDP;
