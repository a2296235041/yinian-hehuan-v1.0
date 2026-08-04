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
const gameScenePreload = read('publish/src/assets/GameScenePreload.v062.js');
const npcCards = read('publish/src/ui/NpcCardRenderer.js');
const main = read('publish/src/boot/GameBootstrap.v062.js');

assert.ok(html.includes('id="boot-splash"'));
assert.ok(html.includes('<style data-critical-boot>'));
assert.ok(html.includes('GameEarlyBoot'));
assert.ok(preload.includes('const totalResources = 2'));
assert.ok(!preload.includes('Game.PlayerPortraitAssets'));
assert.ok(!preload.includes("this.load.image('bg-sect-map'"));
assert.ok(!preload.includes("this.load.image('npc-"));
assert.ok(gameScenePreload.includes("'bg-sect-map'"));
assert.ok(gameScenePreload.includes("'exploration_regions'"));
assert.ok(npcCards.includes('ensurePortrait(scene, npc)'));
assert.ok(!mainMenu.includes('Game.PlayerPortraitAssets.preloadRemaining(this)'));
assert.ok(mainMenu.includes('await Game.PlayerPortraitAssets.ensureLoaded(this, origin)'));
assert.ok(portraitAssets.includes('pending: new Map()'));
assert.ok(characterCreation.includes('正在展开命格画卷'));
assert.ok(characterCreation.includes('Game.PlayerPortraitAssets.preloadFirst(this)'));
assert.ok(characterCreation.includes('Game.PlayerPortraitAssets.ensureLoaded(this, origin)'));
assert.ok(characterCreation.includes("this.load.off('progress', onProgress)"));
assert.ok(gameScenePreload.includes("this.load.off('progress', onProgress)"));
assert.ok(preload.includes("this.load.off('progress', onProgress)"));
assert.ok(preload.includes("this.load.off('loaderror', onLoadError)"));
assert.ok(!main.includes('ensureModule'));
assert.ok(
  main.indexOf('root.game = new Phaser.Game(config)')
    < main.indexOf('initializeServices();')
);
console.log('startup preload test passed');
