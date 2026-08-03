'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(
  path.join(__dirname, '../publish/layout.v015.css'),
  'utf8'
);

assert.match(css, /@media \(max-width: 720px\)/);
assert.match(css, /\.dialogue-form \{[\s\S]*?minmax\(72px, 1fr\)[\s\S]*?minmax\(60px, auto\);/);
assert.match(css, /\.exploration-command-panel \{[\s\S]*?minmax\(72px, 1fr\)[\s\S]*?minmax\(58px, auto\);/);
assert.match(css, /#dialogue-draw \{\s*grid-column: auto;/);
assert.match(css, /\.exploration-command-panel input \{\s*grid-column: auto;/);
assert.match(css, /\.ai-dialogue-panel,[\s\S]*?\.exploration-dialogue-panel \{[\s\S]*?top: auto;/);

console.log('mobile dialogue layout regression test passed');
