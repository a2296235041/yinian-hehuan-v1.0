'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '../publish/src/systems/InventorySystem.js'),
  'utf8'
);
const window = {
  Game: { EventBus: { emit() {} } },
  GamefyRecipes: {
    createVersionedStorage({ fallback, sanitize }) {
      return {
        load: async () => sanitize(fallback),
        save: async (value) => ({ remote: true, value: sanitize(value) })
      };
    }
  }
};

vm.runInNewContext(source, { window, console, Promise, Math, Number, Object, Map });

(async () => {
  await window.GameInventory.initialize([]);
  const added = await window.GameInventory.addSpiritStones(9999999, 'cheat');
  assert.equal(added.changed, true);
  assert.equal(added.balance, 10000099);
  assert.equal(window.GameInventory.exportState().spiritStones, 10000099);

  await window.GameInventory.restore({ quantities: {}, spiritStones: 9999999999 });
  assert.equal(window.GameInventory.getSpiritStones(), 999999999);
  const capped = await window.GameInventory.addSpiritStones(1, 'cheat');
  assert.equal(capped.changed, false);
  assert.equal(capped.reason, 'max_amount');
  console.log('spirit stone cap test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
