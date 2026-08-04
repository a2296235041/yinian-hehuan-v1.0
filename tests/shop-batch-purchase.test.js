'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/ShopSystem.js'),
  'utf8'
);
const item = { id: 'pill', name: '聚灵丹', type: 'cultivation', cultivation_gain: 10 };
let owned = 2;
let stones = 1000;
let charged = 0;
const window = {
  Game: {
    Data: { shops: { hall: { name: '灵石商店', offers: [{ itemId: 'pill', price: 12 }] } } }
  },
  GameInventory: {
    ready: async () => {},
    getItem: () => item,
    getQuantity: () => owned,
    getSpiritStones: () => stones,
    async removeSpiritStones(amount) {
      if (stones < amount) return { changed: false, reason: 'insufficient' };
      stones -= amount;
      charged += amount;
      return { changed: true };
    },
    async addSpiritStones(amount) {
      stones += amount;
      return { changed: true };
    },
    async add(id, quantity) {
      owned += quantity;
      return { changed: true, item, quantity: owned };
    }
  }
};

vm.runInNewContext(source, { window, Promise, Math, Number, Object });

(async () => {
  const result = await window.GameShop.purchase('hall', 'pill', 5);
  assert.equal(result.changed, true);
  assert.equal(result.quantity, 5);
  assert.equal(result.totalPrice, 60);
  assert.equal(charged, 60);
  assert.equal(owned, 7);
  assert.equal(stones, 940);

  const invalid = await window.GameShop.purchase('hall', 'pill', 100);
  assert.equal(invalid.reason, 'invalid_quantity');
  assert.equal(charged, 60);

  stones = 10;
  const insufficient = await window.GameShop.purchase('hall', 'pill', 2);
  assert.equal(insufficient.reason, 'insufficient');
  assert.equal(owned, 7);

  stones = 1000;
  owned = 9990;
  const overflow = await window.GameShop.purchase('hall', 'pill', 10);
  assert.equal(overflow.reason, 'inventory_limit');
  assert.equal(owned, 9990);
  console.log('shop batch purchase test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
