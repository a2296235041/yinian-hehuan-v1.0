'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

[
  'publish/src/assets/GameScenePreload.v049.js',
  'publish/src/scenes/CharacterCreationScene.v017.js',
  'publish/src/scenes/PreloadScene.v025.js'
].forEach((file) => {
  const source = read(file);
  assert.ok(source.includes('const onProgress ='), `${file} should name its progress listener`);
  assert.ok(
    source.includes("this.load.off('progress', onProgress)"),
    `${file} should remove its progress listener`
  );
});

console.log('phaser loader listener cleanup test passed');
