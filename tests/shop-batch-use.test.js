'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/ShopSystem.js'),
  'utf8'
);
let item = {
  id: 'pill',
  name: '聚灵丹',
  type: 'cultivation',
  cultivation_gain: 10
};
let owned = 10;
let cultivation = {
  required: 100,
  progress: 75,
  maxRealm: false,
  canBreakthrough: false
};
let bonus = 0;
const baseStrength = 5;
const removals = [];
const window = {
  Game: { Data: { shops: {} } },
  GameInventory: {
    ready: async () => {},
    getItem: () => item,
    getQuantity: () => owned,
    async remove(id, quantity) {
      removals.push({ id, quantity });
      if (owned < quantity) return { changed: false, reason: 'insufficient' };
      owned -= quantity;
      return { changed: true };
    },
    async add(id, quantity) {
      owned += quantity;
      return { changed: true };
    }
  },
  GameCultivation: {
    ready: async () => {},
    getSnapshot: () => ({ ...cultivation }),
    async addCultivation(gain) {
      const applied = Math.min(gain, cultivation.required - cultivation.progress);
      cultivation.progress += applied;
      return { changed: applied > 0, gain: applied };
    }
  },
  GamePlayerGrowth: {
    ready: async () => {},
    getBonus: () => bonus,
    async addBonus(attribute, gain) {
      const applied = Math.min(gain, 9999 - baseStrength - bonus);
      bonus += applied;
      return { changed: applied > 0, attribute, gain: applied };
    }
  },
  GamePlayerStats: {
    getSnapshot: () => ({ pillGainPercent: 0, strength: baseStrength + bonus })
  }
};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '../publish/src/storage/PersistenceStatus.js'), 'utf8'),
  { window, Date }
);
vm.runInNewContext(source, { window, Promise, Math, Number, Object });

(async () => {
  const cultivationResult = await window.GameShop.useItem('pill', 5);
  assert.equal(cultivationResult.changed, true);
  assert.equal(cultivationResult.usedQuantity, 3);
  assert.equal(cultivationResult.partial, true);
  assert.equal(cultivationResult.result.gain, 25);
  assert.equal(removals[0].quantity, 3);

  item = {
    id: 'manual',
    name: '炼体手札',
    type: 'attribute',
    attribute: 'strength',
    attribute_gain: 3
  };
  owned = 5;
  bonus = 9989;
  const attributeResult = await window.GameShop.useItem('manual', 4);
  assert.equal(attributeResult.usedQuantity, 2);
  assert.equal(attributeResult.result.gain, 5);
  assert.equal(removals[1].quantity, 2);
  assert.match(window.GameShop.effectLabel(item, 3), /\+9$/);

  owned = 2;
  const insufficient = await window.GameShop.useItem('manual', 3);
  assert.equal(insufficient.changed, false);
  assert.equal(insufficient.reason, 'insufficient');
  assert.equal(removals.length, 2);
  console.log('shop batch use test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
