'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const html = read('publish/index.html');
const css = read('publish/exploration.css');
const compactCss = read('publish/layout.v015.css');
const view = read('publish/src/ui/ExplorationDOMView.js');

assert.ok(html.includes('class="exploration-detail-ornament"'));
assert.ok(view.includes("ui.screen.classList.add('is-detail')"));
assert.ok(view.includes("ui.screen.classList.remove('is-detail')"));
assert.match(
  css,
  /\.exploration-screen\.is-detail \.exploration-screen-main \{[\s\S]*?padding-bottom:/
);
assert.match(css, /\.exploration-region-detail \{[\s\S]*?grid-template-columns:/);
assert.match(css, /\.exploration-dialogue-panel::before/);
assert.match(
  compactCss,
  /\.exploration-screen\.is-detail \.exploration-screen-main \{[\s\S]*?clamp\(210px, 68dvh, 300px\)/
);

console.log('exploration detail layout regression test passed');
