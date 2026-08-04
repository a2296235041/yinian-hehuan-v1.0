'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const decor = read('publish/src/ui/CommerceDecor.js');
const inventory = read('publish/src/ui/InventoryGridView.js');
const shop = read('publish/src/ui/ShopGridView.js');
const purchase = read('publish/src/ui/ShopPurchaseController.js');
const inventoryScene = read('publish/src/scenes/InventoryScene.v021.js');
const shopScene = read('publish/src/scenes/ShopScene.js');

assert.ok(decor.includes('addCornerMarks'));
assert.ok(decor.includes('addSeal'));
assert.ok(inventory.includes('for (let index = 0; index < 8; index += 1)'));
assert.ok(inventory.includes('const y = 190 + Math.floor(index / 2) * 104'));
assert.ok(inventory.includes('空置'));
assert.ok(shop.includes('for (let index = 0; index < 4; index += 1)'));
assert.ok(shop.includes('const y = index < 2 ? 245 : 475'));
assert.ok(shop.includes('货架空置'));
assert.ok(purchase.includes("button.setText('选择数量')"));
assert.ok(inventoryScene.includes('Game.InventoryGridView.render(this)'));
assert.ok(shopScene.includes('Game.ShopGridView.render(this, shop.offers)'));

console.log('commerce layout test passed');
