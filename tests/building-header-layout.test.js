'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/scenes/GameScene.js'),
  'utf8'
);

const method = source.slice(
  source.indexOf('    createBackButton(x = 800) {'),
  source.indexOf('\n    }\n\n};', source.indexOf('    createBackButton(x = 800) {')) + 6
);

assert.match(source, /Math\.max\(160,\s*Math\.ceil\(title\.displayWidth\s*\/\s*2\)\s*\+\s*99\)/);
assert.match(source, /this\.createBackButton\(640\s*\+\s*headerOffset\)/);
assert.match(source, /Game\.ShopEntry\.create\(this,\s*building,\s*640\s*-\s*headerOffset\)/);
assert.match(method, /createBackButton\(x\s*=\s*800\)/);
assert.match(method, /this,\s*\n\s*x,\s*\n\s*58,/);
assert.match(method, /width:\s*150/);
assert.match(method, /stopPropagation:\s*isRearSanctuary/);

console.log('building header layout tests passed');
