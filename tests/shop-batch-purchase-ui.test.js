'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const dialog = read('publish/src/ui/ShopQuantityDialog.js');
const controller = read('publish/src/ui/ShopPurchaseController.js');
const scene = read('publish/src/scenes/ShopScene.js');
const cheat = read('publish/src/ui/CheatPanel.v021.js');

assert.ok(dialog.includes('Math.min(99, 9999 - owned, affordable)'));
assert.ok(dialog.includes('批量购买'));
assert.ok(controller.includes('result.totalPrice'));
assert.ok(controller.includes('剩余灵石'));
assert.ok(!controller.includes('GameNarrative'));
assert.ok(!controller.includes('generateDetailed'));
assert.ok(scene.includes('Game.ShopQuantityDialog.open'));
assert.ok(!scene.includes('GameNarrative.cancel'));
assert.ok(cheat.includes('+9,999,999'));

console.log('shop batch purchase UI test passed');
