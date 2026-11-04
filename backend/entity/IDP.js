// ENTITY: Interior Design Project.
class IDP {
  constructor(db) {
    this.db = db;
  }

  /**
   * Creates an IDP and links its tags in one transaction.
   * @param {number} designerId
   * @param {{title, description, budget, houseSize, duration, visibility}} idpData
   * @param {{id:number}[]} tags  already-validated Tag objects
   */
  createIDP(designerId, idpData, tags) {
    this.db.exec('BEGIN');
    try {
      const result = this.db
        .prepare(
          `INSERT INTO idp (designer_id, title, description, budget, house_size, duration, visibility)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          designerId,
          idpData.title,
          idpData.description,
          idpData.budget,
          idpData.houseSize,
          idpData.duration,
          idpData.visibility
        );
      const idpId = Number(result.lastInsertRowid);
      const link = this.db.prepare('INSERT INTO idp_tag (idp_id, tag_id) VALUES (?, ?)');
      for (const tag of tags) link.run(idpId, tag.id);
      this.db.exec('COMMIT');
      return this.getIDPById(idpId);
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  getIDPById(idpId) {
    const row = this.db.prepare(`${IDP.SELECT} WHERE i.id = ? GROUP BY i.id`).get(idpId);
    return row ? IDP.fromRow(row) : null;
  }

  getIDPsByDesigner(designerId) {
    return this.db
      .prepare(`${IDP.SELECT} WHERE i.designer_id = ? GROUP BY i.id ORDER BY i.created_at DESC, i.id DESC`)
      .all(designerId)
      .map(IDP.fromRow);
  }

  getLatestIDPs(limit = 12) {
    return this.db
      .prepare(`${IDP.SELECT} WHERE i.visibility = 'public' GROUP BY i.id ORDER BY i.created_at DESC, i.id DESC LIMIT ?`)
      .all(limit)
      .map(IDP.fromRow);
  }

  /**
   * #1 Recommended IDPs. Public IDPs that share at least one tag with tagPreferences
   * (a Map of tag name -> count), leaving out the customer's own favourites.
   */
  findSimilarIDPs(tagPreferences, favouriteIDPs) {
    const names = [...tagPreferences.keys()];
    if (names.length === 0) return [];
    const favouriteIds = favouriteIDPs.map((f) => f.id);
    const marks = (list) => list.map(() => '?').join(', ');

    let sql = `${IDP.SELECT}
       WHERE i.visibility = 'public'
         AND i.id IN (SELECT x.idp_id FROM idp_tag x JOIN tag y ON y.id = x.tag_id
                       WHERE y.name IN (${marks(names)}))`;
    const params = [...names];
    if (favouriteIds.length > 0) {
      sql += ` AND i.id NOT IN (${marks(favouriteIds)})`;
      params.push(...favouriteIds);
    }
    sql += ' GROUP BY i.id ORDER BY i.created_at DESC, i.id DESC';
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
      createdAt: row.created_at,
      style: row.style_tag ?? null,
      rooms: row.room_tags ? row.room_tags.split('|') : [],
    };
  }
}

IDP.SELECT = `
  SELECT i.*, a.username AS designer_name,
         MAX(CASE WHEN t.type = 'style' THEN t.name END) AS style_tag,
         GROUP_CONCAT(CASE WHEN t.type = 'room' THEN t.name END, '|') AS room_tags
    FROM idp i
    JOIN user_account a ON a.id = i.designer_id
    LEFT JOIN idp_tag it ON it.idp_id = i.id
    LEFT JOIN tag t ON t.id = it.tag_id`;

module.exports = IDP;
