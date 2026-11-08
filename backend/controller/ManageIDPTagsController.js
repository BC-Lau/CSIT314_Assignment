const fs = require('node:fs');
const path = require('node:path');
const { loadPresetTags } = require('../../database/presetTags');

class ManageIDPTagsController {
  constructor(db, tagsPath = path.join(__dirname, '../../database/tags.txt')) {
    this.db = db;
    this.tagsPath = tagsPath;
  }

  list() {
    const preset = loadPresetTags(this.tagsPath);
    return { styles: Object.keys(preset.style), types: Object.keys(preset.type) };
  }

  add(category, values) {
    if (!['style', 'type'].includes(category)) return { success: false, message: 'Category must be style or type.' };
    if (!Array.isArray(values)) return { success: false, message: 'Tags must be supplied as a list.' };
    const current = loadPresetTags(this.tagsPath);
    const existing = new Set([...Object.keys(current.style), ...Object.keys(current.type)].map((s) => s.toLocaleLowerCase()));
    const added = [];
    const failed = [];
    const pending = new Set();
    for (const raw of values) {
      const tag = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
      if (!tag) { failed.push({ tag: String(raw ?? ''), reason: 'Tag cannot be empty.' }); continue; }
      const words = tag.split(' ');
      if (words.length < 1 || words.length >= 3) { failed.push({ tag, reason: 'Tag must contain one or two words.' }); continue; }
      const key = tag.toLocaleLowerCase();
      if (existing.has(key) || pending.has(key)) { failed.push({ tag, reason: 'This tag already exists.' }); continue; }
      pending.add(key);
      added.push(tag);
    }
    if (added.length) this.rewriteTags((sections) => {
      const sectionName = category === 'style' ? 'Styles:' : 'Types:';
      sections[sectionName].push(...added);
    });
    return { success: true, added, failed, message: `${added.length} tag(s) added; ${failed.length} failed.` };
  }

  remove(category, values) {
    if (!['style', 'type'].includes(category)) return { success: false, message: 'Category must be style or type.' };
    if (!Array.isArray(values)) return { success: false, message: 'Tags must be supplied as a list.' };
    const preset = loadPresetTags(this.tagsPath);
    const available = new Set(Object.keys(preset[category]));
    const removed = [...new Set(values.filter((v) => typeof v === 'string' && available.has(v)))];
    const missing = values.filter((v) => typeof v !== 'string' || !available.has(v));
    if (!removed.length) return { success: false, removed: [], missing, message: 'No matching tags were selected.' };

    const removeSet = new Set(removed);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (category === 'style') {
        const stmt = this.db.prepare('UPDATE idp SET style = ? WHERE style = ?');
        for (const tag of removed) stmt.run('', tag);
      } else {
        const rows = this.db.prepare('SELECT id, type FROM idp').all();
        const updateTypes = this.db.prepare('UPDATE idp SET type = ? WHERE id = ?');
        for (const row of rows) {
          let types;
          try { types = JSON.parse(row.type); } catch { continue; }
          if (Array.isArray(types) && types.some((tag) => removeSet.has(tag))) {
            updateTypes.run(JSON.stringify(types.filter((tag) => !removeSet.has(tag))), row.id);
          }
        }
      }
      this.rewriteTags((sections) => {
        const sectionName = category === 'style' ? 'Styles:' : 'Types:';
        sections[sectionName] = sections[sectionName].filter((tag) => !removeSet.has(tag));
        sections['Keywords:'] = sections['Keywords:'].filter((line) => !removed.some((tag) => line.startsWith(`${tag}:`)));
      });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return { success: true, removed, missing, message: `${removed.length} tag(s) deleted and removed from existing IDPs.` };
  }

  // Preserve the three sections and their ordering while safely rewriting the preset file.
  rewriteTags(change) {
    const lines = fs.readFileSync(this.tagsPath, 'utf8').split(/\r?\n/);
    const sections = { 'Styles:': [], 'Types:': [], 'Keywords:': [] };
    let section = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (Object.hasOwn(sections, line)) { section = line; continue; }
      if (section && line && line !== 'IDP Tags') sections[section].push(line);
    }
    change(sections);
    const output = ['IDP Tags', 'Styles:', ...sections['Styles:'], '', 'Types:', ...sections['Types:'], '', 'Keywords:', ...sections['Keywords:']];
    fs.writeFileSync(this.tagsPath, `${output.join('\n')}\n`, 'utf8');
  }
}

module.exports = ManageIDPTagsController;
