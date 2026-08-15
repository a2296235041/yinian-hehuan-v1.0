'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/PlayerGrowthSystem.js'),
  'utf8'
);
const statsSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/PlayerStatsSystem.js'),
  'utf8'
);
const formulaSource = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/CombatStatFormula.js'),
  'utf8'
);
const events = [];
const window = {
  Game: {
    player: { origin: { attributes: { strength: 52 } } },
    EventBus: { emit: (name, payload) => events.push({ name, payload }) }
  },
  GameCultivation: {
    getSnapshot: () => ({ realmIndex: 0, label: '炼气' })
  },
  GamefyRecipes: {
    createVersionedStorage: () => ({
      load: async () => ({ bonuses: {} }),
      save: async () => ({ remote: true })
    })
  }
};
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '../publish/src/storage/PersistenceStatus.js'), 'utf8'),
  { window, console, Promise, Math, Number, Object }
);
vm.runInNewContext(source, { window, Promise, Math, Number, Object });
vm.runInNewContext(formulaSource, { window, Promise, Math, Number, Object });
vm.runInNewContext(statsSource, { window, Promise, Math, Number, Object });

(async () => {
  await window.GamePlayerGrowth.initialize();
  assert.equal((await window.GamePlayerGrowth.addBonus('strength', 9946)).gain, 9946);
  const capped = await window.GamePlayerGrowth.addBonus('strength', 5);
  assert.equal(capped.gain, 1);
  assert.equal(window.GamePlayerGrowth.getBonus('strength'), 9947);
  assert.equal(window.GamePlayerStats.getSnapshot().strength, 9999);
  const full = await window.GamePlayerGrowth.addBonus('strength', 1);
  assert.equal(full.changed, false);
  assert.equal(full.reason, 'max_attribute');
  assert.equal(events.at(-1).payload.gain, 1);
  console.log('player growth system test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
