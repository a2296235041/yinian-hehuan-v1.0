'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return entry.isFile() && entry.name.endsWith('.js') ? [target] : [];
  });
}

walk(path.join(__dirname, '../publish'))
  .filter((file) => !file.endsWith('vendor/phaser.min.js'))
  .forEach((file) => {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /^\s*(?:export|import)\s/m, `${file} must be a classic script`);
  });

const html = fs.readFileSync(path.join(__dirname, '../publish/index.html'), 'utf8');
assert.ok(!/type=["']module["']/.test(html));
assert.ok(!/(?:layer|laydate|code)\.css/.test(html));

console.log('classic script and stylesheet reference tests passed');
