// Preset styles / types + keywords used by #23, read from database/tags.txt.
// The file is read again on every call, so editing tags.txt needs no reseed.
const fs = require('node:fs');
const path = require('node:path');

const SECTIONS = { 'Styles:': 'style', 'Types:': 'type', 'Keywords:': 'keywords' };

/** @returns {{ style: Object<string, string[]>, type: Object<string, string[]> }}  name -> keywords */
function loadPresetTags(filePath = path.join(__dirname, 'tags.txt')) {
  const preset = { style: {}, type: {} };
  const keywords = {};
  let section = null;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    if (!line || line === 'IDP Tags') continue;
    if (Object.hasOwn(SECTIONS, line)) {
      section = SECTIONS[line];
    } else if (section === 'keywords') {
      const [name, words] = line.split(': ');
      keywords[name] = words.split(', ');
    } else if (section) {
      preset[section][line] = [];
    }
  }
  for (const names of Object.values(preset)) {
    for (const name of Object.keys(names)) names[name] = keywords[name];
  }
  return preset;
}

module.exports = { loadPresetTags };
