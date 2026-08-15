'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

let stored = { day: 1, records: {} };
const window = {
  Game: {
    player: { origin: { talent: { id: '' } } },
    EventBus: { emit() {} }
  },
  GamefyRecipes: {
    createVersionedStorage() {
      return {
        async load() { return stored; },
        async save(value) {
          stored = JSON.parse(JSON.stringify(value));
          return { remote: true, value: stored };
        }
      };
    }
  },
  console
};
const context = { window, console, Math, JSON, Promise };
vm.runInNewContext(source('publish/src/storage/PersistenceStatus.js'), context);
vm.runInNewContext(source('publish/src/systems/AffinityState.js'), context);
vm.runInNewContext(source('publish/src/systems/AffinitySystem.js'), context);

(async () => {
  await window.GameAffinity.initialize([{ id: 'npc-1', initial_affinity: 10 }]);
  assert.equal(window.GameAffinity.getSnapshot('npc-1').affinity, 10);
  const lowered = await window.GameAffinity.adjust('npc-1', -4, 'tournament');
  assert.equal(lowered.delta, -4);
  assert.equal(window.GameAffinity.getSnapshot('npc-1').affinity, 6);
  const raised = await window.GameAffinity.adjust('npc-1', 3, 'tournament');
  assert.equal(raised.delta, 3);
  assert.equal(window.GameAffinity.getSnapshot('npc-1').affinity, 9);
  console.log('affinity adjust test passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
