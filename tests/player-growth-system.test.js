'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/PlayerGrowthSystem.js'),
  'utf8'
);
const events = [];
const window = {
  Game: {
    player: {},
    EventBus: { emit: (name, payload) => events.push({ name, payload }) }
  },
  GamefyRecipes: {
    createVersionedStorage: () => ({
      load: async () => ({ bonuses: {} }),
      save: async () => ({ remote: true })
    })
  }
};
vm.runInNewContext(source, { window, Promise, Math, Number, Object });

(async () => {
  await window.GamePlayerGrowth.initialize();
  assert.equal((await window.GamePlayerGrowth.addBonus('strength', 998)).gain, 998);
  const capped = await window.GamePlayerGrowth.addBonus('strength', 5);
  assert.equal(capped.gain, 1);
  assert.equal(window.GamePlayerGrowth.getBonus('strength'), 999);
  const full = await window.GamePlayerGrowth.addBonus('strength', 1);
  assert.equal(full.changed, false);
  assert.equal(full.reason, 'max_attribute');
  assert.equal(events.at(-1).payload.gain, 1);
  console.log('player growth system test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
