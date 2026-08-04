'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const items = JSON.parse(fs.readFileSync(
  path.join(root, 'publish/assets/data/items.json'), 'utf8'
));
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, '.studio/asset-manifest.json'), 'utf8'
));
const iconAssets = fs.readFileSync(
  path.join(root, 'publish/src/assets/ItemIconAssets.js'), 'utf8'
);
const inventoryGrid = fs.readFileSync(
  path.join(root, 'publish/src/ui/InventoryGridView.js'), 'utf8'
);
const preload = fs.readFileSync(
  path.join(root, 'publish/src/assets/GameScenePreload.v064.js'), 'utf8'
);

assert.equal(items.length, 52);
assert.equal(new Set(items.map((item) => item.icon)).size, items.length);
items.forEach((item) => {
  assert.match(item.icon, /^\.\/assets\/items\/item-[a-z0-9-]+\.[a-f0-9]{8}\.webp$/);
  const file = path.join(root, 'publish', item.icon.slice(2));
  assert.ok(fs.existsSync(file), `${item.name} icon should exist`);
  assert.ok(fs.statSync(file).size > 1000, `${item.name} icon should not be empty`);
  assert.ok(fs.readFileSync(file).includes(Buffer.from('ALPH')), `${item.name} should have alpha`);
});

const manifestIcons = manifest.assets.filter((asset) => asset.name.startsWith('item-'));
assert.equal(manifestIcons.length, items.length);
assert.equal(manifestIcons.every((asset) => asset.chromaKey?.verdict === 'PASS'), true);
assert.ok(iconAssets.includes('filecomplete-image-${textureKey}'));
assert.ok(iconAssets.includes("if (!scene.load.isLoading()) scene.load.start()"));
assert.ok(inventoryGrid.includes('Game.ItemIconAssets.create'));
assert.ok(inventoryGrid.includes("material: '材'"));
assert.equal(preload.includes('assets/items/'), false);

console.log('item icons test passed');
