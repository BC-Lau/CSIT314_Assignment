// Preset styles / types + keywords used by #23, read from database/tags.txt.
// The file is read again on every call, so editing tags.txt needs no reseed.
const fs = require('node:fs');
const path = require('node:path');

const SECTIONS = { 'Styles:': 'style', 'Types:': 'type', 'Keywords:': 'keywords' };

/** @returns {{ style: Object<string, string[]>, type: Object<string, string[]> }}  name -> keywords */
function loadPresetTags(filePath = path.join(__dirname, 'tags.txt')) {
}

module.exports = { loadPresetTags };
