'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const view = read('publish/src/ui/PlayerStatusView.js');
const scene = read('publish/src/scenes/UIScene.js');
const manifest = read('tools/entry-sources.v046.json');

assert.ok(view.includes("'修行档案'"));
assert.ok(view.includes("'基础属性'"));
assert.ok(view.includes('progressFill.setScale'));
assert.ok(view.includes("['attack', '攻击']"));
assert.ok(view.includes('setInteractive({ useHandCursor: true })'));
assert.ok(view.includes('scene.add.rectangle(212, 285, 392, 350'));
assert.ok(scene.includes('Game.PlayerStatusView.create(this)'));
assert.ok(scene.includes('Game.PlayerStatusView.update(this.playerStatus)'));
assert.ok(manifest.indexOf('src/ui/PlayerStatusView.js') < manifest.indexOf('src/scenes/UIScene.js'));

console.log('player status layout test passed');
