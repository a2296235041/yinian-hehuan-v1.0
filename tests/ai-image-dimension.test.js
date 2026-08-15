'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/ai/ImageDimensionSettings.js'),
  'utf8'
);
const window = {};
vm.runInNewContext(source, { window, Object });

assert.equal(window.GameImageDimensions.get(), '2:3');
assert.deepEqual(
  [...window.GameImageDimensions.options].map((option) => option.value),
  ['2:3', '1:1', '3:2']
);
assert.equal(window.GameImageDimensions.set('3:2'), '3:2');
assert.equal(window.GameImageDimensions.get(), '3:2');
assert.equal(window.GameImageDimensions.set('unsupported'), '2:3');
assert.equal(window.GameImageDimensions.get(), '2:3');

console.log('AI image dimension test passed');
