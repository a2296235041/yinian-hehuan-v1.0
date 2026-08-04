'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const html = read('publish/index.html');
const preload = read('publish/src/scenes/PreloadScene.v025.js');
const mainMenu = read('publish/src/scenes/MainMenuScene.js');
const characterCreation = read('publish/src/scenes/CharacterCreationScene.v017.js');
const portraitAssets = read('publish/src/assets/PlayerPortraitAssets.v002.js');

assert.ok(html.includes('id="boot-splash"'));
assert.ok(preload.includes('Game.PlayerPortraitAssets.preloadFirst(this)'));
assert.ok(!preload.includes('Game.PlayerPortraitAssets.preload(this);'));
assert.ok(!mainMenu.includes('Game.PlayerPortraitAssets.preloadRemaining(this)'));
assert.ok(mainMenu.includes('await Game.PlayerPortraitAssets.ensureLoaded(this, origin)'));
assert.ok(portraitAssets.includes('pending: new Map()'));
assert.ok(characterCreation.includes('正在展开命格画卷'));
assert.ok(characterCreation.includes('Game.PlayerPortraitAssets.preload(this)'));
console.log('startup preload test passed');
