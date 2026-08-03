'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/scenes/CharacterCreationScene.v017.js'),
  'utf8'
);

assert.match(source, /height\s*\/\s*2\s*\+\s*76,\s*'初始属性'/);
assert.match(source, /Array\.from\(\{\s*length:\s*7\s*\}/);
assert.match(source, /index\s*===\s*6\s*\?\s*width\s*\/\s*2/);
assert.match(source, /fixedWidth:\s*140/);
assert.match(source, /this\.attributeTexts\.forEach/);
assert.doesNotMatch(source, /padEnd\(10/);

console.log('character creation attribute layout tests passed');
